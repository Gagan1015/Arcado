# Pulls every piece of production configuration out of the live AWS stack
# (Secrets Manager values, ECS task-definition env vars, RDS endpoint) and
# writes a populated .env.prod file you can copy to the EC2 box.
#
# Run from repo root:
#   .\deploy\ec2\export-prod-env.ps1 -Region ap-south-1 -OutFile .env.prod
#
# Requires: AWS CLI v2 configured with permissions for
#   secretsmanager:GetSecretValue, ecs:DescribeTaskDefinition,
#   ecs:DescribeServices, rds:DescribeDBInstances.

[CmdletBinding()]
param(
  [string] $Region       = "ap-south-1",
  [string] $Cluster      = "arcado",
  [string] $ClientSvc    = "arcado-client",
  [string] $ServerSvc    = "arcado-server",
  [string] $RdsId        = "arcado-db",
  [string] $OutFile      = ".env.prod"
)

$ErrorActionPreference = "Stop"
function Info($m)  { Write-Host "[info] $m"  -ForegroundColor Cyan }
function Warn($m)  { Write-Host "[warn] $m"  -ForegroundColor Yellow }
function Fail($m)  { Write-Host "[fail] $m"  -ForegroundColor Red; exit 1 }

# ─── helpers ────────────────────────────────────────────────────────────────
function Get-SecretValue([string] $name) {
  try {
    (aws secretsmanager get-secret-value `
       --secret-id $name --region $Region `
       --query SecretString --output text) 2>$null
  } catch { $null }
}

function Get-ActiveTaskDefArn([string] $service) {
  aws ecs describe-services --cluster $Cluster --services $service `
    --region $Region --query "services[0].taskDefinition" --output text
}

function Get-TaskEnv([string] $taskDefArn) {
  # Returns a hashtable of plain (non-secret) env vars from the first container.
  $json = aws ecs describe-task-definition --task-definition $taskDefArn `
           --region $Region --query "taskDefinition.containerDefinitions[0].environment" `
           --output json
  $map = @{}
  foreach ($kv in ($json | ConvertFrom-Json)) { $map[$kv.name] = $kv.value }
  return $map
}

function Get-TaskSecretsMap([string] $taskDefArn) {
  # Returns env-name → secret-ARN mapping from the first container.
  $json = aws ecs describe-task-definition --task-definition $taskDefArn `
           --region $Region --query "taskDefinition.containerDefinitions[0].secrets" `
           --output json
  $map = @{}
  foreach ($kv in ($json | ConvertFrom-Json)) { $map[$kv.name] = $kv.valueFrom }
  return $map
}

# ─── collect ────────────────────────────────────────────────────────────────
Info "Region: $Region"
Info "Cluster: $Cluster  services: $ClientSvc, $ServerSvc"

Info "Resolving active task definitions..."
$clientTd = Get-ActiveTaskDefArn $ClientSvc
$serverTd = Get-ActiveTaskDefArn $ServerSvc
if (-not $clientTd -or $clientTd -eq "None") { Fail "Could not resolve client task def" }
if (-not $serverTd -or $serverTd -eq "None") { Fail "Could not resolve server task def" }
Info "  client: $clientTd"
Info "  server: $serverTd"

$clientPlain   = Get-TaskEnv $clientTd
$serverPlain   = Get-TaskEnv $serverTd
$clientSecrets = Get-TaskSecretsMap $clientTd
$serverSecrets = Get-TaskSecretsMap $serverTd

# Merge all known env-name → secret-ARN references (both services).
$secretRefs = @{}
foreach ($k in $clientSecrets.Keys) { $secretRefs[$k] = $clientSecrets[$k] }
foreach ($k in $serverSecrets.Keys) { if (-not $secretRefs.ContainsKey($k)) { $secretRefs[$k] = $serverSecrets[$k] } }

Info "Fetching secret values..."
$secretValues = @{}
foreach ($envName in $secretRefs.Keys) {
  $arn = $secretRefs[$envName]
  # arn:aws:secretsmanager:region:acct:secret:NAME-xxxxx[:json-key:stage]
  # We want the first 7 segments, joined by ':'. If a JSON key is present
  # (segment 8 non-empty), fetch the whole string and parse out the key.
  $parts = $arn.Split(":")
  $baseArn = ($parts[0..6] -join ":")
  $jsonKey = if ($parts.Length -ge 8) { $parts[7] } else { "" }

  $raw = Get-SecretValue $baseArn
  if (-not $raw) { Warn "  $envName → could not fetch"; continue }

  $val = $raw
  if ($jsonKey) {
    try { $val = ($raw | ConvertFrom-Json).$jsonKey } catch { Warn "  $envName → JSON key $jsonKey not parseable" }
  }
  $secretValues[$envName] = $val
  Info "  $envName ← $(Split-Path -Leaf $baseArn)"
}

Info "Fetching RDS endpoint for sanity check..."
$rdsHost = aws rds describe-db-instances --db-instance-identifier $RdsId --region $Region `
             --query "DBInstances[0].Endpoint.Address" --output text 2>$null
if ($rdsHost -and $rdsHost -ne "None") { Info "  RDS endpoint: $rdsHost" }
else { Warn "  Could not resolve RDS endpoint (fine if DB lives elsewhere)" }

# ─── build .env.prod ────────────────────────────────────────────────────────
function Val($map, $key, $default = "") {
  if ($map.ContainsKey($key)) { return $map[$key] } else { return $default }
}

$env = [ordered]@{
  DATABASE_URL          = Val $secretValues "DATABASE_URL"
  NEXT_PUBLIC_API_URL   = Val $clientPlain  "NEXT_PUBLIC_API_URL" "https://api.arcado.gagankumar.me"
  NEXT_PUBLIC_WS_URL    = Val $clientPlain  "NEXT_PUBLIC_WS_URL"  "wss://api.arcado.gagankumar.me"
  NEXTAUTH_URL          = Val $clientPlain  "NEXTAUTH_URL"        "https://arcado.gagankumar.me"
  CLIENT_URL            = Val $serverPlain  "CLIENT_URL"          "https://arcado.gagankumar.me"
  NEXTAUTH_SECRET       = Val $secretValues "NEXTAUTH_SECRET"
  JWT_SECRET            = Val $secretValues "JWT_SECRET" (Val $secretValues "NEXTAUTH_SECRET")
  GOOGLE_CLIENT_ID      = Val $secretValues "GOOGLE_CLIENT_ID"
  GOOGLE_CLIENT_SECRET  = Val $secretValues "GOOGLE_CLIENT_SECRET"
  GITHUB_CLIENT_ID      = Val $secretValues "GITHUB_CLIENT_ID"
  GITHUB_CLIENT_SECRET  = Val $secretValues "GITHUB_CLIENT_SECRET"
  ADMIN_EMAILS          = Val $clientPlain  "ADMIN_EMAILS" (Val $serverPlain "ADMIN_EMAILS")
}

$lines = @(
  "# Exported from AWS on $(Get-Date -Format 's')"
  "# Source: region=$Region cluster=$Cluster services=$ClientSvc,$ServerSvc"
  "# KEEP THIS FILE OUT OF GIT."
  ""
)
foreach ($k in $env.Keys) {
  $v = $env[$k]
  if ($null -eq $v) { $v = "" }
  $lines += "$k=$v"
}

$lines | Out-File -FilePath $OutFile -Encoding utf8NoBOM -Force 2>$null
if (-not (Test-Path $OutFile)) {
  # utf8NoBOM is PS 6+; fall back for Windows PowerShell 5.
  [System.IO.File]::WriteAllLines(
    (Resolve-Path -LiteralPath (Split-Path $OutFile -Parent) | ForEach-Object Path) + "\" + (Split-Path $OutFile -Leaf),
    $lines,
    (New-Object System.Text.UTF8Encoding $false))
}
Info "Wrote $OutFile"

# ─── sanity report ──────────────────────────────────────────────────────────
$missing = @()
foreach ($k in $env.Keys) { if ([string]::IsNullOrWhiteSpace($env[$k])) { $missing += $k } }
if ($missing.Count -gt 0) {
  Warn "Empty values (fill manually): $($missing -join ', ')"
} else {
  Info "All expected keys populated."
}
