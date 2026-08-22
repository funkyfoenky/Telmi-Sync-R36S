import * as fs from 'fs'
import * as path from 'path'
import * as drivelist from 'drivelist'
import {getExtraResourcesPath} from './AppPaths.js'

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
    fs.existsSync(path.join(root, 'rf3536k3ka.dtb')) ||
    fs.existsSync(path.join(root, 'TELMI-VERSION.txt')) ||
    fs.existsSync(path.join(root, 'uInitrd')) ||
    fs.existsSync(path.join(root, 'Image'))
}

const getBundledBootSeedPath = () => path.join(getExtraResourcesPath(), 'r36s', 'boot')

/**
 * Copie revs.json + dtb/*.dtb depuis extraResources si absents sur BOOT
 * (l'image GitHub 0.4.x n'embarque pas encore le catalogue multi-REV).
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

/**
 * Trouve la racine du volume BOOT associé au lecteur TELMI détecté.
 */
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

  // 1) Prefer volume that already has revs.json (same disk first)
  for (const root of candidates) {
    if (fs.existsSync(path.join(root, 'revs.json'))) {
      return withSep(root)
    }
  }
  // 2) BOOT markers (Image / uInitrd / TELMI-VERSION / active DTB)
  for (const root of candidates) {
    if (sameMount(root, telmiRoot)) {
      continue
    }
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

/**
 * @returns {{bootRoot, current, default, active_dtb, revs}|{error}}
 */
async function getTelmiRevCatalog(telmiDrive) {
  const bootRoot = await findBootRoot(telmiDrive)
  if (!bootRoot) {
    return {error: 'r36s-boot-not-found'}
  }

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

  // Garantir les DTB listés (copie depuis le bundle si besoin)
  try {
    ensureBootRevCatalog(bootRoot)
  } catch (e) {}

  return {
    bootRoot,
    current: readCurrentRev(bootRoot),
    default: catalog.default || null,
    active_dtb: catalog.active_dtb || 'rf3536k3ka.dtb',
    revs: catalog.revs
  }
}

/**
 * Applique une REV (même logique que Select-Telmi-REV.ps1).
 * @returns {{ok:true, rev}|{ok:false, error}}
 */
function applyTelmiRev(bootRoot, revId) {
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

export {findBootRoot, getTelmiRevCatalog, applyTelmiRev, ensureBootRevCatalog}
