import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import {spawn} from 'child_process'
import * as drivelist from 'drivelist'
import {getExtraResourcesPath} from './AppPaths.js'
import {detectR36sImageProfile, hasR36sConsolePacks} from './InfFiles.js'

const normalizeDriveRoot = (drive) => {
  const s = String(drive || '').trim()
  if (!s) {
    return ''
  }
  const letter = s.replace(/[^A-Za-z]/g, '').substring(0, 1).toUpperCase()
  return letter ? (letter + ':\\') : ''
}

const sameMount = (mountPath, letterRoot) => {
  const a = String(mountPath || '').replace(/[\\/]+$/, '').toUpperCase()
  const b = String(letterRoot || '').replace(/[\\/]+$/, '').toUpperCase()
  return a === b || a.startsWith(b)
}

const withSep = (root) => {
  const s = String(root || '')
  if (!s) {
    return s
  }
  return (/[\\/]$/.test(s)) ? s : (s + path.sep)
}

const isLikelyBootRoot = (root) => {
  if (!root || !fs.existsSync(root)) {
    return false
  }
  return fs.existsSync(path.join(root, 'revs.json')) ||
    fs.existsSync(path.join(root, 'consoles')) ||
    fs.existsSync(path.join(root, 'rf3536k3ka.dtb')) ||
    fs.existsSync(path.join(root, 'TELMI-VERSION.txt')) ||
    fs.existsSync(path.join(root, 'uInitrd')) ||
    fs.existsSync(path.join(root, 'Image')) ||
    fs.existsSync(path.join(root, 'boot.ini'))
}

const getBundledBootSeedPath = () => path.join(getExtraResourcesPath(), 'r36s', 'boot')

const getBundledDtbScript = () => {
  const bundled = path.join(getExtraResourcesPath(), 'r36s', 'dtb-selector', 'Select-SoysauceDTB.ps1')
  return fs.existsSync(bundled) ? bundled : null
}

/**
 * Copie revs.json + dtb/*.dtb depuis extraResources si absents sur BOOT (legacy).
 */
const ensureBootRevCatalog = (bootRoot) => {
  const bundled = getBundledBootSeedPath()
  const bundledRevs = path.join(bundled, 'revs.json')
  if (!fs.existsSync(bundledRevs)) {
    return false
  }

  const dstRevs = path.join(bootRoot, 'revs.json')
  if (!fs.existsSync(dstRevs)) {
    fs.copyFileSync(bundledRevs, dstRevs)
  }

  const srcDtbDir = path.join(bundled, 'dtb')
  const dstDtbDir = path.join(bootRoot, 'dtb')
  if (fs.existsSync(srcDtbDir)) {
    fs.mkdirSync(dstDtbDir, {recursive: true})
    for (const name of fs.readdirSync(srcDtbDir)) {
      if (!/\.dtb$/i.test(name)) {
        continue
      }
      const dst = path.join(dstDtbDir, name)
      if (!fs.existsSync(dst)) {
        fs.copyFileSync(path.join(srcDtbDir, name), dst)
      }
    }
  }
  return fs.existsSync(dstRevs)
}

async function findBootRoot(telmiDrive) {
  const telmiRoot = normalizeDriveRoot(telmiDrive)
  if (!telmiRoot) {
    return null
  }

  const disks = await drivelist.list()
  const disk = disks.find((d) =>
    (d.mountpoints || []).some((m) => sameMount(m.path, telmiRoot))
  )

  const candidates = []
  const pushUnique = (p) => {
    if (!p) {
      return
    }
    if (!candidates.some((c) => sameMount(c, p))) {
      candidates.push(p)
    }
  }

  if (disk) {
    for (const mp of disk.mountpoints || []) {
      pushUnique(mp.path)
    }
  }
  for (const d of disks) {
    if (!d.isRemovable) {
      continue
    }
    for (const mp of d.mountpoints || []) {
      pushUnique(mp.path)
    }
  }

  for (const root of candidates) {
    if (hasR36sConsolePacks(root) || fs.existsSync(path.join(root, 'revs.json'))) {
      return withSep(root)
    }
  }
  for (const root of candidates) {
    if (isLikelyBootRoot(root)) {
      return withSep(root)
    }
  }
  return null
}

const readCurrentRev = (bootRoot) => {
  const p = path.join(bootRoot, 'TELMI-REV.txt')
  if (!fs.existsSync(p)) {
    return null
  }
  return fs.readFileSync(p, 'utf8').trim() || null
}

const readCurrentConsolePack = (bootRoot) => {
  const selectPath = path.join(bootRoot, 'TELMI-DTB-SELECT.txt')
  if (fs.existsSync(selectPath)) {
    const raw = fs.readFileSync(selectPath, 'utf8')
    const match = raw.match(/^pack=(.+)$/m)
    if (match) {
      return match[1].trim()
    }
  }
  const consolePath = path.join(bootRoot, '.console')
  if (fs.existsSync(consolePath)) {
    const name = fs.readFileSync(consolePath, 'utf8').trim()
    if (name) {
      return name
    }
  }
  return null
}

const listConsolePacks = (bootRoot) => {
  const consolesDir = path.join(bootRoot, 'consoles')
  if (!fs.existsSync(consolesDir)) {
    return []
  }
  return fs.readdirSync(consolesDir, {withFileTypes: true})
    .filter((entry) => entry.isDirectory() && !/^(logo|System Volume Information|dtbo)$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({id: name, label: name}))
}

const getLegacyRevCatalog = (bootRoot) => {
  const revsPath = path.join(bootRoot, 'revs.json')
  if (!fs.existsSync(revsPath)) {
    try {
      ensureBootRevCatalog(bootRoot)
    } catch (e) {
      return {error: 'r36s-revs-missing'}
    }
  }
  if (!fs.existsSync(revsPath)) {
    return {error: 'r36s-revs-missing'}
  }

  let catalog
  try {
    catalog = JSON.parse(fs.readFileSync(revsPath, 'utf8'))
  } catch (e) {
    return {error: 'r36s-revs-invalid'}
  }
  if (!catalog || !Array.isArray(catalog.revs) || catalog.revs.length === 0) {
    return {error: 'r36s-revs-invalid'}
  }

  try {
    ensureBootRevCatalog(bootRoot)
  } catch (e) {}

  return {
    bootRoot,
    imageProfile: 'legacy',
    catalogType: 'legacy-rev',
    current: readCurrentRev(bootRoot),
    default: catalog.default || null,
    active_dtb: catalog.active_dtb || 'rf3536k3ka.dtb',
    revs: catalog.revs
  }
}

const getConsoleCatalog = (bootRoot) => {
  const packs = listConsolePacks(bootRoot)
  if (!packs.length) {
    return {error: 'r36s-dtb-missing'}
  }
  return {
    bootRoot,
    imageProfile: 'other',
    catalogType: 'consoles',
    current: readCurrentConsolePack(bootRoot),
    default: null,
    revs: packs
  }
}

/**
 * @returns {Promise<object>}
 */
async function getTelmiRevCatalog(telmiDrive) {
  const bootRoot = await findBootRoot(telmiDrive)
  if (!bootRoot) {
    return {error: 'r36s-boot-not-found'}
  }

  const imageProfile = detectR36sImageProfile(bootRoot)
  if (imageProfile === 'other' || hasR36sConsolePacks(bootRoot)) {
    return getConsoleCatalog(bootRoot)
  }

  if (fs.existsSync(path.join(bootRoot, 'revs.json'))) {
    return getLegacyRevCatalog(bootRoot)
  }

  if (imageProfile === 'v20') {
    return {error: 'r36s-dtb-not-applicable'}
  }

  return {error: 'r36s-revs-missing'}
}

function applyTelmiRevLegacy(bootRoot, revId) {
  if (!bootRoot || !revId) {
    return {ok: false, error: 'r36s-rev-invalid'}
  }
  try {
    ensureBootRevCatalog(bootRoot)
  } catch (e) {}

  const revsPath = path.join(bootRoot, 'revs.json')
  if (!fs.existsSync(revsPath)) {
    return {ok: false, error: 'r36s-revs-missing'}
  }
  let catalog
  try {
    catalog = JSON.parse(fs.readFileSync(revsPath, 'utf8'))
  } catch (e) {
    return {ok: false, error: 'r36s-revs-invalid'}
  }
  const rev = (catalog.revs || []).find((r) => String(r.id) === String(revId))
  if (!rev) {
    return {ok: false, error: 'r36s-rev-invalid'}
  }
  const dtbRel = String(rev.dtb || '').replace(/\//g, path.sep)
  const dtbSrc = path.join(bootRoot, dtbRel)
  if (!fs.existsSync(dtbSrc)) {
    return {ok: false, error: 'r36s-dtb-missing'}
  }
  const activeName = catalog.active_dtb ? String(catalog.active_dtb) : 'rf3536k3ka.dtb'
  const activeDst = path.join(bootRoot, activeName)
  try {
    fs.copyFileSync(dtbSrc, activeDst)
    fs.writeFileSync(path.join(bootRoot, 'TELMI-REV.txt'), String(rev.id), 'ascii')
    fs.writeFileSync(path.join(bootRoot, 'TELMI-PROFILE.txt'), String(rev.id), 'ascii')
    const audio = rev.audio_path ? String(rev.audio_path) : 'SPK'
    fs.writeFileSync(path.join(bootRoot, 'TELMI-AUDIO-PATH.txt'), audio, 'ascii')
  } catch (e) {
    return {ok: false, error: 'r36s-rev-apply-failed'}
  }
  return {ok: true, rev: {id: rev.id, label: rev.label, audio_path: rev.audio_path || 'SPK'}}
}

const TELMI_BOOTARGS =
  'root=/dev/mmcblk0p2 rootwait rw fsck.mode=skip net.ifnames=0 fbcon=map:9 vt.global_cursor_default=0 ' +
  'console=/dev/ttyFIQ0 quiet loglevel=3 nosplash plymouth.enable=0 consoleblank=0 systemd.show_status=false ' +
  'max_cpufreq=1296 boot_cpufreq=1248 max_gpufreq=520 max_ddrfreq=666'

const DTB_ALIASES = [
  'rk3326-odroidgo3-linux.dtb',
  'rk3326-odroidgo2-linux.dtb',
  'rk3326-odroidgo2-linux-v11.dtb',
  'rk-kernel.dtb'
]

const getBundledBootIniTemplate = () => {
  const p = path.join(getExtraResourcesPath(), 'r36s', 'dtb-selector', 'boot.ini.template')
  return fs.existsSync(p) ? p : null
}

/**
 * Applique un pack consoles/ en Node (sans UAC) — plus fiable que Start-Process -Verb RunAs.
 */
function applyConsolePackNode(bootRoot, packName) {
  const root = withSep(bootRoot)
  const packDir = path.join(root, 'consoles', packName)
  if (!fs.existsSync(packDir)) {
    return {ok: false, error: 'r36s-dtb-missing'}
  }

  let dtbName = null
  const packIni = path.join(packDir, 'boot.ini')
  if (fs.existsSync(packIni)) {
    const m = fs.readFileSync(packIni, 'utf8').match(/load mmc 1:1 \$\{dtb_loadaddr\} (\S+\.dtb)/)
    if (m) {
      dtbName = m[1]
    }
  }
  if (!dtbName) {
    const dtbFile = fs.readdirSync(packDir).find((n) => /\.dtb$/i.test(n) && !/uboot/i.test(n))
    if (dtbFile) {
      dtbName = dtbFile
    }
  }
  if (!dtbName) {
    return {ok: false, error: 'r36s-dtb-missing'}
  }

  const copied = []
  try {
    for (const name of fs.readdirSync(packDir)) {
      if (!/\.dtb$/i.test(name)) {
        continue
      }
      fs.copyFileSync(path.join(packDir, name), path.join(root, name))
      copied.push(name)
    }

    const srcDtb = fs.existsSync(path.join(packDir, dtbName))
      ? path.join(packDir, dtbName)
      : path.join(root, dtbName)
    if (fs.existsSync(srcDtb)) {
      for (const alias of DTB_ALIASES) {
        fs.copyFileSync(srcDtb, path.join(root, alias))
      }
    }

    let template
    const tplPath = getBundledBootIniTemplate()
    if (tplPath) {
      template = fs.readFileSync(tplPath, 'utf8')
    } else {
      template =
        'odroidgoa-uboot-config\n\nsetenv bootargs "@@BOOTARGS@@"\n\n' +
        'setenv loadaddr "0x02000000"\nsetenv dtb_loadaddr "0x01f00000"\n\n' +
        'load mmc 1:1 ${loadaddr} Image\nload mmc 1:1 ${dtb_loadaddr} @@DTB@@\n\n' +
        'booti ${loadaddr} - ${dtb_loadaddr}\n'
    }
    const ini = template
      .replace(/@@BOOTARGS@@/g, TELMI_BOOTARGS)
      .replace(/@@DTB@@/g, dtbName)
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trimEnd() + '\n'
    fs.writeFileSync(path.join(root, 'boot.ini'), ini, 'ascii')

    const consoleSrc = path.join(packDir, '.console')
    if (fs.existsSync(consoleSrc)) {
      fs.copyFileSync(consoleSrc, path.join(root, '.console'))
    } else {
      fs.writeFileSync(path.join(root, '.console'), packName + '\n', 'ascii')
    }

    const log =
      'date=' + new Date().toISOString() + '\n' +
      'pack=' + packName + '\n' +
      'dtb=' + dtbName + '\n' +
      'copied=' + copied.join(',') + '\n' +
      'bootargs=telmi-os (no uInitrd)\n'
    fs.writeFileSync(path.join(root, 'TELMI-DTB-SELECT.txt'), log, 'ascii')
  } catch (e) {
    return {ok: false, error: 'r36s-rev-apply-failed', detail: (e && e.message) || String(e)}
  }

  return {ok: true, rev: {id: packName, label: packName}}
}

const applyConsolePack = (bootRoot, packName) => {
  if (!bootRoot || !packName) {
    return Promise.resolve({ok: false, error: 'r36s-dtb-missing'})
  }

  // 1) Essai direct Node (pas d'UAC) — cas normal sur volume BOOT FAT monté
  const nodeResult = applyConsolePackNode(bootRoot, packName)
  if (nodeResult.ok) {
    return Promise.resolve(nodeResult)
  }

  // 2) Fallback PowerShell sans élévation (si Node a échoué pour une raison de droits)
  const script = getBundledDtbScript()
  if (!script) {
    return Promise.resolve(nodeResult)
  }

  return new Promise((resolve) => {
    const bootArg = withSep(bootRoot).replace(/[\\/]+$/, '') + '\\'
    const logFile = path.join(os.tmpdir(), 'telmi-r36-dtb-' + Date.now() + '.log')
    const args = [
      '-NoProfile',
      '-WindowStyle', 'Hidden',
      '-ExecutionPolicy', 'Bypass',
      '-File', script,
      '-PackName', packName,
      '-BootRoot', bootArg
    ]
    const child = spawn('powershell.exe', args, {windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']})
    let err = ''
    child.stderr.on('data', (d) => { err += d.toString() })
    child.stdout.on('data', (d) => { err += d.toString() })
    child.on('error', () => resolve(nodeResult.ok ? nodeResult : {ok: false, error: 'r36s-rev-apply-failed'}))
    child.on('exit', (code) => {
      if (code === 0) {
        resolve({ok: true, rev: {id: packName, label: packName}})
        return
      }
      try {
        fs.writeFileSync(logFile, err || ('exit=' + code), 'utf8')
      } catch (e) {}
      resolve({
        ok: false,
        error: 'r36s-rev-apply-failed',
        detail: (err || nodeResult.detail || '').trim().slice(0, 300)
      })
    })
  })
}

/**
 * Applique une REV legacy ou un pack DTB Other.
 */
async function applyTelmiRev(bootRoot, revId, catalogType = null) {
  if (!bootRoot || !revId) {
    return {ok: false, error: 'r36s-rev-invalid'}
  }

  const type = catalogType || (hasR36sConsolePacks(bootRoot) ? 'consoles' : 'legacy-rev')
  if (type === 'consoles') {
    return applyConsolePack(bootRoot, revId)
  }
  return applyTelmiRevLegacy(bootRoot, revId)
}

async function enrichTelmiDeviceProfile(telmiDevice) {
  if (!telmiDevice || !telmiDevice.drive) {
    return telmiDevice
  }
  const bootRoot = await findBootRoot(telmiDevice.drive)
  if (!bootRoot) {
    telmiDevice.dtbSelectable = false
    telmiDevice.imageProfile = telmiDevice.imageProfile || 'v20'
    return telmiDevice
  }
  const imageProfile = detectR36sImageProfile(bootRoot)
  telmiDevice.imageProfile = imageProfile
  telmiDevice.dtbSelectable = imageProfile === 'other' || hasR36sConsolePacks(bootRoot)
  return telmiDevice
}

export {
  findBootRoot,
  getTelmiRevCatalog,
  applyTelmiRev,
  ensureBootRevCatalog,
  enrichTelmiDeviceProfile
}
