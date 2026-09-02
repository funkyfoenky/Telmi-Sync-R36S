import { app, ipcMain } from 'electron'
import { requestJson } from './Helpers/Request.js'
import { isNewerVersion } from './Helpers/Version.js'
import {R36S_APP_RELEASES, MIYOO_APP_RELEASES, pickLatestStableRelease} from './Helpers/GitHubReleases.js'

function mainEventUpdate (mainWindow) {
  ipcMain.on('app-version-get', () => {
    mainWindow.webContents.send('app-version', app.getVersion())
  })

  ipcMain.on(
    'check-update',
    async () => {
      const isR36Build = app.getName().includes('R36')
      const releasesUrl = isR36Build ? R36S_APP_RELEASES : MIYOO_APP_RELEASES
      const downloadUrl = isR36Build
        ? 'https://github.com/funkyfoenky/Telmi-Sync-R36S/releases/latest'
        : 'https://telmi.fr/#download'

      let json
      try {
        json = await requestJson(releasesUrl, {})
      } catch (e) {
        return
      }

      const latest = pickLatestStableRelease(json)
      if (!latest || !isNewerVersion(app.getVersion(), latest.tag_name)) {
        return
      }
      mainWindow.webContents.send('check-update-data', downloadUrl)
    }
  )
}

export default mainEventUpdate
