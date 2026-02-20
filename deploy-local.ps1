param(
  [switch]$UseWebP
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

Write-Host "[1/4] Installing dependencies..."
npm install

Write-Host "[2/4] Building project..."
npm run build

$distDir = Join-Path $projectRoot "dist"
if (-not (Test-Path $distDir)) {
  throw "Build failed: dist folder not found."
}

if ($UseWebP) {
  Write-Host "[3/4] Converting JPG/PNG images in dist to WebP..."
  $images = Get-ChildItem -Path $distDir -Recurse -File | Where-Object {
    $_.Extension -in ".jpg", ".jpeg", ".png"
  }

  if ($images.Count -gt 0) {
    $webpOptions = '{"quality":78}'
    & npx --yes @squoosh/cli --webp $webpOptions -d $distDir @($images.FullName)

    $textFiles = Get-ChildItem -Path $distDir -Recurse -File | Where-Object {
      $_.Extension -in ".html", ".css", ".js", ".json", ".xml", ".txt"
    }

    foreach ($img in $images) {
      $oldName = $img.Name
      $newName = ([System.IO.Path]::GetFileNameWithoutExtension($img.Name) + ".webp")

      foreach ($txt in $textFiles) {
        $raw = Get-Content -Path $txt.FullName -Raw
        $updated = $raw -replace [Regex]::Escape($oldName), $newName
        if ($updated -ne $raw) {
          Set-Content -Path $txt.FullName -Value $updated -NoNewline -Encoding UTF8
        }
      }
    }
  } else {
    Write-Host "No JPG/PNG files found in dist."
  }
} else {
  Write-Host "[3/4] Skipping WebP conversion (run with -UseWebP to enable)."
}

$desktop = [Environment]::GetFolderPath("Desktop")
$zipPath = Join-Path $desktop "swtoolstorage-dist.zip"

Write-Host "[4/4] Creating deployment zip on Desktop..."
if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

Compress-Archive -Path (Join-Path $distDir "*") -DestinationPath $zipPath -Force

Write-Host "Done: $zipPath"
