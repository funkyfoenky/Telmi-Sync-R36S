import * as path from 'path'
import { createPathDirectories } from './Files.js'
import { isSwitchMode } from './DeviceMode.js'

const
  isSwitchLayout = () => isSwitchMode(),
  getTelmiOSStoriesPath = (usbPath) => {
    const storiesPath = isSwitchLayout() ?
      path.join(usbPath, 'switch', 'Telmi', 'Stories') :
      path.join(usbPath, 'Stories')
    createPathDirectories(storiesPath)
    return storiesPath
  },
  getTelmiOSMusicPath = (usbPath) => {
    const musicPath = isSwitchLayout() ?
      path.join(usbPath, 'switch', 'Telmi', 'Music') :
      path.join(usbPath, 'Music')
    createPathDirectories(musicPath)
    return musicPath
  },
  getTelmiOSGamesPath = (usbPath) => {
    const gamesPath = isSwitchLayout() ?
      path.join(usbPath, 'switch', 'Telmi', 'Games') :
      path.join(usbPath, 'Games')
    createPathDirectories(gamesPath)
    ;['gb', 'gbc', 'gba', 'nes', 'md', 'snes', 'psx'].forEach((sys) => {
      createPathDirectories(path.join(gamesPath, sys))
    })
    return gamesPath
  }

export { getTelmiOSMusicPath, getTelmiOSStoriesPath, getTelmiOSGamesPath }
