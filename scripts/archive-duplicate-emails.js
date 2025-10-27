#!/usr/bin/env node
/**
 * Migration: standardize emails (lowercase) and move duplicate registrations to an archive collection for manual review.
 *
 * Usage (dry-run, safe):
 *   node scripts/archive-duplicate-emails.js --mongo <MONGODB_URI>
 *
 * To perform changes (apply updates and move duplicates):
 *   node scripts/archive-duplicate-emails.js --mongo <MONGODB_URI> --apply
 *
 * Options:
 *   --mongo   MongoDB connection string (or set MONGODB_URI env var)
 *   --apply   Apply changes (default is dry-run)
 *   --archive-only  Only copy duplicates to archive; do not delete originals
 *   --batch   Batch size for deletions (default 100)
 *
 * IMPORTANT: Backup your DB before running with --apply.
 */

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const Registration = require("../server/src/models/Registration");
const argv = require("yargs/yargs")(process.argv.slice(2)).argv;

const noBackup = !!argv["no-backup"];
const yes = !!argv.yes || !!argv.y;
const keep = parseInt(argv.keep || process.env.BACKUP_KEEP || "10", 10);
const noUpload = !!argv["no-upload"];
const s3Bucket = argv.s3Bucket || process.env.S3_BUCKET;
const threshold = parseInt(
  argv.threshold || process.env.MIGRATION_THRESHOLD || "100",
  10
);
const readline = require("readline");

function promptConfirm(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question + " ", (answer) => {
      rl.close();
      const ok = /^(y|yes)$/i.test(answer.trim());
      resolve(ok);
    });
  });
}

function runBackup(mongoUri) {
  const backupsDir = path.resolve(process.cwd(), "backups");
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const archivePath = path.join(backupsDir, `mongodump-${ts}.archive.gz`);
  console.log(`Creating mongodump backup to ${archivePath} ...`);
  try {
    execFileSync(
      "mongodump",
      ["--uri", mongoUri, "--archive=" + archivePath, "--gzip"],
      {
        stdio: "inherit",
      }
    );
    console.log("Backup created successfully.");
    return archivePath;
  } catch (err) {
    console.error("mongodump failed:", err && err.message ? err.message : err);
    throw new Error("Backup failed. Aborting migration.");
  }
}

async function main() {
  const mongo = argv.mongo || process.env.MONGODB_URI;
  const apply = !!argv.apply;
  const archiveOnly = !!argv["archive-only"];
  const batchSize = parseInt(argv.batch || "100", 10);

  if (!mongo) {
    console.error(
      "Please provide MongoDB URI via --mongo or MONGODB_URI env var"
    );
    process.exit(2);
  }

  console.log("Connecting to", mongo);
  await mongoose.connect(mongo, {});

  try {
    // fetch all registrations (we need full docs to archive)
    const cursor = Registration.find({}).cursor();
    const groups = new Map();
    let total = 0;

    for await (const doc of cursor) {
      total++;
      const email = (doc.email || "").toString().trim();
      if (!email) continue;
      const norm = email.toLowerCase();
      if (!groups.has(norm)) groups.set(norm, []);
      groups.get(norm).push(doc.toObject());
    }

    console.log(
      `Loaded ${total} registrations; ${groups.size} unique normalized emails`
    );

    const duplicatesToArchive = [];
    const updatesToLowercase = [];

    for (const [email, items] of groups.entries()) {
      if (items.length === 0) continue;
      if (items.length === 1) {
        const item = items[0];
        if ((item.email || "") !== email) {
          updatesToLowercase.push({
            id: item._id,
            from: item.email,
            to: email,
          });
        }
        continue;
      }

      // multiple entries: pick earliest createdAt to keep
      items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const keep = items[0];
      // ensure keep's email is lowercased
      if ((keep.email || "") !== email) {
        updatesToLowercase.push({ id: keep._id, from: keep.email, to: email });
      }

      // others -> archive
      for (let i = 1; i < items.length; i++) {
        const dup = items[i];
        duplicatesToArchive.push({
          keepId: keep._id,
          duplicate: dup,
          normalizedEmail: email,
        });
      }
    }

    console.log(
      `Prepared ${updatesToLowercase.length} email lowercase updates and ${duplicatesToArchive.length} duplicates to archive.`
    );

    if (!apply) {
      console.log(
        "Dry-run mode. No changes will be applied. Re-run with --apply to apply changes."
      );
      // show sample
      if (updatesToLowercase.length)
        console.log("Sample update:", updatesToLowercase[0]);
      if (duplicatesToArchive.length)
        console.log("Sample duplicate to archive:", {
          keepId: duplicatesToArchive[0].keepId,
          duplicateId: duplicatesToArchive[0].duplicate._id,
        });
      return;
    }

    // show counts and require confirmation if large
    console.log(
      `Ready to apply changes: ${updatesToLowercase.length} lowercase updates, ${duplicatesToArchive.length} duplicates to archive.`
    );
    if (
      !yes &&
      (duplicatesToArchive.length >= threshold ||
        updatesToLowercase.length >= threshold)
    ) {
      const ok = await promptConfirm(
        `This will modify ${
          duplicatesToArchive.length + updatesToLowercase.length
        } documents. Continue? (yes/no)`
      );
      if (!ok) {
        console.log("Aborted by user.");
        return;
      }
    }

    // create backup before applying unless explicitly skipped
    if (!noBackup) {
      try {
        runBackup(mongo);
      } catch (err) {
        console.error(err.message || err);
        process.exit(3);
      }
    } else {
      console.log("--no-backup provided: skipping automatic mongodump backup.");
    }

    console.log("Applying changes...");

    // 1) Insert archive docs
    const archiveColl = mongoose.connection.db.collection(
      "registrations_archive"
    );
    const archiveDocs = duplicatesToArchive.map((d) => ({
      originalId: d.duplicate._id,
      archivedAt: new Date(),
      reason: "duplicate",
      duplicateOf: d.keepId,
      normalizedEmail: d.normalizedEmail,
      data: d.duplicate,
    }));

    if (archiveDocs.length) {
      const insertResult = await archiveColl.insertMany(archiveDocs, {
        ordered: false,
      });
      console.log(
        `Inserted ${
          insertResult.insertedCount ||
          Object.keys(insertResult.insertedIds || {}).length
        } documents into registrations_archive`
      );
    }

    // 2) Optionally delete duplicates from registrations
    if (!archiveOnly && duplicatesToArchive.length) {
      const ids = duplicatesToArchive.map((d) =>
        mongoose.Types.ObjectId(d.duplicate._id)
      );
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const delRes = await Registration.deleteMany({ _id: { $in: batch } });
        console.log(`Deleted ${delRes.deletedCount} duplicate registrations`);
      }
    } else if (archiveOnly) {
      console.log(
        "Archive-only flag set: duplicates were copied to archive but not deleted from registrations."
      );
    }

    // 3) Apply lowercase updates
    for (let i = 0; i < updatesToLowercase.length; i += batchSize) {
      const batch = updatesToLowercase.slice(i, i + batchSize);
      const ops = batch.map((u) => ({
        updateOne: {
          filter: { _id: mongoose.Types.ObjectId(u.id) },
          update: { $set: { email: u.to } },
        },
      }));
      const res = await Registration.bulkWrite(ops);
      console.log(
        `Applied lowercase updates for batch: matched ${
          res.matchedCount || res.nMatched || "unknown"
        }`
      );
    }

    console.log("Migration applied successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
