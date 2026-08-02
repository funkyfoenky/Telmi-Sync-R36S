import * as fs from 'fs'
import * as path from 'path'

import {getProcessParams} from '../Helpers/ProcessParams.js'

function main(gamesRoot, gameIds) {
  process.stdout.write('*initialize*0*1*')
  let i = 0
  for (const gameId of gameIds) {
    process.stdout.write('*games-deleting*' + (++i) + '*' + gameIds.length + '*')
    // gameId = "system/file.ext"
    const slash = gameId.indexOf('/')
    if (slash < 1) {
      continue
    }
    const system = gameId.substring(0, slash)
    const fileName = gameId.substring(slash + 1)
    const base = path.parse(fileName).name
    const romPath = path.join(gamesRoot, system, fileName)
    const imgPath = path.join(gamesRoot, system, base + '.png')
    if (fs.existsSync(romPath)) {
      fs.rmSync(romPath)
    }
    if (fs.existsSync(imgPath)) {
      fs.rmSync(imgPath)
    }
    // PSX cue: also remove companion .bin with same base if present
    if (path.extname(fileName).toLowerCase() === '.cue') {
      const binPath = path.join(gamesRoot, system, base + '.bin')
      if (fs.existsSync(binPath)) {
        fs.rmSync(binPath)
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
