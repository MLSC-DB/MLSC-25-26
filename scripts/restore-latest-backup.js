#!/usr/bin/env node
/**
 * Restore the most recent backup created by the migration scripts to a target DB.
 * Usage:
 *   node scripts/restore-latest-backup.js --target "mongodb://127.0.0.1:27017/mlscRegistrationDB_test"
 *
 * This script requires `mongorestore` in PATH and will exit if no backups are found.
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const argv = require("yargs/yargs")(process.argv.slice(2)).argv;

const backupsDir = path.resolve(process.cwd(), "backups");
const target =
  argv.target ||
  process.env.RESTORE_TARGET ||
  "mongodb://127.0.0.1:27017/mlscRegistrationDB_test";

if (!fs.existsSync(backupsDir)) {
  console.error("No backups directory found at", backupsDir);
  process.exit(2);
}

const files = fs
  .readdirSync(backupsDir)
  .filter((f) => f.startsWith("mongodump-") && f.endsWith(".archive.gz"));
if (!files.length) {
  console.error("No backup files found in", backupsDir);
  process.exit(2);
}

files.sort().reverse();
const latest = files[0];
const archivePath = path.join(backupsDir, latest);

console.log(`Restoring ${archivePath} to ${target} ...`);
try {
  execFileSync(
    "mongorestore",
    ["--archive=" + archivePath, "--gzip", "--uri", target],
    { stdio: "inherit" }
  );
  console.log("Restore completed.");
} catch (err) {
  console.error("mongorestore failed:", err && err.message ? err.message : err);
  process.exit(3);
}
