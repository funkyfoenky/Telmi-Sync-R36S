# Prepare carte CONTENU Telmi (slot gauche R36S) - FAT32 label TELMI pour Telmi Sync.
#
# Usage :
#   powershell -File prepare-content-sd.ps1
#   powershell -File prepare-content-sd.ps1 -DiskNumber 2 -Yes
#
param(
    [int]$DiskNumber = -1,
    [switch]$Yes,
    [string]$LogFile = '',
    [string]$ProgressFile = ''
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TelmiR36 = if (Test-Path (Join-Path $ScriptDir 'content')) { $ScriptDir } else { Split-Path -Parent $ScriptDir }
$ContentDir = $null
foreach ($cand in @((Join-Path $ScriptDir 'content'), (Join-Path $TelmiR36 'content'))) {
    if (Test-Path -LiteralPath $cand) { $ContentDir = $cand; break }
}
if (-not $ContentDir) { $ContentDir = Join-Path $ScriptDir 'content' }
. (Join-Path $ScriptDir 'telmi-sd-common.ps1')

$script:TelmiTranscript = $false
if ($LogFile) {
    $logDir = Split-Path -Parent $LogFile
    if ($logDir -and -not (Test-Path -LiteralPath $logDir)) {
        New-Item -ItemType Directory -Force -Path $logDir | Out-Null
    }
    Start-Transcript -Path $LogFile -Force | Out-Null
    $script:TelmiTranscript = $true
}
function Stop-TelmiTranscript {
    if ($script:TelmiTranscript) {
        try { Stop-Transcript | Out-Null } catch {}
        $script:TelmiTranscript = $false
    }
}
function Write-TelmiProgress([string]$Step, [int]$Percent = -1) {
    if (-not $ProgressFile) { return }
    try {
        $dir = Split-Path -Parent $ProgressFile
        if ($dir -and -not (Test-Path -LiteralPath $dir)) {
            New-Item -ItemType Directory -Force -Path $dir | Out-Null
        }
        $line = if ($Percent -ge 0) { "STEP=$Step;PCT=$Percent" } else { "STEP=$Step" }
        Set-Content -LiteralPath $ProgressFile -Value $line -Encoding ASCII -Force
    } catch {}
}

try {
Write-Host ''
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ' TelmiOS - Prepare carte CONTENU (slot gauche)' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ' Cette carte est pour Stories/Music/Saves + Telmi Sync.'
Write-Host ' L OS reste sur la SD du slot DROIT (flash -Mode os-only).'
Write-Host ''

$disks = @(Get-RemovableDisks)
if ($DiskNumber -lt 0 -and $disks.Count -eq 0) {
    Write-Host 'Aucun disque amovible.' -ForegroundColor Red
    exit 1
}

if ($DiskNumber -ge 0) {
    $disk = Get-Disk -Number $DiskNumber -EA Stop
} else {
    Write-Host ' Disques amovibles :'
    $map = @{}; $i = 1
    foreach ($d in $disks) {
        Write-Host ("  [{0}] PhysicalDrive{1}  {2}  {3}" -f $i, $d.Number, (Format-SizeGB $d.Size), $d.FriendlyName)
        $map[$i] = $d; $i++
    }
    Write-Host ''
    $sel = (Read-Host 'Numero (ou Q)').Trim()
    if ($sel -eq 'Q' -or $sel -eq 'q') { exit 0 }
    $n = 0
    if (-not [int]::TryParse($sel, [ref]$n) -or -not $map.ContainsKey($n)) { throw 'Choix invalide' }
    $disk = $map[$n]
}

$diskNum = [int]$disk.Number
Write-Host (" Cible : PhysicalDrive{0} ({1})" -f $diskNum, (Format-SizeGB $disk.Size)) -ForegroundColor Yellow
Write-Host ' ATTENTION : toutes les partitions seront effacees.' -ForegroundColor Red

if (-not $Yes) {
    $c = Read-Host 'Tapez PREPARE pour confirmer'
    if ($c -ne 'PREPARE') { Write-Host 'Annule.'; exit 0 }
}

if ($disk.IsBoot -or $disk.IsSystem) { throw 'Refus : disque systeme/boot Windows' }
if ($disk.Number -eq 0 -and -not $Yes) { throw 'Refus : PhysicalDrive0' }

Write-TelmiProgress 'prepare'
Set-TelmiAutomount -enable $false
try {
    Write-TelmiProgress 'format'
    $vol = Initialize-TelmiContentDisk -diskNum $diskNum
    $driveRoot = '{0}:\' -f $vol.DriveLetter
    Write-TelmiProgress 'seed'
    Seed-TelmiContentTree -DriveRoot $driveRoot -ContentDir $ContentDir -TelmiR36 $TelmiR36 -ContentOnlyStub
    try { Set-Volume -DriveLetter $vol.DriveLetter -NewFileSystemLabel 'TELMI' -EA SilentlyContinue } catch {}
    Write-TelmiProgress 'done' 100
    Write-Host ''
    Write-Host (" Carte contenu prete sur {0} (label TELMI)" -f $driveRoot) -ForegroundColor Green
    Write-Host ' Inserez-la dans le slot GAUCHE de la R36S.' -ForegroundColor Green
} finally {
    Set-TelmiAutomount -enable $true
}
} catch {
    Write-Host ("ERREUR: {0}" -f $_.Exception.Message) -ForegroundColor Red
    throw
} finally {
    Stop-TelmiTranscript
}
