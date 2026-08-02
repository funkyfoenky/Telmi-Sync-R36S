import * as fs from 'fs'
import * as path from 'path'

import {getProcessParams} from '../Helpers/ProcessParams.js'
import {getGamesPath} from '../Helpers/AppPaths.js'
import {createPathDirectories} from '../../Helpers/Files.js'

function main(dstGamesRoot, gameIds) {
  let i = 0
  for (const gameId of gameIds) {
    process.stdout.write('*' + gameId + '*' + (++i) + '*' + gameIds.length + '*')
    const slash = gameId.indexOf('/')
    if (slash < 1) {
      continue
    }
    const system = gameId.substring(0, slash)
    const fileName = gameId.substring(slash + 1)
    const base = path.parse(fileName).name
    const srcDir = getGamesPath(system)
    const dstDir = path.join(dstGamesRoot, system)
    createPathDirectories(dstDir)

    const srcRom = path.join(srcDir, fileName)
    const dstRom = path.join(dstDir, fileName)
    if (!fs.existsSync(srcRom)) {
      continue
    }
    fs.copyFileSync(srcRom, dstRom)

    const srcImg = path.join(srcDir, base + '.png')
    const dstImg = path.join(dstDir, base + '.png')
    if (fs.existsSync(srcImg)) {
      fs.copyFileSync(srcImg, dstImg)
    }

    // Companion .bin for .cue
    if (path.extname(fileName).toLowerCase() === '.cue') {
      const srcBin = path.join(srcDir, base + '.bin')
      const dstBin = path.join(dstDir, base + '.bin')
      if (fs.existsSync(srcBin)) {
        fs.copyFileSync(srcBin, dstBin)
      }
    }
  }
  process.stdout.write('success')
}

const _params_ = getProcessParams()

if (_params_.length === 0) {
  process.stderr.write('no-file')
} else {
  main(_params_.shift(), _params_)
}
