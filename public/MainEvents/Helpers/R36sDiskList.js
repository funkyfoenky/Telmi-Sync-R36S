import {spawn} from 'child_process'

/**
 * Liste les disques amovibles flashables R36S (Get-Disk), y compris sans partition / sans lettre.
 * @returns {Promise<Array<{diskNumber:number,name:string,size:number,drive:string}>>}
 */
export function listR36sFlashDisks() {
  if (process.platform !== 'win32') {
    return Promise.resolve([])
  }

  const cmd =
    '$ErrorActionPreference = "SilentlyContinue"; ' +
    '$out = @(); ' +
    'Get-Disk | Where-Object { ' +
    '-not $_.IsBoot -and -not $_.IsSystem -and $_.Number -ne 0 -and ' +
    '$_.Size -ge 3GB -and $_.Size -le 2TB -and ' +
    '($_.OperationalStatus -eq "Online" -or $_.OperationalStatus -eq "Offline") -and ' +
    '($_.BusType -in @("USB","SD","MMC") -or ' +
    '($_.BusType -eq "Unknown" -and $_.FriendlyName -match "MassStorage|Mass Storage|Card Reader|SDHC|SDXC|MMC")) ' +
    '} | ForEach-Object { ' +
    '$letter = $null; ' +
    'Get-Partition -DiskNumber $_.Number -EA SilentlyContinue | Where-Object { $_.DriveLetter } | ' +
    'Select-Object -First 1 | ForEach-Object { $letter = [string]$_.DriveLetter }; ' +
    '$out += [ordered]@{ diskNumber = [int]$_.Number; name = [string]$_.FriendlyName; size = [int64]$_.Size; ' +
    'drive = if ($letter) { $letter + ":\\" } else { "" } }; ' +
    '}; ' +
    'if ($out.Count -eq 0) { "[]" } else { $out | ConvertTo-Json -Compress }'

  return new Promise((resolve) => {
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-Command', cmd],
      {windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']}
    )
    let out = ''
    child.stdout.on('data', (d) => { out += d.toString() })
    child.on('error', () => resolve([]))
    child.on('exit', () => {
      try {
        const parsed = JSON.parse(String(out).trim() || '[]')
        const rows = Array.isArray(parsed) ? parsed : [parsed]
        resolve(
          rows
            .filter((d) => Number.isFinite(d.diskNumber) && d.size > 0)
            .map((d) => ({
              diskNumber: d.diskNumber,
              name: d.name || ('Disk ' + d.diskNumber),
              size: Number(d.size) || 0,
              drive: typeof d.drive === 'string' ? d.drive : ''
            }))
            .sort((a, b) => a.diskNumber - b.diskNumber)
        )
      } catch (e) {
        resolve([])
      }
    })
  })
}
