import {ipcMain} from 'electron'
import * as drivelist from 'drivelist'
import {parseTelmiOSAutorun, parseTelmiOSR36sBoot, isTelmiOSR36sBootVolume} from './Helpers/InfFiles.js'
import {readTelmiOSParameters, saveTelmiOSParameters} from './Helpers/TelmiOS.js'
import {isSwitchMode, isR36sMode} from './Helpers/DeviceMode.js'
import {getTelmiRevCatalog, applyTelmiRev, enrichTelmiDeviceProfile} from './Helpers/TelmiOSRev.js'
import runProcess from './Processes/RunProcess.js'
import * as path from 'path'
import * as fs from 'fs'

// Replaces the `diskusage` native module: fs.statfs ships with Node since 18.15
// and returns the same figures, with nothing to compile against the ABI.
function checkDiskUsage(drive) {
  const {bsize, blocks, bfree, bavail} = fs.statfsSync(drive)
  return {total: blocks * bsize, free: bfree * bsize, available: bavail * bsize}
}

function mainEventTelmiOS(mainWindow) {
  const checkUsbDevices = async () => {
    const drives = (await drivelist.list()).reduce((acc, d) => [...acc, ...d.mountpoints.map((p) => p.path)], [])
    const switchMode = isSwitchMode()
    const r36sMode = isR36sMode()

    let contentDevice = null
    let bootDevice = null

    for (const drive of drives) {
      const telmiOS = parseTelmiOSAutorun(drive, switchMode)
      if (telmiOS !== null) {
        contentDevice = readTelmiOSParameters({drive, telmiOS, osOnly: false})
        // En R36S on continue pour éventuellement noter BOOT, mais on privilégie TELMI
        if (!r36sMode) {
          mainWindow.webContents.send('telmios-data', contentDevice)
          return
        }
        continue
      }
      if (r36sMode && !bootDevice) {
        const bootTelmi = parseTelmiOSR36sBoot(drive)
        if (bootTelmi !== null) {
          bootDevice = readTelmiOSParameters({
            drive,
            telmiOS: {
              label: bootTelmi.label,
              version: bootTelmi.version
            },
            osOnly: true,
            imageProfile: bootTelmi.imageProfile,
            dtbSelectable: bootTelmi.dtbSelectable
          })
        }
      }
    }

    if (contentDevice) {
      if (r36sMode) {
        contentDevice = await enrichTelmiDeviceProfile(contentDevice)
      }
      mainWindow.webContents.send('telmios-data', contentDevice)
      return
    }
    if (bootDevice) {
      if (r36sMode) {
        bootDevice = await enrichTelmiDeviceProfile(bootDevice)
      }
      mainWindow.webContents.send('telmios-data', bootDevice)
      return
    }

    mainWindow.webContents.send('telmios-data', null)
  }

  ipcMain.on('telmi-sync-recheck-telmios', () => {
    checkUsbDevices()
  })

  setInterval(checkUsbDevices, 5000)
  setTimeout(checkUsbDevices, 500)

  ipcMain.on(
    'telmios-disklist',
    async (event) => {
      mainWindow.webContents.send(
        'telmios-disklist-data',
        (await drivelist.list())
          .filter((d) => d.isRemovable && d.partitionTableType !== null)
          .reduce((acc, d) => [...acc, ...d.mountpoints.map((p) => ({name: d.description, drive: p.path, size: d.size}))], [])
      )
    }
  )

  // Liste pour préparation SD contenu : exclut les volumes BOOT (SD OS), pas la lettre
  // (Windows réutilise souvent la même lettre après retrait de la SD OS).
  ipcMain.on(
    'telmios-disklist-content',
    async (event) => {
      const list = await drivelist.list()
      const out = []
      for (const d of list) {
        if (!d.isRemovable) {
          continue
        }
        // Inclure aussi les cartes sans table reconnue si elles ont un point de montage
        if (d.partitionTableType === null && !(d.mountpoints && d.mountpoints.length)) {
          continue
        }
        for (const mp of d.mountpoints || []) {
          if (isTelmiOSR36sBootVolume(mp.path)) {
            continue
          }
          out.push({name: d.description, drive: mp.path, size: d.size})
        }
      }
      mainWindow.webContents.send('telmios-disklist-content-data', out)
    }
  )

  ipcMain.on(
    'telmios-diskusage',
    async (event, telmiDevice) => {
      if (telmiDevice === null) {
        return mainWindow.webContents.send('telmios-diskusage-data', null)
      }
      try {
        return mainWindow.webContents.send('telmios-diskusage-data', checkDiskUsage(telmiDevice.drive))
      } catch (e) {
        return mainWindow.webContents.send('telmios-diskusage-data', null)
      }
    }
  )

  ipcMain.on('telmios-save-parameters', async (event, telmiDevice) => saveTelmiOSParameters(telmiDevice))

  ipcMain.on(
    'telmios-update',
    async (event, telmiDevice) => {
      if (telmiDevice === undefined || telmiDevice === null) {
        return
      }

      // Switch : pas de check firmware (désactivé / géré à part)
      if (isSwitchMode()) {
        mainWindow.webContents.send('telmios-update-task', '', '', 0, 0)
        return
      }

      // R36S : check seule → popup UI si outdated (pas d'apply auto)
      if (isR36sMode()) {
        runProcess(
          mainWindow,
          path.join('TelmiOS', 'Update.js'),
          [telmiDevice.drive, 'check'],
          () => {},
          () => {},
          (error) => {
            if (typeof error === 'string' && error.indexOf('outdated') !== -1) {
              mainWindow.webContents.send('telmios-update-outdated')
            }
          },
          () => {
            mainWindow.webContents.send('telmios-update-task', '', '', 0, 0)
          }
        )
        return
      }

      runProcess(
        mainWindow,
        path.join('TelmiOS', 'Update.js'),
        [telmiDevice.drive],
        () => {},
        (message, current, total) => {
          mainWindow.webContents.send('telmios-update-task', 'telmios-update', message, current, total)
        },
        (error) => {
          mainWindow.webContents.send('telmios-update-error', 'telmios-update', error)
        },
        () => {
          mainWindow.webContents.send('telmios-update-task', '', '', 0, 0)
          checkUsbDevices()
        }
      )
    }
  )

  ipcMain.on(
    'telmios-eject',
    async (event, telmiDevice) => {
      if (telmiDevice === undefined || telmiDevice === null) {
        return
      }
      runProcess(
        mainWindow,
        path.join('TelmiOS', 'Eject.js'),
        [telmiDevice.drive],
        () => {},
        (message, current, total) => {
          mainWindow.webContents.send('telmios-eject-task', 'telmios-eject', message, current, total)
        },
        (error) => {
          mainWindow.webContents.send('telmios-eject-error', 'telmios-eject', error)
        },
        () => {
          mainWindow.webContents.send('telmios-eject-task', '', '', 0, 0)
          checkUsbDevices()
        }
      )
    }
  )

  ipcMain.on(
    'telmios-cardmaker',
    async (event, drive) => {
      if (drive === undefined || drive === null) {
        return
      }
      const drivePath = typeof drive === 'string' ? drive : drive.drive
      const sdLayout = (typeof drive === 'object' && drive.sdLayout === 'multi') ? 'multi' : 'mono'
      const imageProfile = (typeof drive === 'object' && drive.imageProfile === 'other') ? 'other' : 'v20'
      if (!drivePath) {
        return
      }
      runProcess(
        mainWindow,
        path.join('TelmiOS', 'CardMaker.js'),
        [drivePath, sdLayout, imageProfile],
        () => {},
        (message, current, total) => {
          mainWindow.webContents.send('telmios-cardmaker-task', 'telmios-cardmaker', message, current, total)
        },
        (error) => {
          const raw = (error || 'formatting-failed').toString().trim()
          const first = (raw.split(/\r?\n/).find((l) => l.trim()) || 'formatting-failed').trim()
          const known = first.match(/^(r36s-[\w-]+|formatting-failed(?:-\d+)?|device-not-found|telmios-download-error)/)
          mainWindow.webContents.send(
            'telmios-cardmaker-error',
            'telmios-cardmaker',
            known ? known[1] : 'r36s-flash-failed'
          )
        },
        () => {
          mainWindow.webContents.send('telmios-cardmaker-task', '', '', 0, 0)
          checkUsbDevices()
        }
      )
    }
  )

  ipcMain.on(
    'telmios-prepare-content',
    async (event, drive) => {
      if (drive === undefined || drive === null) {
        return
      }
      const drivePath = typeof drive === 'string' ? drive : drive.drive
      if (!drivePath) {
        return
      }
      runProcess(
        mainWindow,
        path.join('TelmiOS', 'PrepareContentR36s.js'),
        [drivePath],
        () => {},
        (message, current, total) => {
          mainWindow.webContents.send('telmios-prepare-content-task', 'telmios-prepare-content', message, current, total)
        },
        (error) => {
          const raw = (error || 'r36s-content-prepare-failed').toString().trim()
          const first = (raw.split(/\r?\n/).find((l) => l.trim()) || 'r36s-content-prepare-failed').trim()
          const known = first.match(/^(r36s-[\w-]+|device-not-found)/)
          mainWindow.webContents.send(
            'telmios-prepare-content-error',
            'telmios-prepare-content',
            known ? known[1] : 'r36s-content-prepare-failed'
          )
        },
        () => {
          mainWindow.webContents.send('telmios-prepare-content-task', '', '', 0, 0)
          checkUsbDevices()
        }
      )
    }
  )

  ipcMain.on(
    'telmios-rev-get',
    async (event, telmiDevice) => {
      if (!telmiDevice || !telmiDevice.drive) {
        mainWindow.webContents.send('telmios-rev-data', {error: 'telmios-not-found'})
        return
      }
      try {
        const data = await getTelmiRevCatalog(telmiDevice.drive)
        mainWindow.webContents.send('telmios-rev-data', data)
      } catch (e) {
        mainWindow.webContents.send('telmios-rev-data', {error: 'r36s-revs-invalid'})
      }
    }
  )

  ipcMain.on(
    'telmios-rev-apply',
    async (event, telmiDevice, revId) => {
      if (!telmiDevice || !telmiDevice.drive || !revId) {
        mainWindow.webContents.send('telmios-rev-apply-result', {ok: false, error: 'r36s-rev-invalid'})
        return
      }
      try {
        const catalog = await getTelmiRevCatalog(telmiDevice.drive)
        if (catalog.error) {
          mainWindow.webContents.send('telmios-rev-apply-result', {ok: false, error: catalog.error})
          return
        }
        const result = await applyTelmiRev(catalog.bootRoot, revId, catalog.catalogType)
        mainWindow.webContents.send('telmios-rev-apply-result', result)
      } catch (e) {
        mainWindow.webContents.send('telmios-rev-apply-result', {ok: false, error: 'r36s-rev-apply-failed'})
      }
    }
  )
}

export default mainEventTelmiOS
