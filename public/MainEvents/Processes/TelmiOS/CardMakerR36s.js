import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import {spawn} from 'child_process'
import {downloadFile, requestJson} from '../../Helpers/Request.js'
import {getR36sImageReleasesUrl, pickLatestStableRelease} from '../../Helpers/GitHubReleases.js'
import {getExtraResourcesPath, initTmpPath} from '../Helpers/AppPaths.js'
import {unpack} from '../BinFiles/7zipCommands.js'

const PROGRESS_TOTAL = 100

/** Mappe STEP script -> (clé UI, borne basse %, borne haute %) */
const SCRIPT_STEP_BOUNDS = {
  prepare: {key: 'r36s-step-prepare', lo: 18, hi: 28},
  write: {key: 'r36s-step-write', lo: 28, hi: 72},
  gpt: {key: 'r36s-step-gpt', lo: 72, hi: 78},
  expand: {key: 'r36s-step-expand', lo: 78, hi: 90},
  seed: {key: 'r36s-step-seed', lo: 90, hi: 96},
  cleanup: {key: 'r36s-step-cleanup', lo: 96, hi: 99},
  done: {key: 'r36s-step-done', lo: 100, hi: 100}
}

const getBundledFlashScript = () => {
  const bundled = path.join(getExtraResourcesPath(), 'r36s', 'flash-telmi-sd-win.ps1')
  if (fs.existsSync(bundled)) {
    return bundled
  }
  // Dev / fallback : chemins locaux connus
  const home = os.homedir()
  const candidates = [
    path.join(home, 'Downloads', 'Tools', 'HelloWorld_R36S', 'Telmi-R36', 'scripts', 'flash-telmi-sd-win.ps1'),
    'C:\\Users\\Utilisateur\\Downloads\\Tools\\HelloWorld_R36S\\Telmi-R36\\scripts\\flash-telmi-sd-win.ps1',
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c
    }
  }
  return null
}

const getImagesDir = (imageProfile) => {
  const profile = imageProfile === 'other' ? 'other' : 'v20'
  const dir = path.join(initTmpPath('r36s-images'), profile)
  fs.mkdirSync(dir, {recursive: true})
  return dir
}

const normalizeImageProfile = (imageProfile) => (imageProfile === 'other' ? 'other' : 'v20')

/** Deduit le code d'erreur UI a partir du log PowerShell (TELMI_ERROR ou message ERREUR). */
const inferFlashErrorFromLog = (logFile) => {
  try {
    if (!logFile || !fs.existsSync(logFile)) {
      return 'r36s-flash-failed'
    }
    const content = fs.readFileSync(logFile, 'utf8')
    const telmiErr = content.match(/TELMI_ERROR:(r36s-[\w-]+)/)
    if (telmiErr) {
      return telmiErr[1]
    }
    if (/ACCESS_DENIED|Explorateur|volume remonte/i.test(content)) {
      return 'r36s-flash-access-denied'
    }
    if (/Pas de GPT|GPT primaire|GPT secondaire/i.test(content)) {
      return 'r36s-flash-gpt-failed'
    }
    if (/WriteFile echoue/i.test(content)) {
      return 'r36s-flash-write-failed'
    }
  } catch (e) {}
  return 'r36s-flash-failed'
}

const unpackAsync = (zipPath, destPath) => new Promise((resolve, reject) => {
  unpack(zipPath, destPath, (error) => {
    if (error) {
      reject(error)
      return
    }
    resolve()
  })
})

const findImgAsset = (assets, imageProfile) => {
  if (!Array.isArray(assets)) {
    return null
  }
  if (imageProfile === 'other') {
    return assets.find((a) => /soysauce-.*\.img\.gz$/i.test(a.name)) ||
      assets.find((a) => /\.img\.gz$/i.test(a.name)) ||
      assets.find((a) => /\.img\.zip$/i.test(a.name)) ||
      assets.find((a) => /\.img$/i.test(a.name) && !/\.(zip|gz)$/i.test(a.name)) ||
      null
  }
  return assets.find((a) => /\.img\.zip$/i.test(a.name)) ||
    assets.find((a) => /telmi-r36.*\.img/i.test(a.name) && /\.zip$/i.test(a.name)) ||
    null
}

const findExtractedImgPath = (imagesDir) => {
  if (!fs.existsSync(imagesDir)) {
    return null
  }
  const found = fs.readdirSync(imagesDir).find((f) => /\.img$/i.test(f))
  return found ? path.join(imagesDir, found) : null
}

const emitProgress = (key, current, total = PROGRESS_TOTAL) => {
  process.stdout.write('*' + key + '*' + current + '*' + total + '*')
}

const psSingleQuote = (s) => "'" + String(s).replace(/'/g, "''") + "'"

/**
 * Télécharge l'image .img depuis la dernière release stable GitHub (repo V20 ou Main).
 * @returns {Promise<string|null>} chemin absolu du .img
 */
const ensureLatestImageFromGitHub = async (imageProfile) => {
  const profile = normalizeImageProfile(imageProfile)
  emitProgress('r36s-step-download-check', 5)

  let releases
  try {
    releases = await requestJson(getR36sImageReleasesUrl(profile), {})
  } catch (e) {
    process.stderr.write('r36s-image-download-error')
    return null
  }

  const release = pickLatestStableRelease(releases)
  if (!release) {
    process.stderr.write('r36s-image-download-error')
    return null
  }

  const asset = findImgAsset(release.assets, profile)
  if (!asset || !asset.browser_download_url) {
    process.stderr.write('r36s-image-download-error')
    return null
  }

  const imagesDir = getImagesDir(profile)
  const existingImg = findExtractedImgPath(imagesDir)
  if (existingImg && fs.statSync(existingImg).size > 0) {
    return existingImg
  }

  try {
    for (const f of fs.readdirSync(imagesDir)) {
      if (/\.img$/i.test(f)) {
        fs.unlinkSync(path.join(imagesDir, f))
      }
    }
  } catch (e) {}

  const archivePath = path.join(initTmpPath('download'), 'telmi-r36-' + profile + '-' + asset.name)
  try {
    if (fs.existsSync(archivePath)) {
      fs.unlinkSync(archivePath)
    }
  } catch (e) {}

  try {
    await downloadFile(
      asset.browser_download_url,
      archivePath,
      (current, total) => {
        process.stdout.write('*downloading-files*' + current + '*' + total + '*')
      }
    )
  } catch (e) {
    process.stderr.write('r36s-image-download-error')
    return null
  }

  emitProgress('r36s-step-extract-image', 12)
  try {
    if (/\.img$/i.test(asset.name) && !/\.(zip|gz)$/i.test(asset.name)) {
      fs.copyFileSync(archivePath, path.join(imagesDir, asset.name))
    } else {
      await unpackAsync(archivePath, imagesDir)
    }
  } catch (e) {
    process.stderr.write('r36s-image-extract-error')
    return null
  }

  const imgPath = findExtractedImgPath(imagesDir)
  if (!imgPath) {
    process.stderr.write('r36s-image-extract-error')
    return null
  }
  return imgPath
}

/**
 * Résout le numéro de disque Windows à partir d'une lettre de lecteur (ex. E).
 */
const resolveDiskNumberFromLetter = (letter) => new Promise((resolve) => {
  const cmd =
    '$ErrorActionPreference="Stop"; ' +
    '$p = Get-Partition -DriveLetter ' + psSingleQuote(letter) + ' -EA Stop | Select-Object -First 1; ' +
    'Write-Output ([string]$p.DiskNumber)'

  const child = spawn(
    'powershell.exe',
    ['-NoProfile', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-Command', cmd],
    {windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']}
  )
  let out = ''
  child.stdout.on('data', (d) => { out += d.toString() })
  child.stderr.on('data', () => {})
  child.on('error', () => resolve(null))
  child.on('exit', () => {
    const n = parseInt(String(out).trim(), 10)
    resolve(Number.isFinite(n) ? n : null)
  })
})

/**
 * Flash GPT R36S via flash-telmi-sd-win.ps1 (Windows natif, sans WSL).
 * Image = dernière release stable GitHub (pre-releases ignorées). Script = extraResources/r36s.
 * @param {string} drive ex. "E:\\" ou "E:" (optionnel si diskNumberParam)
 * @param {string} [sdLayout] 'mono' (from-image) | 'multi' (os-only)
 * @param {string} [imageProfile] 'v20' | 'other'
 * @param {string|number} [diskNumberParam] numéro PhysicalDrive Windows (prioritaire)
 */
async function main(drive, sdLayout = 'mono', imageProfile = 'v20', diskNumberParam = '') {
  if (process.platform !== 'win32') {
    process.stderr.write('r36s-flash-windows-only')
    return
  }

  const layout = sdLayout === 'multi' ? 'multi' : 'mono'
  const profile = normalizeImageProfile(imageProfile)
  const flashMode = layout === 'multi' ? 'os-only' : 'from-image'

  const letter = (drive || '').replace(/[^A-Za-z]/g, '').substring(0, 1).toUpperCase()
  let diskNumber = parseInt(String(diskNumberParam || '').trim(), 10)
  if (!Number.isFinite(diskNumber) && letter) {
    diskNumber = await resolveDiskNumberFromLetter(letter)
  }
  if (!Number.isFinite(diskNumber) || diskNumber < 0) {
    process.stderr.write('r36s-disk-not-found')
    return
  }

  const script = getBundledFlashScript()
  if (!script) {
    process.stderr.write('r36s-flash-script-missing')
    return
  }

  const imgPath = await ensureLatestImageFromGitHub(profile)
  if (!imgPath) {
    return
  }

  emitProgress('r36s-step-prepare', 18)

  const stamp = Date.now()
  const exitFile = path.join(os.tmpdir(), 'telmi-r36-exit-' + stamp + '.txt')
  const logFile = path.join(os.tmpdir(), 'telmi-r36-flash-' + stamp + '.log')
  const progressFile = path.join(os.tmpdir(), 'telmi-r36-progress-' + stamp + '.txt')

  const emitFlashLog = (line) => {
    const s = String(line || '').replace(/\r?\n/g, ' ').trim()
    if (s) {
      process.stdout.write('\n[r36s-flash] ' + s + '\n')
    }
  }

  const applyScriptProgress = (stepName, pct) => {
    const bounds = SCRIPT_STEP_BOUNDS[stepName]
    if (!bounds) {
      return
    }
    // os-only : pas d'expand/seed — étendre write/gpt
    if (layout === 'multi' && (stepName === 'expand' || stepName === 'seed')) {
      return
    }
    let overall = bounds.lo
    if (stepName === 'write' && Number.isFinite(pct) && pct >= 0) {
      const hi = layout === 'multi' ? 88 : bounds.hi
      overall = bounds.lo + Math.round((Math.min(100, pct) / 100) * (hi - bounds.lo))
    } else if (stepName === 'gpt' && layout === 'multi') {
      overall = 90
    } else if (stepName === 'done') {
      overall = 100
    }
    emitProgress(bounds.key, overall)
  }

  emitFlashLog('script=' + script)
  emitFlashLog('layout=' + layout + ' flashMode=' + flashMode + ' imageProfile=' + profile)
  emitFlashLog('letter=' + letter + ' diskNumber=' + diskNumber)
  emitFlashLog('image=' + imgPath)
  emitFlashLog('logFile=' + logFile)
  emitFlashLog('progressFile=' + progressFile)

  const elevateScript =
    '$ErrorActionPreference = "Stop"; ' +
    '$p = Start-Process -FilePath "powershell.exe" -Verb RunAs -Wait -PassThru ' +
    '-WindowStyle Hidden -ArgumentList @(' +
    [
      '-NoProfile',
      '-WindowStyle', 'Hidden',
      '-ExecutionPolicy', 'Bypass',
      '-File', script,
      '-DiskNumber', String(diskNumber),
      '-Mode', flashMode,
      '-ImagePath', imgPath,
      '-ImageProfile', profile,
      '-Yes',
      '-LogFile', logFile,
      '-ProgressFile', progressFile
    ].map(psSingleQuote).join(',') +
    '); ' +
    'if ($null -eq $p) { Set-Content -Path ' + psSingleQuote(exitFile) + ' -Value "1" -Encoding ASCII } ' +
    'else { Set-Content -Path ' + psSingleQuote(exitFile) + ' -Value ([string]$p.ExitCode) -Encoding ASCII }'

  let logOffset = 0
  let logCarry = ''
  let lastProgressRaw = ''
  const relayLogFile = () => {
    try {
      if (!fs.existsSync(logFile)) {
        return
      }
      const size = fs.statSync(logFile).size
      if (size <= logOffset) {
        return
      }
      const fd = fs.openSync(logFile, 'r')
      const len = size - logOffset
      const buf = Buffer.alloc(len)
      fs.readSync(fd, buf, 0, len, logOffset)
      fs.closeSync(fd)
      logOffset = size
      logCarry += buf.toString('utf8')
      const parts = logCarry.split(/\r?\n/)
      logCarry = parts.pop() || ''
      for (const line of parts) {
        const t = line.trim()
        if (!t || /^[\*]{2,}/.test(t) || /^Windows PowerShell/.test(t) || /^Copyright /.test(t) ||
          /^Le transcript a /.test(t) || /^Transcript (started|stopped)/i.test(t)) {
          continue
        }
        emitFlashLog(t)
      }
    } catch (e) {}
  }

  const relayProgressFile = () => {
    try {
      if (!fs.existsSync(progressFile)) {
        return
      }
      const raw = fs.readFileSync(progressFile, 'utf8').trim()
      if (!raw || raw === lastProgressRaw) {
        return
      }
      lastProgressRaw = raw
      const stepMatch = raw.match(/STEP=([a-z]+)/i)
      const pctMatch = raw.match(/PCT=(\d+)/i)
      if (!stepMatch) {
        return
      }
      const stepName = stepMatch[1].toLowerCase()
      const pct = pctMatch ? parseInt(pctMatch[1], 10) : -1
      applyScriptProgress(stepName, pct)
      emitFlashLog('progress STEP=' + stepName + (pct >= 0 ? (' PCT=' + pct) : ''))
    } catch (e) {}
  }

  const poll = setInterval(() => {
    relayLogFile()
    relayProgressFile()
  }, 500)

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

  child.stdout.on('data', (d) => {
    String(d.toString()).split(/\r?\n/).forEach((l) => {
      if (l.trim()) {
        emitFlashLog('elevate-out: ' + l.trim())
      }
    })
  })
  child.stderr.on('data', (d) => {
    String(d.toString()).split(/\r?\n/).forEach((l) => {
      if (l.trim()) {
        emitFlashLog('elevate-err: ' + l.trim())
      }
    })
  })

  const finish = (ok) => {
    clearInterval(poll)
    relayLogFile()
    relayProgressFile()
    emitFlashLog('exit ok=' + ok + ' (log conservé: ' + logFile + ')')
    try { fs.unlinkSync(exitFile) } catch (e) {}
    try { fs.unlinkSync(progressFile) } catch (e) {}
    if (ok) {
      emitProgress('r36s-step-done', PROGRESS_TOTAL)
      process.stdout.write('success')
    } else {
      process.stderr.write(inferFlashErrorFromLog(logFile))
    }
  }

  child.on('error', (e) => {
    emitFlashLog('spawn-error: ' + ((e && e.message) || e))
    finish(false)
  })
  child.on('exit', () => {
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
      emitFlashLog('elevated-exit-code=' + code)
      finish(code === 0)
    }, 300)
  })
}

const getBundledPrepareContentScript = () => {
  const bundled = path.join(getExtraResourcesPath(), 'r36s', 'prepare-content-sd.ps1')
  return fs.existsSync(bundled) ? bundled : null
}

/**
 * Prépare une SD contenu (slot gauche) via prepare-content-sd.ps1.
 * @param {string} drive
 */
async function prepareContent(drive) {
  if (process.platform !== 'win32') {
    process.stderr.write('r36s-flash-windows-only')
    return
  }
  const letter = (drive || '').replace(/[^A-Za-z]/g, '').substring(0, 1).toUpperCase()
  if (!letter) {
    process.stderr.write('device-not-found')
    return
  }
  const script = getBundledPrepareContentScript()
  if (!script) {
    process.stderr.write('r36s-content-script-missing')
    return
  }

  emitProgress('r36s-step-content-prepare', 10)
  const diskNumber = await resolveDiskNumberFromLetter(letter)
  if (diskNumber === null || diskNumber < 0) {
    process.stderr.write('r36s-disk-not-found')
    return
  }

  const stamp = Date.now()
  const exitFile = path.join(os.tmpdir(), 'telmi-r36-content-exit-' + stamp + '.txt')
  const logFile = path.join(os.tmpdir(), 'telmi-r36-content-' + stamp + '.log')
  const progressFile = path.join(os.tmpdir(), 'telmi-r36-content-progress-' + stamp + '.txt')

  const emitFlashLog = (line) => {
    const s = String(line || '').replace(/\r?\n/g, ' ').trim()
    if (s) {
      process.stdout.write('\n[r36s-flash] ' + s + '\n')
    }
  }

  const contentBounds = {
    prepare: {key: 'r36s-step-content-prepare', lo: 10, hi: 25},
    format: {key: 'r36s-step-content-format', lo: 25, hi: 70},
    seed: {key: 'r36s-step-content-seed', lo: 70, hi: 95},
    done: {key: 'r36s-step-done', lo: 100, hi: 100}
  }

  emitFlashLog('prepare-content script=' + script + ' disk=' + diskNumber)

  const elevateScript =
    '$ErrorActionPreference = "Stop"; ' +
    '$p = Start-Process -FilePath "powershell.exe" -Verb RunAs -Wait -PassThru ' +
    '-WindowStyle Hidden -ArgumentList @(' +
    [
      '-NoProfile',
      '-WindowStyle', 'Hidden',
      '-ExecutionPolicy', 'Bypass',
      '-File', script,
      '-DiskNumber', String(diskNumber),
      '-Yes',
      '-LogFile', logFile,
      '-ProgressFile', progressFile
    ].map(psSingleQuote).join(',') +
    '); ' +
    'if ($null -eq $p) { Set-Content -Path ' + psSingleQuote(exitFile) + ' -Value "1" -Encoding ASCII } ' +
    'else { Set-Content -Path ' + psSingleQuote(exitFile) + ' -Value ([string]$p.ExitCode) -Encoding ASCII }'

  let logOffset = 0
  let logCarry = ''
  let lastProgressRaw = ''
  const relayLogFile = () => {
    try {
      if (!fs.existsSync(logFile)) {
        return
      }
      const size = fs.statSync(logFile).size
      if (size <= logOffset) {
        return
      }
      const fd = fs.openSync(logFile, 'r')
      const len = size - logOffset
      const buf = Buffer.alloc(len)
      fs.readSync(fd, buf, 0, len, logOffset)
      fs.closeSync(fd)
      logOffset = size
      logCarry += buf.toString('utf8')
      const parts = logCarry.split(/\r?\n/)
      logCarry = parts.pop() || ''
      for (const line of parts) {
        const t = line.trim()
        if (!t || /^[\*]{2,}/.test(t) || /^Windows PowerShell/.test(t) || /^Copyright /.test(t) ||
          /^Le transcript a /.test(t) || /^Transcript (started|stopped)/i.test(t)) {
          continue
        }
        emitFlashLog(t)
      }
    } catch (e) {}
  }

  const relayProgressFile = () => {
    try {
      if (!fs.existsSync(progressFile)) {
        return
      }
      const raw = fs.readFileSync(progressFile, 'utf8').trim()
      if (!raw || raw === lastProgressRaw) {
        return
      }
      lastProgressRaw = raw
      const stepMatch = raw.match(/STEP=([a-z]+)/i)
      if (!stepMatch) {
        return
      }
      const stepName = stepMatch[1].toLowerCase()
      const bounds = contentBounds[stepName]
      if (bounds) {
        emitProgress(bounds.key, bounds.lo)
      }
    } catch (e) {}
  }

  const poll = setInterval(() => {
    relayLogFile()
    relayProgressFile()
  }, 500)

  const child = spawn(
    'powershell.exe',
    ['-NoProfile', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-Command', elevateScript],
    {windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']}
  )

  child.stdout.on('data', (d) => {
    String(d.toString()).split(/\r?\n/).forEach((l) => {
      if (l.trim()) {
        emitFlashLog('elevate-out: ' + l.trim())
      }
    })
  })
  child.stderr.on('data', (d) => {
    String(d.toString()).split(/\r?\n/).forEach((l) => {
      if (l.trim()) {
        emitFlashLog('elevate-err: ' + l.trim())
      }
    })
  })

  const finish = (ok) => {
    clearInterval(poll)
    relayLogFile()
    relayProgressFile()
    try { fs.unlinkSync(exitFile) } catch (e) {}
    try { fs.unlinkSync(progressFile) } catch (e) {}
    if (ok) {
      emitProgress('r36s-step-done', PROGRESS_TOTAL)
      process.stdout.write('success')
    } else {
      process.stderr.write('r36s-content-prepare-failed')
    }
  }

  child.on('error', () => finish(false))
  child.on('exit', () => {
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

export {main, prepareContent, getBundledFlashScript, getBundledPrepareContentScript}
