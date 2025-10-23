# Scripts Directory

This directory contains utility scripts for the MLSC registration app.

## Google Service Account Credential Helpers

Two helper scripts are provided to securely write Google service account JSON credentials from environment variables to disk with restricted permissions:

### `write-google-creds.sh` (Bash/Linux)

Writes Google service account JSON to a secure file on Unix-like systems.

**Usage:**
```bash
# Set the service account JSON as base64 (recommended)
export GOOGLE_SERVICE_ACCOUNT_JSON_BASE64="$(base64 -w0 /path/to/service-account.json)"

# Or set raw JSON (alternative)
export GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'

# Write to secure file
./scripts/write-google-creds.sh /opt/mlsc/keys/sheet-key.json deployer

# Set environment variable to use the file
export GOOGLE_SERVICE_ACCOUNT_FILE=/opt/mlsc/keys/sheet-key.json
```

**Features:**
- Creates target directory if it doesn't exist
- Sets file permissions to 600 (owner read/write only)
- Attempts to set ownership to specified user
- Validates JSON format using Node.js if available

### `write-google-creds.ps1` (PowerShell/Windows)

Writes Google service account JSON to a secure file on Windows systems.

**Usage:**
```powershell
# Set the service account JSON as base64 (recommended)
$json = Get-Content 'C:\path\to\service-account.json' -Raw
$env:GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($json))

# Or set raw JSON (alternative)
$env:GOOGLE_SERVICE_ACCOUNT_JSON = Get-Content 'C:\path\to\service-account.json' -Raw

# Write to secure file (may require Administrator for full ACL restriction)
.\scripts\write-google-creds.ps1 -Target 'C:\opt\mlsc\keys\sheet-key.json' -RunAsUser $env:USERNAME

# Set environment variable to use the file
$env:GOOGLE_SERVICE_ACCOUNT_FILE = 'C:\opt\mlsc\keys\sheet-key.json'
```

**Features:**
- Creates target directory if it doesn't exist
- Removes file inheritance and restricts access to specified user
- Validates JSON format using PowerShell's ConvertFrom-Json

## Other Scripts

### `test-email.js`
CLI tool to test email sending functionality.

**Usage:**
```bash
npm run test:email
# or
node scripts/test-email.js --to recipient@example.com
```

### Migration Scripts

- `normalize-emails.js` - Normalizes email addresses and removes duplicates
- `archive-duplicate-emails.js` - Archives duplicate registrations safely
- `restore-latest-backup.js` - Restores from the most recent backup

All migration scripts support `--dry-run` for safe testing and create automatic backups before applying changes.

**Important:** Always backup your database before running migration scripts with `--apply`.

## Security Notes

- Never commit service account JSON files or environment variables containing credentials
- Use base64 encoding for service account JSON in environment variables to avoid shell escaping issues
- Always run credential helpers with restricted permissions
- Rotate service account keys regularly and revoke old keys immediately after rotation