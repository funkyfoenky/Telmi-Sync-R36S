/**
 * Controles emu TelmiOS — format partage TelmiSync / telmi_lr
 * Cles = boutons physiques R36S ; valeurs = actions libretro (ou "null")
 */
const PHYSICAL_BUTTONS = [
  {id: 'UP', label: 'Haut'},
  {id: 'DOWN', label: 'Bas'},
  {id: 'LEFT', label: 'Gauche'},
  {id: 'RIGHT', label: 'Droite'},
  {id: 'A', label: 'A'},
  {id: 'B', label: 'B'},
  {id: 'X', label: 'X'},
  {id: 'Y', label: 'Y'},
  {id: 'L1', label: 'L1'},
  {id: 'R1', label: 'R1'},
  {id: 'L2', label: 'L2'},
  {id: 'R2', label: 'R2'},
  {id: 'START', label: 'Start'},
  {id: 'SELECT', label: 'Select'},
]

const EMU_ACTIONS = [
  {value: 'UP', text: 'Haut'},
  {value: 'DOWN', text: 'Bas'},
  {value: 'LEFT', text: 'Gauche'},
  {value: 'RIGHT', text: 'Droite'},
  {value: 'A', text: 'A'},
  {value: 'B', text: 'B'},
  {value: 'X', text: 'X'},
  {value: 'Y', text: 'Y'},
  {value: 'L', text: 'L / L1'},
  {value: 'R', text: 'R / R1'},
  {value: 'L2', text: 'L2'},
  {value: 'R2', text: 'R2'},
  {value: 'START', text: 'Start'},
  {value: 'SELECT', text: 'Select'},
  {value: 'null', text: '(désactivé)'},
]

const CONTROL_SYSTEMS = [
  {id: 'gb', label: 'Game Boy'},
  {id: 'gbc', label: 'Game Boy Color'},
  {id: 'gba', label: 'Game Boy Advance'},
  {id: 'nes', label: 'NES'},
  {id: 'md', label: 'Megadrive'},
  {id: 'snes', label: 'SNES'},
  {id: 'psx', label: 'PlayStation'},
]

const identityMap = () => {
  const m = {}
  PHYSICAL_BUTTONS.forEach((b) => {
    // L1/R1 physiques → L/R libretro
    if (b.id === 'L1') m[b.id] = 'L'
    else if (b.id === 'R1') m[b.id] = 'R'
    else m[b.id] = b.id
  })
  return m
}

/** Defaults : A/B = boutons physiques R36S (A bas, B droite), sans swap */
const DEFAULT_CONTROLS = {
  default: identityMap(),
  systems: {
    gb: {...identityMap(), X: 'null', Y: 'null', L1: 'null', R1: 'null', L2: 'null', R2: 'null'},
    gbc: {...identityMap(), X: 'null', Y: 'null', L1: 'null', R1: 'null', L2: 'null', R2: 'null'},
    gba: {...identityMap(), X: 'null', Y: 'null'},
    nes: {...identityMap(), X: 'null', Y: 'null', L1: 'null', R1: 'null', L2: 'null', R2: 'null'},
    md: identityMap(),
    snes: identityMap(),
    psx: identityMap(),
  }
}

const mergeControls = (saved) => {
  const out = {
    default: {...DEFAULT_CONTROLS.default, ...(saved && saved.default ? saved.default : {})},
    systems: {}
  }
  CONTROL_SYSTEMS.forEach((s) => {
    out.systems[s.id] = {
      ...DEFAULT_CONTROLS.systems[s.id],
      ...(saved && saved.systems && saved.systems[s.id] ? saved.systems[s.id] : {})
    }
  })
  return out
}

const resolveSystemMap = (controls, systemId) => {
  const c = mergeControls(controls)
  return {...c.default, ...(c.systems[systemId] || {})}
}

export {
  PHYSICAL_BUTTONS,
  EMU_ACTIONS,
  CONTROL_SYSTEMS,
  DEFAULT_CONTROLS,
  mergeControls,
  resolveSystemMap,
  identityMap
}
