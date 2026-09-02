import * as fs from 'fs'
import * as path from 'path'
import { versionStringToObject } from './Version.js'

const
  parseInfFile = (str) => {
    return str
      .split('\n')
      .reduce(
        (acc, v) => {
          const a = v.split('=', 2)
          if (a[1] === undefined) {
            return acc
          }
          return {...acc, [a[0].trim().toLowerCase()]: a[1].trim()}
        },
        {}
      )
  },

  /** Volume BOOT R36S (SD OS dual ou mono) — pas de autorun.inf TELMI. */
  isTelmiOSR36sBootVolume = (drive) => {
    if (!drive || !fs.existsSync(drive)) {
      return false
    }
    return fs.existsSync(path.join(drive, 'TELMI-VERSION.txt')) ||
      fs.existsSync(path.join(drive, 'uInitrd')) ||
      fs.existsSync(path.join(drive, 'Image')) ||
      fs.existsSync(path.join(drive, 'rf3536k3ka.dtb')) ||
      fs.existsSync(path.join(drive, 'revs.json')) ||
      fs.existsSync(path.join(drive, 'consoles'))
  },

  hasR36sConsolePacks = (drive) => {
    const consolesDir = path.join(drive, 'consoles')
    if (!fs.existsSync(consolesDir)) {
      return false
    }
    try {
      return fs.readdirSync(consolesDir, {withFileTypes: true})
        .some((entry) => entry.isDirectory() && !/^(logo|System Volume Information|dtbo)$/i.test(entry.name))
    } catch (e) {
      return false
    }
  },

  detectR36sImageProfile = (drive) => {
    if (!drive || !fs.existsSync(drive)) {
      return 'v20'
    }
    const profilePath = path.join(drive, 'TELMI-IMAGE-PROFILE.txt')
    if (fs.existsSync(profilePath)) {
      const raw = fs.readFileSync(profilePath, 'utf8').trim().toLowerCase()
      if (raw === 'other' || raw === 'v20') {
        return raw
      }
    }
    if (hasR36sConsolePacks(drive)) {
      return 'other'
    }
    return 'v20'
  },

  parseTelmiOSR36sBoot = (drive) => {
    if (!isTelmiOSR36sBootVolume(drive)) {
      return null
    }
    let version = {major: 0, minor: 0, fix: 0}
    const versionFilePath = path.join(drive, 'TELMI-VERSION.txt')
    if (fs.existsSync(versionFilePath)) {
      const raw = fs.readFileSync(versionFilePath).toString('utf8').trim()
      const match = raw.match(/(\d+\.\d+\.\d+)/)
      const parsed = versionStringToObject(match ? match[1] : raw)
      if (parsed !== null) {
        version = parsed
      }
    }
    const imageProfile = detectR36sImageProfile(drive)
    return {
      label: 'TelmiOS',
      version,
      osOnly: true,
      imageProfile,
      dtbSelectable: imageProfile === 'other'
    }
  },

  parseTelmiOSAutorun = (drive, switchMode = false) => {
    // Switch mode: TelmiOS on console SD — folders switch/Telmi/Stories + switch/Telmi/Music (+ TelmiVersion.txt).
    if (switchMode) {
      const storiesDir = path.join(drive, 'switch', 'Telmi', 'Stories')
      const musicDir = path.join(drive, 'switch', 'Telmi', 'Music')

      if (fs.existsSync(storiesDir) && fs.existsSync(musicDir)) {
        const versionFilePath = path.join(drive, 'switch', 'Telmi', 'TelmiVersion.txt')
        let version = { major: 0, minor: 0, fix: 0 }

        if (fs.existsSync(versionFilePath)) {
          const raw = fs.readFileSync(versionFilePath).toString('utf8').trim()
          const match = raw.match(/(\d+\.\d+\.\d+)/)
          const parsed = versionStringToObject(match ? match[1] : raw)
          if (parsed !== null) {
            version = parsed
          }
        }

        return {
          label: 'TelmiOS',
          version
        }
      }

      // Hybrid SD: try legacy autorun if Switch folders are missing
      const pathAutorunSwitch = path.join(drive, 'autorun.inf')
      if (!fs.existsSync(pathAutorunSwitch)) {
        return null
      }

      const autorunSw = parseInfFile(fs.readFileSync(pathAutorunSwitch).toString('utf8'))
      if (autorunSw.label === undefined) {
        return null
      }

      const labelSw = autorunSw.label
      const telmi = 'TelmiOS'
      const v = '-v'

      if (labelSw.substring(0, telmi.length) === telmi) {
        const versionSw = versionStringToObject(labelSw.substring(labelSw.lastIndexOf(v) + v.length))
        if (versionSw !== null && versionSw.major >= 1) {
          return {
            label: telmi,
            version: versionSw
          }
        }
      }

      return null
    }

    // Classic mode: legacy detection via autorun.inf only (original Telmi Sync behavior).
    const pathAutorun = path.join(drive, 'autorun.inf')

    if (!fs.existsSync(pathAutorun)) {
      return null
    }

    const autorun = parseInfFile(fs.readFileSync(pathAutorun).toString('utf8'))

    if (autorun.label === undefined) {
      return null
    }

    const
      label = autorun.label,
      telmi = 'TelmiOS',
      v = '-v'

    if (label.substring(0, telmi.length) === telmi) {

      const version = versionStringToObject(label.substring(label.lastIndexOf(v) + v.length))

      if(version !== null && version.major >= 1) {
        return {
          label: telmi,
          version
        }
      }
    }

    return null
  }

export { parseInfFile, parseTelmiOSAutorun, parseTelmiOSR36sBoot, isTelmiOSR36sBootVolume, detectR36sImageProfile, hasR36sConsolePacks }
