#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=... ./scripts/write-google-creds.sh /opt/mlsc/keys/sheet-key.json optional_user
# If GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 is not set, the script will try GOOGLE_SERVICE_ACCOUNT_JSON.

TARGET=${1:-/opt/mlsc/keys/sheet-key.json}
RUN_AS_USER=${2:-${RUN_AS_USER:-$(id -un)}}

echo "Writing Google service account JSON to: $TARGET"
mkdir -p "$(dirname "$TARGET")"

if [ -n "${GOOGLE_SERVICE_ACCOUNT_JSON_BASE64:-}" ]; then
  printf '%s' "$GOOGLE_SERVICE_ACCOUNT_JSON_BASE64" | base64 --decode > "$TARGET"
elif [ -n "${GOOGLE_SERVICE_ACCOUNT_JSON:-}" ]; then
  printf '%s' "$GOOGLE_SERVICE_ACCOUNT_JSON" > "$TARGET"
else
  echo "Error: GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 or GOOGLE_SERVICE_ACCOUNT_JSON is not set." >&2
  exit 2
fi

# Restrict file permissions
chmod 600 "$TARGET" || true

# Try to set ownership to the provided user (may require sudo)
if id "$RUN_AS_USER" >/dev/null 2>&1; then
  chown "$RUN_AS_USER":"$(id -gn "$RUN_AS_USER")" "$TARGET" 2>/dev/null || true
fi

# Validate JSON if node is available
if command -v node >/dev/null 2>&1; then
  node -e "const fs=require('fs'); try{JSON.parse(fs.readFileSync('$TARGET','utf8')); console.log('Google service account JSON validated.');}catch(e){console.error('Invalid JSON:', e.message); process.exit(3);}"
else
  echo "Warning: node not found; skipping JSON validation."
fi

echo "Done. File written to $TARGET with mode 600."
