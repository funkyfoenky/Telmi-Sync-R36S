import {ipcMain} from 'electron'
import * as drivelist from 'drivelist'
import checkDiskSpace from 'check-disk-space'
import {parseTelmiOSAutorun} from './Helpers/InfFiles.js'
import {readTelmiOSParameters, saveTelmiOSParameters} from './Helpers/TelmiOS.js'
import {isSwitchMode, isR36sMode} from './Helpers/DeviceMode.js'
import runProcess from './Processes/RunProcess.js'
import * as path from 'path'

function mainEventTelmiOS(mainWindow) {
  const checkUsbDevices = async () => {
    const drives = (await drivelist.list()).reduce((acc, d) => [...acc, ...d.mountpoints.map((p) => p.path)], [])
    const switchMode = isSwitchMode()

    for (const drive of drives) {
      const telmiOS = parseTelmiOSAutorun(drive, switchMode)
      if (telmiOS !== null) {
        mainWindow.webContents.send('telmios-data', readTelmiOSParameters({drive, telmiOS}))
        return
      }
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

  ipcMain.on(
    'telmios-diskusage',
    async (event, telmiDevice) => {
      if (telmiDevice === null) {
        return mainWindow.webContents.send('telmios-diskusage-data', null)
      }
      try {
        const { free, size } = await checkDiskSpace(telmiDevice.drive)
        return mainWindow.webContents.send('telmios-diskusage-data', { available: free, free, total: size })
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
      runProcess(
        mainWindow,
        path.join('TelmiOS', 'CardMaker.js'),
        [drive.drive],
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
}

export default mainEventTelmiOS
