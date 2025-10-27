Database migration guide — Registrations email normalization

This file documents the migration scripts included in this repo and safe steps to run them.

Summary

- `scripts/normalize-emails.js` — groups registrations by lowercased email and (optionally) deletes duplicates while normalizing emails. Supports `--dry-run` to preview operations.
- `scripts/archive-duplicate-emails.js` — standardizes emails to lowercase, moves duplicates (keeping the earliest) into `registrations_archive` for manual review. Runs in dry-run by default; use `--apply` to perform changes.

Safety first (must-do before altering production DB)

1. Backup your production database.

   - If using a managed DB, create a snapshot via your provider.
   - If using a self-hosted MongoDB, use `mongodump`:

     mongodump --uri "<YOUR*MONGODB_URI>" --out ./backups/$(date +%Y%m%d*%H%M%S)-dump

2. Run dry-run to preview changes

   - Normalize (dry-run):

     node scripts/normalize-emails.js --mongo "<YOUR_MONGODB_URI>" --dry-run

   - Archive duplicates (dry-run):

     node scripts/archive-duplicate-emails.js --mongo "<YOUR_MONGODB_URI>"

3. Review the dry-run output carefully. If it looks correct, re-run with apply:

   - Normalize (apply deletions):

     node scripts/normalize-emails.js --mongo "<YOUR_MONGODB_URI>"

   - Archive duplicates (apply):

     node scripts/archive-duplicate-emails.js --mongo "<YOUR_MONGODB_URI>" --apply

Options and behavior

- `--dry-run` (normalize script): preview actions, no writes.
- `--apply` (archive script): actually apply changes (insert archive docs and delete duplicates); `--archive-only` will copy duplicates to the archive but not delete them.
- `--batch <n>` controls batch size for deletions/updates.

Automatic pre-apply backups

- Both migration scripts now perform an automatic `mongodump` to `./backups/` before applying destructive changes (when run with `--apply` or when running the normalize script without `--dry-run`). This provides a timestamped archive you can restore if anything goes wrong.
- The scripts will abort if the backup fails (for example, if `mongodump` is not installed or cannot connect to the DB). You can skip the automatic backup with the `--no-backup` flag, but this is not recommended for production.
- Example backup filename produced by the scripts:

  backups/mongodump-2025-10-22T12-34-56-789Z.archive.gz

Use `mongorestore --archive=./backups/<file> --gzip --uri "<YOUR_MONGODB_URI>"` to restore a created archive.

How the archive script works

- For each normalized email (lowercased), keeps the earliest `createdAt` document and archives the rest into `registrations_archive` with metadata:
  - `originalId`, `archivedAt`, `duplicateOf`, `normalizedEmail`, and `data` (full original document).
- Optionally deletes archived duplicates from the `registrations` collection unless `--archive-only` is used.
- Lowercases the kept document's `email` field to the normalized form.

Post-migration checks

- Verify `registrations_archive` contains expected entries.
- Spot-check a handful of kept docs to ensure emails and data look correct.
- Verify your application can still read registrations and that indexes are still present.

Rollback plan

- If you took a backup (recommended), you can restore using `mongorestore` or your cloud provider's restore mechanism.
- If you only copied duplicates to `registrations_archive`, you can re-insert from archive manually.

Need help?
If you'd like, I can:

- Add an automated `mongodump` step to the scripts before they apply changes.
- Run the migration (with your confirmation) against a provided URI.
- Generate a small report of archived duplicates after the migration.
