import * as fs from 'fs'
import * as path from 'path'

import { getProcessParams } from '../Helpers/ProcessParams.js'
import { initAppPaths } from '../Helpers/AppPaths.js'
import { getTelmiSyncParams } from '../Helpers/TelmiSyncParams.js'
import convertMusic from './ConvertMusic.js'
import convertGame from './ConvertGame.js'
import convertZip from './ConvertZip.js'
import convertFolder from './ConvertFolder.js'

const isR36sMode = () => getTelmiSyncParams().deviceMode === 'r36s'

function main (srcPath) {
  initAppPaths()
  if (!fs.existsSync(srcPath)) {
    process.stderr.write('file-not-found')
    return
  }

  const allowGames = isR36sMode()

  if (fs.lstatSync(srcPath).isDirectory()) {
    // Prefer game ROMs if the folder contains any (R36S only)
    const hasRom = allowGames && (() => {
      try {
        return fs.readdirSync(srcPath).some((f) => {
          const e = path.extname(f).toLowerCase()
          return ['.gb', '.gbc', '.gba', '.nes', '.md', '.gen', '.smd', '.sfc', '.smc',
            '.cue', '.chd', '.pbp', '.iso', '.img', '.bin'].includes(e)
        })
      } catch (e) {
        return false
      }
    })()
    if (hasRom) {
      convertGame(srcPath)
    } else {
      convertFolder(srcPath)
    }
  } else {
    switch (path.extname(srcPath).toLowerCase()) {
      case '.zip':
      case '.7z':
        convertZip(srcPath)
        break
      case '.mp3':
      case '.flac':
      case '.aac':
      case '.ogg':
      case '.wav':
      case '.mp4a':
      case '.m4a':
      case '.wma':
      case '.webm':
        convertMusic(srcPath)
        break
      case '.gb':
      case '.gbc':
      case '.gba':
      case '.nes':
      case '.md':
      case '.gen':
      case '.smd':
      case '.bin':
      case '.sfc':
      case '.smc':
      case '.cue':
      case '.chd':
      case '.pbp':
      case '.iso':
      case '.img':
      case '.png':
        if (allowGames) {
          convertGame(srcPath)
        } else {
          process.stderr.write('file-ext-not-supported')
        }
        break
      default:
        process.stderr.write('file-ext-not-supported')
    }
  }
}

const _params_ = getProcessParams()

if (_params_.length === 0) {
  process.stderr.write('no-file')
} else {
  main(_params_[0])
}

