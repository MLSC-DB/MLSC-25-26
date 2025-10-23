#!/usr/bin/env node
/**
 * Migration: normalize registration emails to lowercase and remove duplicates.
 * Usage:
 *   node scripts/normalize-emails.js --mongo <MONGODB_URI> [--dry-run]
 *
 * IMPORTANT: Backup your database before running for real.
 */

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const Registration = require("../server/src/models/Registration");
const argv = require("yargs/yargs")(process.argv.slice(2)).argv;

// Flags
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
    // mongodump must be available in PATH
    execFileSync(
      "mongodump",
      ["--uri", mongoUri, "--archive=" + archivePath, "--gzip"],
      {
        stdio: "inherit",
      }
    );
    console.log("Backup created successfully.");
    // optionally upload to S3 if configured
    if (s3Bucket && !noUpload) {
      try {
        console.log(
          `Uploading backup to s3://${s3Bucket}/... (requires aws cli)`
        );
        execFileSync("aws", ["s3", "cp", archivePath, `s3://${s3Bucket}/`], {
          stdio: "inherit",
        });
        console.log("Upload to S3 completed.");
      } catch (err) {
        console.warn(
          "S3 upload failed (aws CLI may be missing or misconfigured):",
          err && err.message ? err.message : err
        );
      }
    }

    // rotation: keep last N
    try {
      const files = fs
        .readdirSync(backupsDir)
        .filter((f) => f.startsWith("mongodump-") && f.endsWith(".archive.gz"))
        .map((f) => ({
          f,
          m: fs.statSync(path.join(backupsDir, f)).mtime.getTime(),
        }));
      files.sort((a, b) => b.m - a.m);
      if (keep > 0 && files.length > keep) {
        const toRemove = files.slice(keep);
        toRemove.forEach((it) => {
          const p = path.join(backupsDir, it.f);
          try {
            fs.unlinkSync(p);
            console.log(`Removed old backup ${p}`);
          } catch (e) {
            /* ignore */
          }
        });
      }
    } catch (err) {
      console.warn(
        "Backup rotation failed:",
        err && err.message ? err.message : err
      );
    }

    return archivePath;
  } catch (err) {
    console.error("mongodump failed:", err && err.message ? err.message : err);
    throw new Error("Backup failed. Aborting migration.");
  }
}

async function main() {
  const mongo = argv.mongo || process.env.MONGODB_URI;
  const dryRun = !!argv["dry-run"] || !!argv.dryRun;

  if (!mongo) {
    console.error(
      "Please provide MongoDB URI via --mongo or MONGODB_URI env var"
    );
    process.exit(2);
  }

  console.log("Connecting to", mongo);
  await mongoose.connect(mongo, {});

  try {
    // fetch all registrations, projecting email and createdAt only
    const cursor = Registration.find({}, { email: 1, createdAt: 1 }).cursor();

    const groups = new Map();

    for await (const doc of cursor) {
      if (!doc.email) continue;
      const norm = doc.email.trim().toLowerCase();
      if (!groups.has(norm)) groups.set(norm, []);
      groups
        .get(norm)
        .push({ id: doc._id.toString(), createdAt: doc.createdAt });
    }

    let total = 0;
    let duplicates = 0;
    const ops = [];

    for (const [email, items] of groups.entries()) {
      total += items.length;
      if (items.length <= 1) continue;
      // sort by createdAt ascending and keep first
      items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const keep = items[0];
      const remove = items.slice(1);
      duplicates += remove.length;

      // For each remove, either delete or in dry-run report
      remove.forEach((r) => {
        ops.push({ keep: keep.id, remove: r.id, email });
      });
    }

    console.log(
      `Found ${groups.size} unique normalized emails, ${total} total entries, ${duplicates} duplicates to remove.`
    );

    if (ops.length === 0) {
      console.log("Nothing to do.");
      return;
    }

    if (dryRun) {
      console.log(
        "Dry run mode. The following duplicate removals would be performed:"
      );
      ops.slice(0, 200).forEach((o) => console.log(o));
      if (ops.length > 200) console.log(`...and ${ops.length - 200} more`);
      return;
    }

    // if applying and the number of deletions is large, require confirmation
    if (!yes && ops.length >= threshold) {
      console.log(
        `About to remove ${ops.length} duplicate documents (threshold is ${threshold}).`
      );
      const ok = await promptConfirm("Do you want to continue? (yes/no)");
      if (!ok) {
        console.log("Aborted by user.");
        return;
      }
    }

    // Before applying destructive changes, create a backup (unless skipped)
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

    // perform deletions in batches
    const batchSize = 100;
    for (let i = 0; i < ops.length; i += batchSize) {
      const batch = ops.slice(i, i + batchSize);
      const idsToRemove = batch.map((b) => mongoose.Types.ObjectId(b.remove));
      const res = await Registration.deleteMany({ _id: { $in: idsToRemove } });
      console.log(`Deleted ${res.deletedCount} duplicate documents`);
    }

    // Ensure all remaining emails are lowercase
    const updateRes = await Registration.updateMany({}, [
      { $set: { email: { $toLower: "$email" } } },
    ]);
    console.log(
      "Normalized email case for remaining documents. MatchedCount:",
      updateRes.matchedCount || updateRes.nModified || "unknown"
    );

    console.log("Migration complete.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
