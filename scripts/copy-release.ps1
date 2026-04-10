# PowerShell script to copy and rename release APK
# Usage: .\scripts\copy-release.ps1

param(
    [string]$Version = ""
)

# Get version from package.json if not provided
if ([string]::IsNullOrEmpty($Version)) {
    $packageJson = Get-Content -Path "package.json" -Raw | ConvertFrom-Json
    $Version = $packageJson.version
}

# Define paths
$sourcePath = "android/app/build/outputs/apk/release/app-release.apk"
$releasesDir = "releases"
$targetFileName = "pocketflow-v$Version.apk"
$targetPath = Join-Path $releasesDir $targetFileName

# Check if source APK exists
if (-Not (Test-Path $sourcePath)) {
    Write-Host "Error: Release APK not found at $sourcePath" -ForegroundColor Red
    Write-Host "Please build the release APK first using: .\gradlew.bat assembleRelease" -ForegroundColor Yellow
    exit 1
}

# Create releases directory if it doesn't exist
if (-Not (Test-Path $releasesDir)) {
    New-Item -ItemType Directory -Path $releasesDir | Out-Null
    Write-Host "Created releases directory" -ForegroundColor Green
}

# Check if target file already exists
if (Test-Path $targetPath) {
    $response = Read-Host "Version v$Version already exists. Overwrite? (y/n)"
    if ($response -ne 'y' -and $response -ne 'Y') {
        Write-Host "Operation cancelled" -ForegroundColor Yellow
        exit 0
    }
}

# Copy and rename the APK
Copy-Item -Path $sourcePath -Destination $targetPath -Force
Write-Host "[OK] Successfully copied release APK to: $targetPath" -ForegroundColor Green

# Get file size
$fileItem = Get-Item -Path $targetPath -ErrorAction SilentlyContinue
if ($fileItem) {
    $fileSizeBytes = $fileItem.Length
    $fileSizeMB = [Math]::Round($fileSizeBytes / 1MB, 2)
    Write-Host "[OK] File size: $fileSizeMB MB" -ForegroundColor Green
} else {
    Write-Host "[OK] File copied successfully" -ForegroundColor Green
}

# Display next steps
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Test the APK on a device" -ForegroundColor White
Write-Host "2. Update releases/README.md with release notes" -ForegroundColor White
Write-Host "3. Commit and push to GitHub:" -ForegroundColor White
Write-Host "   git add releases/" -ForegroundColor Gray
Write-Host "   git commit -m 'Release v$Version'" -ForegroundColor Gray
Write-Host "   git tag v$Version" -ForegroundColor Gray
Write-Host "   git push origin main --tags" -ForegroundColor Gray
