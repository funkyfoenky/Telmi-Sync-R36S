import * as fs from 'fs'
import path from 'path'

import {getProcessParams} from '../Helpers/ProcessParams.js'
import {convertMusicImage} from '../Import/Helpers/ImageFile.js'

function main(srcPath, dstPath) {
  const fallback = () => {
    try {
      fs.copyFileSync(srcPath, dstPath)
      process.stdout.write('success')
    } catch (e) {
      process.stderr.write('games-cover-failed')
    }
  }

  convertMusicImage(srcPath, dstPath)
    .then(() => {
      if (!fs.existsSync(dstPath)) {
        return fallback()
      }
      process.stdout.write('success')
    })
    .catch(fallback)
}

const _params_ = getProcessParams()

if (_params_.length < 2) {
  process.stderr.write('no-file')
} else {
  main(_params_[0], _params_[1])
}

void path
