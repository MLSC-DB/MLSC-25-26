param(
  [string]$Target = 'C:\opt\mlsc\keys\sheet-key.json',
  [string]$RunAsUser = $env:USERNAME
)

Write-Host "Writing Google service account JSON to: $Target"
$dir = Split-Path $Target -Parent
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

$b64 = $env:GOOGLE_SERVICE_ACCOUNT_JSON_BASE64
$raw = $env:GOOGLE_SERVICE_ACCOUNT_JSON

if ($b64) {
  try {
    [System.IO.File]::WriteAllBytes($Target, [System.Convert]::FromBase64String($b64))
  } catch {
    Write-Error "Failed to decode GOOGLE_SERVICE_ACCOUNT_JSON_BASE64: $_"
    exit 2
  }
} elseif ($raw) {
  try { Set-Content -Path $Target -Value $raw -Encoding UTF8 -Force } catch { Write-Error "Failed to write JSON: $_"; exit 2 }
} else {
  Write-Error "Environment variables GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 or GOOGLE_SERVICE_ACCOUNT_JSON are not set."; exit 2
}

# Restrict permissions: remove inheritance and give full control to the RunAsUser only
try {
  icacls $Target /inheritance:r | Out-Null
  icacls $Target /grant:r "$RunAsUser:(R)" | Out-Null
  icacls $Target /remove "Authenticated Users" "Users" "Everyone" 2>$null | Out-Null
} catch {
  Write-Warning "Failed to fully restrict ACLs (you may need to run as Administrator): $_"
}

# Validate JSON using PowerShell's converter
try {
  $json = Get-Content $Target -Raw | ConvertFrom-Json
  Write-Host "Google service account JSON validated."
} catch {
  Write-Error "Invalid JSON in $Target: $_"; exit 3
}

Write-Host "Done. File written to $Target with restricted ACLs (best-effort)."
