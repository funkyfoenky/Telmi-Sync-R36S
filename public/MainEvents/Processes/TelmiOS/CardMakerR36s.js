import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import {spawn} from 'child_process'
import {getTelmiSyncParams} from '../Helpers/TelmiSyncParams.js'

const PROGRESS_TOTAL = 8

const isFlashScript = (dir) =>
  fs.existsSync(path.join(dir, 'scripts', 'flash-telmi-sd.ps1'))

const findTelmiR36Path = () => {
  const params = getTelmiSyncParams()
  if (params.telmiR36Path && isFlashScript(params.telmiR36Path)) {
    return params.telmiR36Path
  }
  if (process.env.TELMI_R36 && isFlashScript(process.env.TELMI_R36)) {
    return process.env.TELMI_R36
  }
  const home = os.homedir()
  const candidates = [
    path.join(home, 'Downloads', 'Tools', 'HelloWorld_R36S', 'Telmi-R36'),
    path.join(home, 'Downloads', 'HelloWorld_R36S', 'Telmi-R36'),
    'C:\\Users\\Utilisateur\\Downloads\\Tools\\HelloWorld_R36S\\Telmi-R36',
  ]
  for (const c of candidates) {
    if (c && isFlashScript(c)) {
      return c
    }
  }
  return null
}

const hasLatestImage = (telmiR36) => {
  const output = path.join(telmiR36, 'output')
  if (!fs.existsSync(output)) {
    return false
  }
  const versionPath = path.join(telmiR36, 'VERSION')
  if (fs.existsSync(versionPath)) {
    const version = fs.readFileSync(versionPath, 'utf8').trim()
    if (fs.existsSync(path.join(output, 'telmi-r36-v20-' + version + '.img'))) {
      return true
    }
  }
  const latest = path.join(output, 'LATEST.txt')
  if (fs.existsSync(latest)) {
    const name = fs.readFileSync(latest, 'utf8').trim()
    if (name && fs.existsSync(path.join(output, name))) {
      return true
    }
  }
  return fs.readdirSync(output).some((f) => /^telmi-r36-v20-.*\.img$/i.test(f))
}

const emitProgress = (key, current, total = PROGRESS_TOTAL) => {
  process.stdout.write('*' + key + '*' + current + '*' + total + '*')
}

const readProgressFile = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return null
    }
    const line = fs.readFileSync(filePath, 'utf8').trim().split(/\r?\n/).pop()
    if (!line || line.indexOf('|') < 0) {
      return null
    }
    const parts = line.split('|')
    const current = parseInt(parts[0], 10)
    const total = parseInt(parts[1], 10)
    const key = parts[2]
    if (!Number.isFinite(current) || !Number.isFinite(total) || !key) {
      return null
    }
    return {current, total, key}
  } catch (e) {
    return null
  }
}

const psSingleQuote = (s) => "'" + String(s).replace(/'/g, "''") + "'"

/**
 * Flash GPT R36S via flash-telmi-sd.ps1 (UAC), progression via fichier.
 * @param {string} drive ex. "E:\\" ou "E:"
 */
function main(drive) {
  if (process.platform !== 'win32') {
    process.stderr.write('r36s-flash-windows-only')
    return
  }

  const letter = (drive || '').replace(/[^A-Za-z]/g, '').substring(0, 1).toUpperCase()
  if (!letter) {
    process.stderr.write('device-not-found')
    return
  }

  const telmiR36 = findTelmiR36Path()
  if (!telmiR36) {
    process.stderr.write('r36s-path-not-found')
    return
  }
  if (!hasLatestImage(telmiR36)) {
    process.stderr.write('r36s-image-missing')
    return
  }

  const script = path.join(telmiR36, 'scripts', 'flash-telmi-sd.ps1')
  const stamp = Date.now()
  const progressFile = path.join(os.tmpdir(), 'telmi-r36-progress-' + stamp + '.txt')
  const exitFile = path.join(os.tmpdir(), 'telmi-r36-exit-' + stamp + '.txt')

  try {
    fs.writeFileSync(progressFile, '1|' + PROGRESS_TOTAL + '|r36s-step-prepare', 'utf8')
  } catch (e) {}

  emitProgress('r36s-step-prepare', 1)

  // Elevation UAC : Start-Process -Verb RunAs -Wait -WindowStyle Hidden
  // (wrapper + process élevé sans console visible)
  const elevateScript =
    '$ErrorActionPreference = "Stop"; ' +
    '$p = Start-Process -FilePath "powershell.exe" -Verb RunAs -Wait -PassThru ' +
    '-WindowStyle Hidden -ArgumentList @(' +
    [
      '-NoProfile',
      '-WindowStyle', 'Hidden',
      '-ExecutionPolicy', 'Bypass',
      '-File', script,
      '-DriveLetter', letter,
      '-Mode', 'from-image',
      '-Yes',
      '-ProgressFile', progressFile
    ].map(psSingleQuote).join(',') +
    '); ' +
    'if ($null -eq $p) { Set-Content -Path ' + psSingleQuote(exitFile) + ' -Value "1" -Encoding ASCII } ' +
    'else { Set-Content -Path ' + psSingleQuote(exitFile) + ' -Value ([string]$p.ExitCode) -Encoding ASCII }'

  let lastEmitted = ''
  const poll = setInterval(() => {
    const p = readProgressFile(progressFile)
    if (!p) {
      return
    }
    const sig = p.key + '|' + p.current + '|' + p.total
    if (sig === lastEmitted) {
      return
    }
    lastEmitted = sig
    emitProgress(p.key, p.current, p.total)
  }, 400)

  const child = spawn(
    'powershell.exe',
    [
      '-NoProfile',
      '-WindowStyle', 'Hidden',
      '-ExecutionPolicy', 'Bypass',
      '-Command', elevateScript
    ],
    {windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']}
  )

  // Ignorer stdout/stderr du wrapper (pas d'erreur UI)
  child.stdout.on('data', () => {})
  child.stderr.on('data', () => {})

  const finish = (ok) => {
    clearInterval(poll)
    try { fs.unlinkSync(progressFile) } catch (e) {}
    try { fs.unlinkSync(exitFile) } catch (e) {}
    if (ok) {
      emitProgress('r36s-step-done', PROGRESS_TOTAL)
      process.stdout.write('success')
    } else {
      process.stderr.write('r36s-flash-failed')
    }
  }

  child.on('error', () => finish(false))
  child.on('exit', () => {
    // Lire le code de sortie du process élevé
    setTimeout(() => {
      let code = 1
      try {
        if (fs.existsSync(exitFile)) {
          code = parseInt(fs.readFileSync(exitFile, 'utf8').trim(), 10)
        }
      } catch (e) {}
      if (!Number.isFinite(code)) {
        code = 1
      }
      finish(code === 0)
    }, 300)
  })
}

export {main, findTelmiR36Path}
