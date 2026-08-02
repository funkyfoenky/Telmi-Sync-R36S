import {ipcMain} from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import {deleteGames, readGames, ensureGamesDirs} from './Helpers/GamesFiles.js'
import {getTelmiOSGamesPath} from './Helpers/TelmiOSPath.js'
import {isR36sMode} from './Helpers/DeviceMode.js'
import runProcess from './Processes/RunProcess.js'

function mainEventTelmiOSGamesReader(mainWindow) {
  ipcMain.on(
    'telmios-games-get',
    async (event, telmiDevice) => {
      // Miyoo / Switch : ne pas créer ni lister Games/ sur la carte
      if (telmiDevice === null || !isR36sMode()) {
        mainWindow.webContents.send('telmios-games-data', [])
        return
      }
      const gamesPath = getTelmiOSGamesPath(telmiDevice.drive)
      ensureGamesDirs(gamesPath)
      mainWindow.webContents.send('telmios-games-data', readGames(gamesPath))
    }
  )

  ipcMain.on(
    'telmios-games-delete',
    async (event, telmiDevice, ids) => {
      if (telmiDevice !== null && isR36sMode()) {
        deleteGames(
          mainWindow,
          getTelmiOSGamesPath(telmiDevice.drive),
          ids,
          () => {
            ipcMain.emit('telmios-games-get', event, telmiDevice)
            ipcMain.emit('telmios-diskusage', event, telmiDevice)
          }
        )
      }
    }
  )

  ipcMain.on('games-transfer', async (event, telmiDevice, games) => {
    if (!telmiDevice || !isR36sMode()) {
      mainWindow.webContents.send('games-transfer-task', '', '', 0, 0)
      return
    }
    const
      gamesPath = getTelmiOSGamesPath(telmiDevice.drive),
      onFinished = () => {
        mainWindow.webContents.send('games-transfer-task', '', '', 0, 0)
        ipcMain.emit('telmios-games-get', event, telmiDevice)
        ipcMain.emit('telmios-diskusage', event, telmiDevice)
      }

    runProcess(
      mainWindow,
      path.join('Games', 'GamesTransfer.js'),
      [gamesPath, ...games.map((g) => g.id)],
      () => {},
      (message, current, total) => {
        mainWindow.webContents.send('games-transfer-task', 'games-transferring', message, current, total)
      },
      () => {},
      onFinished
    )
  })

  ipcMain.on(
    'telmios-games-cover',
    async (event, telmiDevice, game, imagePath) => {
      if (!isR36sMode() || !telmiDevice || !game || !imagePath || !fs.existsSync(imagePath)) {
        return
      }
      const slash = game.id.indexOf('/')
      if (slash < 1) {
        return
      }
      const system = game.id.substring(0, slash)
      const fileName = game.id.substring(slash + 1)
      const base = path.parse(fileName).name
      const dst = path.join(getTelmiOSGamesPath(telmiDevice.drive), system, base + '.png')
      runProcess(
        mainWindow,
        path.join('Games', 'GamesConvertCover.js'),
        [imagePath, dst],
        () => {},
        () => {},
        () => {},
        () => ipcMain.emit('telmios-games-get', event, telmiDevice)
      )
    }
  )
}

export default mainEventTelmiOSGamesReader
