import * as fs from 'fs'
import * as path from 'path'
import runProcess from '../Processes/RunProcess.js'
import {GAME_SYSTEMS} from './GameSystems.js'
import {createPathDirectories} from './Files.js'

const
  readGames = (gamesRoot) => {
    if (!fs.existsSync(gamesRoot)) {
      return []
    }
    const games = []
    for (const sys of GAME_SYSTEMS) {
      const sysDir = path.join(gamesRoot, sys.id)
      if (!fs.existsSync(sysDir)) {
        continue
      }
      const files = fs.readdirSync(sysDir)
      for (const f of files) {
        const ext = path.extname(f).toLowerCase()
        if (ext === '.png' || ext === '.keep' || f.startsWith('.')) {
          continue
        }
        if (!sys.exts.includes(ext) && !(sys.id === 'md' && ext === '.bin') && !(sys.id === 'psx' && ext === '.bin')) {
          // Keep unknown files that look like roms in this folder
          if (!['.gb', '.gbc', '.gba', '.nes', '.md', '.gen', '.smd', '.bin',
            '.sfc', '.smc', '.cue', '.chd', '.pbp', '.iso', '.img'].includes(ext)) {
            continue
          }
        }
        const base = path.parse(f).name
        const romPath = path.join(sysDir, f)
        if (!fs.lstatSync(romPath).isFile()) {
          continue
        }
        // PSX : .bin compagnon d'un .cue → ne pas lister comme jeu
        if (sys.id === 'psx' && ext === '.bin' && fs.existsSync(path.join(sysDir, base + '.cue'))) {
          continue
        }
        const imagePath = path.join(sysDir, base + '.png')
        const hasCover = fs.existsSync(imagePath)
        games.push({
          id: sys.id + '/' + f,
          system: sys.id,
          systemLabel: sys.label,
          fileName: f,
          title: base,
          rom: romPath,
          image: hasCover ? (imagePath + '?t=' + Math.trunc(Date.now() / 10000)) : '',
          hasCover
        })
      }
    }
    return games.sort((a, b) => {
      if (a.system !== b.system) {
        return a.system.localeCompare(b.system)
      }
      return a.title.localeCompare(b.title, undefined, {sensitivity: 'base'})
    })
  },

  deleteGames = (mainWindow, gamesRoot, ids, onFinished) => {
    if (!Array.isArray(ids)) {
      return false
    }
    runProcess(
      mainWindow,
      path.join('Games', 'GamesDelete.js'),
      [gamesRoot, ...ids],
      () => {},
      () => {},
      () => {},
      onFinished
    )
    return true
  },

  ensureGamesDirs = (gamesRoot) => {
    createPathDirectories(gamesRoot)
    GAME_SYSTEMS.forEach((s) => createPathDirectories(path.join(gamesRoot, s.id)))
  }

export {readGames, deleteGames, ensureGamesDirs}
