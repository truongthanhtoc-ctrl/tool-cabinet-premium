[CmdletBinding()]
param(
  [string]$ProjectPath = "",
  [string]$IsolatedPath = "C:\dev\tool-cabinet-premium",
  [switch]$SkipDefender,
  [switch]$StartDev,
  [switch]$ElevatedRelaunch
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ProjectPath)) {
  if (-not [string]::IsNullOrWhiteSpace($PSScriptRoot)) {
    $ProjectPath = $PSScriptRoot
  } else {
    $ProjectPath = (Get-Location).Path
  }
}

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "=== $Message ===" -ForegroundColor Cyan
}

function Test-IsAdmin {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Invoke-SelfElevation {
  if (Test-IsAdmin) { return $false }

  $args = @(
    "-ExecutionPolicy", "Bypass",
    "-File", ('"{0}"' -f $PSCommandPath),
    "-ProjectPath", ('"{0}"' -f $ProjectPath),
    "-IsolatedPath", ('"{0}"' -f $IsolatedPath),
    "-ElevatedRelaunch"
  )

  if ($SkipDefender) { $args += "-SkipDefender" }
  if ($StartDev) { $args += "-StartDev" }

  Start-Process -FilePath "powershell.exe" -Verb RunAs -ArgumentList ($args -join " ")
  Write-Host "Relaunched in Administrator PowerShell. Please continue in the new elevated window." -ForegroundColor Yellow
  return $true
}

function Ensure-DefenderExclusion {
  param([string]$PathToAdd)
  if (-not (Test-Path $PathToAdd)) { return }
  $prefs = Get-MpPreference
  if ($prefs.ExclusionPath -contains $PathToAdd) {
    Write-Host "Already excluded: $PathToAdd"
    return
  }
  Add-MpPreference -ExclusionPath $PathToAdd
  Write-Host "Added Defender exclusion: $PathToAdd"
}

function Ensure-ControlledFolderAccessApp {
  param([string]$AppPath)
  if (-not (Test-Path $AppPath)) { return }
  try {
    Add-MpPreference -ControlledFolderAccessAllowedApplications $AppPath
    Write-Host "Allowed app in Controlled Folder Access: $AppPath"
  } catch {
    Write-Host "Skip CFA allow-app (possibly already allowed): $AppPath"
  }
}

function Invoke-TestCommand {
  param(
    [string]$Label,
    [scriptblock]$Command
  )
  try {
    $output = & $Command 2>&1 | Out-String
    Write-Host "[PASS] $Label" -ForegroundColor Green
    if ($output.Trim()) {
      Write-Host $output.Trim()
    }
    return $true
  } catch {
    Write-Host "[FAIL] $Label -> $($_.Exception.Message)" -ForegroundColor Red
    return $false
  }
}

$desktop = [Environment]::GetFolderPath("Desktop")
$logPath = Join-Path $desktop ("agent-permission-repair-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".log")
Start-Transcript -Path $logPath | Out-Null

try {
  if ((-not $SkipDefender) -and (-not $ElevatedRelaunch)) {
    if (Invoke-SelfElevation) {
      return
    }
  }

  Write-Step "Context"
  Write-Host "User: $(whoami)"
  Write-Host "ProjectPath: $ProjectPath"
  Write-Host "IsolatedPath: $IsolatedPath"
  Write-Host "Admin: $(Test-IsAdmin)"

  Write-Step "Step 1 (manual): hard reset session"
  Write-Host "Close editor/session once before running validation from the agent."
  Write-Host "This script handles Defender + path isolation + local validation."

  if (-not $SkipDefender) {
    Write-Step "Step 2: Defender exclusions"
    if (-not (Get-Command Add-MpPreference -ErrorAction SilentlyContinue)) {
      Write-Host "Defender cmdlets unavailable, skipping Defender configuration."
    } elseif (-not (Test-IsAdmin)) {
      Write-Host "Not running as Administrator. Re-run in Admin PowerShell for Defender configuration."
    } else {
      Ensure-DefenderExclusion -PathToAdd "C:\Users\simon\.gemini"
      Ensure-DefenderExclusion -PathToAdd "C:\Users\simon\.codex"
      Ensure-DefenderExclusion -PathToAdd $ProjectPath

      $candidateApps = @(
        "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe",
        "C:\Windows\System32\cmd.exe",
        "$env:LOCALAPPDATA\Programs\Cursor\Cursor.exe",
        "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe"
      )

      $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
      if ($nodeCmd -and $nodeCmd.Source) {
        $candidateApps += $nodeCmd.Source
      }

      $candidateApps | Select-Object -Unique | ForEach-Object {
        Ensure-ControlledFolderAccessApp -AppPath $_
      }
    }
  } else {
    Write-Step "Step 2: Defender exclusions skipped by flag"
  }

  Write-Step "Step 3: Path isolation"
  if (-not (Test-Path "C:\dev")) {
    New-Item -Path "C:\dev" -ItemType Directory -Force | Out-Null
  }
  if (-not (Test-Path $IsolatedPath)) {
    New-Item -Path $IsolatedPath -ItemType Directory -Force | Out-Null
  }

  & robocopy $ProjectPath $IsolatedPath /E /XD node_modules dist .git .vite /R:1 /W:1 | Out-Null
  if ($LASTEXITCODE -ge 8) {
    throw "robocopy failed with exit code $LASTEXITCODE"
  }
  Write-Host "Project copied to: $IsolatedPath"

  Write-Step "Step 4: Minimal acceptance tests (local)"
  $allPass = $true
  $allPass = (Invoke-TestCommand -Label "whoami" -Command { whoami }) -and $allPass
  $allPass = (Invoke-TestCommand -Label "Get-Location (isolated path)" -Command { Set-Location $IsolatedPath; Get-Location }) -and $allPass
  $allPass = (Invoke-TestCommand -Label "npm -v" -Command { npm -v }) -and $allPass

  Write-Step "Step 4b: Stability check (5 times)"
  for ($i = 1; $i -le 5; $i++) {
    $ok = Invoke-TestCommand -Label "Stability #$i (whoami)" -Command { whoami }
    if (-not $ok) { $allPass = $false }
  }

  if ($StartDev) {
    Write-Step "Step 4c: Start dev server"
    Set-Location $IsolatedPath
    if (-not (Test-Path ".\node_modules")) {
      npm install
    }
    npm run dev -- --host
  } else {
    Write-Host ""
    Write-Host "Dev server not started. Use -StartDev to run npm run dev -- --host."
  }

  Write-Step "Result"
  if ($allPass) {
    Write-Host "Local verification passed. Next, re-open the agent session and run the same checks via agent." -ForegroundColor Green
  } else {
    Write-Host "Local verification has failures. Keep this log and proceed with runtime reinstall/switch." -ForegroundColor Yellow
  }

  Write-Host "Log saved to: $logPath"
} finally {
  Stop-Transcript | Out-Null
}
