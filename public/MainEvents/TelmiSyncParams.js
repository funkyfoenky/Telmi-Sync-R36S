import { ipcMain } from 'electron'
import {getTelmiSyncParams, saveTelmiSyncParams} from './Helpers/TelmiSyncParams.js'

function mainEventTelmiSyncParams (mainWindow) {
  ipcMain.on(
    'telmi-sync-params-get',
    async (event) => {
      mainWindow.webContents.send('telmi-sync-params', getTelmiSyncParams())
    }
  )
  ipcMain.on(
    'telmi-sync-params-save',
    async (event, params) => {
      saveTelmiSyncParams(params)
      mainWindow.webContents.send('telmi-sync-params', getTelmiSyncParams())
      ipcMain.emit('telmi-sync-recheck-telmios')
    }
  )
}

export default mainEventTelmiSyncParams
