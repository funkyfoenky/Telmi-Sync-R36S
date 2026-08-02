/**
 * Consoles TelmiOS R36S — aligné sur Telmi-R36/content/Games/README.txt
 */
const GAME_SYSTEMS = [
  {id: 'gb', label: 'Game Boy', exts: ['.gb']},
  {id: 'gbc', label: 'Game Boy Color', exts: ['.gbc']},
  {id: 'gba', label: 'Game Boy Advance', exts: ['.gba']},
  {id: 'nes', label: 'NES', exts: ['.nes']},
  {id: 'md', label: 'Megadrive', exts: ['.md', '.gen', '.smd']},
  {id: 'snes', label: 'SNES', exts: ['.sfc', '.smc']},
  {id: 'psx', label: 'PlayStation', exts: ['.cue', '.chd', '.pbp', '.iso', '.img']},
]

const ALL_ROM_EXTS = new Set(
  GAME_SYSTEMS.flatMap((s) => s.exts).concat(['.bin'])
)

const systemByExt = (extLower) => {
  for (const s of GAME_SYSTEMS) {
    if (s.exts.includes(extLower)) {
      return s.id
    }
  }
  return null
}

/**
 * Detect system for a ROM path. .bin alone → md, unless sibling .cue → psx.
 */
const detectSystem = (filePath, fs, path) => {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.bin') {
    const cue = filePath.slice(0, -4) + '.cue'
    if (fs.existsSync(cue)) {
      return 'psx'
    }
    return 'md'
  }
  return systemByExt(ext)
}

const systemLabel = (id) => {
  const s = GAME_SYSTEMS.find((x) => x.id === id)
  return s ? s.label : id
}

export {GAME_SYSTEMS, ALL_ROM_EXTS, detectSystem, systemLabel, systemByExt}
