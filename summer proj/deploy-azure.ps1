# Collavo - one-click Azure App Service deploy (Windows PowerShell)
# Usage:  .\deploy-azure.ps1 -ResourceGroup collavo-rg -AppName collavo-app -Location eastus -MongoUri "mongodb+srv://..." -AdminEmail admin@collavo.app -AdminPassword "change-me" [-StorageAccountName "collavoblobs"]
# Optional -StorageAccountName provisions Azure Blob Storage for uploads (required for scale-out / multi-instance).
# Prereq: Azure CLI installed (winget install Microsoft.AzureCLI) and logged in (az login).

param(
  [Parameter(Mandatory = $true)][string]$ResourceGroup,
  [Parameter(Mandatory = $true)][string]$AppName,
  [Parameter(Mandatory = $false)][string]$Location = "eastus",
  [Parameter(Mandatory = $true)][string]$MongoUri,
  [Parameter(Mandatory = $false)][string]$AdminEmail = "admin@collavo.app",
  [Parameter(Mandatory = $true)][string]$AdminPassword,
  [Parameter(Mandatory = $false)][string]$StorageAccountName
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$adminRoute = "ops-9f3k2"
$siteUrl = "https://$AppName.azurewebsites.net"

function New-RandomSecret {
  $bytes = New-Object byte[] 48
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  -join ($bytes | ForEach-Object { $_.ToString("x2") })
}

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
  throw "Azure CLI not found. Install it with: winget install Microsoft.AzureCLI"
}

Write-Host "==> Building client and admin-client (production)..."
Push-Location "$root\client"
npm ci --silent | Out-Null
npm run build | Out-Null
Pop-Location

Push-Location "$root\admin-client"
npm ci --silent | Out-Null
$env:ADMIN_BASE = "/$adminRoute/"
npm run build | Out-Null
Pop-Location

Write-Host "==> Ensuring resource group and app service plan..."
az group create --name $ResourceGroup --location $Location | Out-Null
az appservice plan create --name "$AppName-plan" --resource-group $ResourceGroup --sku B1 --is-linux | Out-Null
az webapp create --name $AppName --resource-group $ResourceGroup --plan "$AppName-plan" --runtime "NODE:20-lts" | Out-Null

Write-Host "==> Setting app settings..."
az webapp config appsettings set --name $AppName --resource-group $ResourceGroup --settings `
  NODE_ENV=production `
  MONGO_URI="$MongoUri" `
  JWT_ACCESS_SECRET="$(New-RandomSecret)" `
  JWT_REFRESH_SECRET="$(New-RandomSecret)" `
  CLIENT_ORIGIN="$siteUrl" `
  ADMIN_CLIENT_ORIGIN="$siteUrl" `
  ADMIN_ROUTE_PATH="$adminRoute" `
  SEED_DEMO=false | Out-Null

if ($StorageAccountName) {
  Write-Host "==> Provisioning Azure Blob Storage ($StorageAccountName)..."
  az storage account create --name $StorageAccountName --resource-group $ResourceGroup --location $Location --sku Standard_LRS --kind StorageV2 --min-tls-version TLS1_2 | Out-Null
  $blobConn = az storage account show-connection-string --name $StorageAccountName --resource-group $ResourceGroup --query connectionString -o tsv
  if (-not $blobConn) { throw "Could not retrieve storage account connection string" }
  az webapp config appsettings set --name $AppName --resource-group $ResourceGroup --settings AZURE_BLOB_CONNECTION_STRING="$blobConn" | Out-Null
  Write-Host "  Azure Blob Storage configured."
}

az webapp config set --name $AppName --resource-group $ResourceGroup --startup-file "cd server && npm install --omit=dev && node src/server.js" | Out-Null
az webapp config appsettings set --name $AppName --resource-group $ResourceGroup --settings SCM_DO_BUILD_DURING_DEPLOYMENT=false | Out-Null

Write-Host "==> Staging zip (server source + built frontends)..."
$stage = Join-Path $env:TEMP "collavo-deploy-$([Guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $stage | Out-Null
New-Item -ItemType Directory -Path "$stage\server" | Out-Null
Copy-Item "$root\server\*" "$stage\server" -Recurse
New-Item -ItemType Directory -Path "$stage\client" | Out-Null
Copy-Item "$root\client\dist" "$stage\client" -Recurse
New-Item -ItemType Directory -Path "$stage\admin-client" | Out-Null
Copy-Item "$root\admin-client\dist" "$stage\admin-client" -Recurse
$stage\server\node_modules 2>$null | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
$stage\server\.env 2>$null | Remove-Item -Force -ErrorAction SilentlyContinue

# Azure layout: zip root = app root. Server static fallback expects ./client/dist and ./admin-client/dist.
$zip = "$stage\deploy.zip"
Compress-Archive -Path "$stage\server", "$stage\client", "$stage\admin-client" -DestinationPath $zip -Force

Write-Host "==> Deploying zip..."
az webapp deploy --name $AppName --resource-group $ResourceGroup --src-path $zip --type zip | Out-Null

Write-Host "==> Creating admin account on the new database..."
$env:MONGO_URI = $MongoUri
$env:JWT_ACCESS_SECRET = "seed-only"
$env:JWT_REFRESH_SECRET = "seed-only"
Push-Location "$root\server"
node src/seed/createAdmin.js $AdminEmail $AdminPassword | Write-Host
Pop-Location
Remove-Item Env:MONGO_URI -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Done! App: $siteUrl"
Write-Host "Admin panel: $siteUrl/$adminRoute  (login: $AdminEmail)"
Write-Host "Give this link to your friend: $siteUrl"
