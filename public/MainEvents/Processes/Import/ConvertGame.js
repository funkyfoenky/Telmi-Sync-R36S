import * as fs from 'fs'
import * as path from 'path'

import {getGamesPath} from '../Helpers/AppPaths.js'
import {detectSystem, ALL_ROM_EXTS} from '../../Helpers/GameSystems.js'
import {createPathDirectories} from '../../Helpers/Files.js'
import {convertMusicImage} from './Helpers/ImageFile.js'

const copyRom = (srcPath, system) => {
  const fileName = path.basename(srcPath)
  const base = path.parse(fileName).name
  const dstDir = getGamesPath(system)
  createPathDirectories(dstDir)
  fs.copyFileSync(srcPath, path.join(dstDir, fileName))

  if (path.extname(fileName).toLowerCase() === '.cue') {
    const srcBin = path.join(path.dirname(srcPath), base + '.bin')
    if (fs.existsSync(srcBin)) {
      fs.copyFileSync(srcBin, path.join(dstDir, base + '.bin'))
    }
  }

  const srcCover = path.join(path.dirname(srcPath), base + '.png')
  const dstCover = path.join(dstDir, base + '.png')
  if (fs.existsSync(srcCover)) {
    return convertMusicImage(srcCover, dstCover).catch(() => {
      fs.copyFileSync(srcCover, dstCover)
    })
  }
  return Promise.resolve()
}

const attachCover = (srcPath) => {
  const base = path.parse(srcPath).name
  for (const sys of ['gb', 'gbc', 'gba', 'nes', 'md', 'snes', 'psx']) {
    const dir = getGamesPath(sys)
    if (!fs.existsSync(dir)) {
      continue
    }
    const rom = fs.readdirSync(dir).find(
      (f) => path.parse(f).name === base && path.extname(f).toLowerCase() !== '.png'
    )
    if (rom) {
      const dst = path.join(dir, base + '.png')
      return convertMusicImage(srcPath, dst).catch(() => {
        fs.copyFileSync(srcPath, dst)
      })
    }
  }
  process.stderr.write('game-cover-no-rom')
  return Promise.resolve()
}

const importFile = (srcPath) => {
  const ext = path.extname(srcPath).toLowerCase()
  if (ext === '.png') {
    return attachCover(srcPath).then(() => {
      process.stdout.write('success')
    })
  }
  if (!ALL_ROM_EXTS.has(ext)) {
    process.stderr.write('file-ext-not-supported')
    return Promise.resolve()
  }
  const system = detectSystem(srcPath, fs, path)
  if (!system) {
    process.stderr.write('file-ext-not-supported')
    return Promise.resolve()
  }
  process.stdout.write('*games-importing*0*1*')
  return copyRom(srcPath, system).then(() => {
    process.stdout.write('success')
  })
}

const importFolder = (dirPath) => {
  const files = fs.readdirSync(dirPath)
    .map((f) => path.join(dirPath, f))
    .filter((p) => fs.lstatSync(p).isFile())
  const roms = files.filter((p) => {
    const ext = path.extname(p).toLowerCase()
    return ALL_ROM_EXTS.has(ext) && ext !== '.png'
  }).filter((p) => {
    if (path.extname(p).toLowerCase() !== '.bin') {
      return true
    }
    return !fs.existsSync(p.slice(0, -4) + '.cue')
  })

  if (!roms.length) {
    process.stderr.write('file-ext-not-supported')
    return Promise.resolve()
  }

  let i = 0
  const next = () => {
    if (i >= roms.length) {
      process.stdout.write('success')
      return Promise.resolve()
    }
    const rom = roms[i++]
    process.stdout.write('*games-importing*' + i + '*' + roms.length + '*')
    const system = detectSystem(rom, fs, path)
    if (!system) {
      return next()
    }
    return copyRom(rom, system).then(next)
  }
  return next()
}

function convertGame(srcPath) {
  if (fs.lstatSync(srcPath).isDirectory()) {
    return importFolder(srcPath)
  }
  return importFile(srcPath)
}

export default convertGame
