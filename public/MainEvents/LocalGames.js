import {ipcMain} from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import {getGamesPath} from './Helpers/AppPaths.js'
import {deleteGames, readGames} from './Helpers/GamesFiles.js'
import runProcess from './Processes/RunProcess.js'

function mainEventLocalGamesReader(mainWindow) {
  ipcMain.on(
    'local-games-get',
    async () => {
      mainWindow.webContents.send('local-games-data', readGames(getGamesPath()))
    }
  )

  ipcMain.on(
    'local-games-delete',
    async (event, ids) => {
      deleteGames(
        mainWindow,
        getGamesPath(),
        ids,
        () => ipcMain.emit('local-games-get')
      )
    }
  )

  ipcMain.on(
    'local-games-cover',
    async (event, game, imagePath) => {
      if (!game || typeof game.id !== 'string' || !imagePath || !fs.existsSync(imagePath)) {
        return
      }
      const slash = game.id.indexOf('/')
      if (slash < 1) {
        return
      }
      const system = game.id.substring(0, slash)
      const fileName = game.id.substring(slash + 1)
      const base = path.parse(fileName).name
      const dst = path.join(getGamesPath(system), base + '.png')
      runProcess(
        mainWindow,
        path.join('Games', 'GamesConvertCover.js'),
        [imagePath, dst],
        () => {},
        () => {},
        () => {},
        () => ipcMain.emit('local-games-get')
      )
    }
  )
}

export default mainEventLocalGamesReader
