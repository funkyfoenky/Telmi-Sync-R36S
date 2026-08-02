/**
 * Constantes UI mapping controles (miroir public/MainEvents/Helpers/GameControls.js)
 */
const PHYSICAL_BUTTONS = [
  {id: 'UP', labelKey: 'ctrl-btn-up'},
  {id: 'DOWN', labelKey: 'ctrl-btn-down'},
  {id: 'LEFT', labelKey: 'ctrl-btn-left'},
  {id: 'RIGHT', labelKey: 'ctrl-btn-right'},
  {id: 'A', labelKey: 'ctrl-btn-a'},
  {id: 'B', labelKey: 'ctrl-btn-b'},
  {id: 'X', labelKey: 'ctrl-btn-x'},
  {id: 'Y', labelKey: 'ctrl-btn-y'},
  {id: 'L1', labelKey: 'ctrl-btn-l1'},
  {id: 'R1', labelKey: 'ctrl-btn-r1'},
  {id: 'L2', labelKey: 'ctrl-btn-l2'},
  {id: 'R2', labelKey: 'ctrl-btn-r2'},
  {id: 'START', labelKey: 'ctrl-btn-start'},
  {id: 'SELECT', labelKey: 'ctrl-btn-select'},
]

const EMU_ACTION_OPTIONS = [
  {value: 'UP', textKey: 'ctrl-act-up'},
  {value: 'DOWN', textKey: 'ctrl-act-down'},
  {value: 'LEFT', textKey: 'ctrl-act-left'},
  {value: 'RIGHT', textKey: 'ctrl-act-right'},
  {value: 'A', textKey: 'ctrl-act-a'},
  {value: 'B', textKey: 'ctrl-act-b'},
  {value: 'X', textKey: 'ctrl-act-x'},
  {value: 'Y', textKey: 'ctrl-act-y'},
  {value: 'L', textKey: 'ctrl-act-l'},
  {value: 'R', textKey: 'ctrl-act-r'},
  {value: 'L2', textKey: 'ctrl-act-l2'},
  {value: 'R2', textKey: 'ctrl-act-r2'},
  {value: 'START', textKey: 'ctrl-act-start'},
  {value: 'SELECT', textKey: 'ctrl-act-select'},
  {value: 'null', textKey: 'ctrl-act-null'},
]

/**
 * Libellés d'actions émulateur = boutons de la console réelle.
 * Clés internes (A/B/X/Y…) restent les IDs RetroPad / controls.json.
 * Mapping Megadrive : RetroPad B→A, A→B, Y→C, X→X, L→Y, R→Z (Genesis Plus / PicoDrive).
 * Mapping PlayStation : B→Croix, A→Rond, Y→Carré, X→Triangle.
 */
const SYSTEM_EMU_LABEL_KEYS = {
  gb: {
    UP: 'ctrl-face-up', DOWN: 'ctrl-face-down', LEFT: 'ctrl-face-left', RIGHT: 'ctrl-face-right',
    A: 'ctrl-gb-a', B: 'ctrl-gb-b', X: 'ctrl-act-x', Y: 'ctrl-act-y',
    L: 'ctrl-act-l', R: 'ctrl-act-r', L2: 'ctrl-act-l2', R2: 'ctrl-act-r2',
    START: 'ctrl-gb-start', SELECT: 'ctrl-gb-select', null: 'ctrl-act-null'
  },
  gbc: {
    UP: 'ctrl-face-up', DOWN: 'ctrl-face-down', LEFT: 'ctrl-face-left', RIGHT: 'ctrl-face-right',
    A: 'ctrl-gb-a', B: 'ctrl-gb-b', X: 'ctrl-act-x', Y: 'ctrl-act-y',
    L: 'ctrl-act-l', R: 'ctrl-act-r', L2: 'ctrl-act-l2', R2: 'ctrl-act-r2',
    START: 'ctrl-gb-start', SELECT: 'ctrl-gb-select', null: 'ctrl-act-null'
  },
  gba: {
    UP: 'ctrl-face-up', DOWN: 'ctrl-face-down', LEFT: 'ctrl-face-left', RIGHT: 'ctrl-face-right',
    A: 'ctrl-gba-a', B: 'ctrl-gba-b', X: 'ctrl-act-x', Y: 'ctrl-act-y',
    L: 'ctrl-gba-l', R: 'ctrl-gba-r', L2: 'ctrl-act-l2', R2: 'ctrl-act-r2',
    START: 'ctrl-gba-start', SELECT: 'ctrl-gba-select', null: 'ctrl-act-null'
  },
  nes: {
    UP: 'ctrl-face-up', DOWN: 'ctrl-face-down', LEFT: 'ctrl-face-left', RIGHT: 'ctrl-face-right',
    A: 'ctrl-nes-a', B: 'ctrl-nes-b', X: 'ctrl-act-x', Y: 'ctrl-act-y',
    L: 'ctrl-act-l', R: 'ctrl-act-r', L2: 'ctrl-act-l2', R2: 'ctrl-act-r2',
    START: 'ctrl-nes-start', SELECT: 'ctrl-nes-select', null: 'ctrl-act-null'
  },
  md: {
    UP: 'ctrl-face-up', DOWN: 'ctrl-face-down', LEFT: 'ctrl-face-left', RIGHT: 'ctrl-face-right',
    A: 'ctrl-md-b', B: 'ctrl-md-a', X: 'ctrl-md-x', Y: 'ctrl-md-c',
    L: 'ctrl-md-y', R: 'ctrl-md-z', L2: 'ctrl-act-l2', R2: 'ctrl-act-r2',
    START: 'ctrl-md-start', SELECT: 'ctrl-md-mode', null: 'ctrl-act-null'
  },
  snes: {
    UP: 'ctrl-face-up', DOWN: 'ctrl-face-down', LEFT: 'ctrl-face-left', RIGHT: 'ctrl-face-right',
    A: 'ctrl-snes-a', B: 'ctrl-snes-b', X: 'ctrl-snes-x', Y: 'ctrl-snes-y',
    L: 'ctrl-snes-l', R: 'ctrl-snes-r', L2: 'ctrl-act-l2', R2: 'ctrl-act-r2',
    START: 'ctrl-snes-start', SELECT: 'ctrl-snes-select', null: 'ctrl-act-null'
  },
  psx: {
    UP: 'ctrl-face-up', DOWN: 'ctrl-face-down', LEFT: 'ctrl-face-left', RIGHT: 'ctrl-face-right',
    A: 'ctrl-psx-circle', B: 'ctrl-psx-cross', X: 'ctrl-psx-triangle', Y: 'ctrl-psx-square',
    L: 'ctrl-psx-l1', R: 'ctrl-psx-r1', L2: 'ctrl-psx-l2', R2: 'ctrl-psx-r2',
    START: 'ctrl-psx-start', SELECT: 'ctrl-psx-select', null: 'ctrl-act-null'
  }
}

const getEmuActionLabelKey = (systemId, actionValue) => {
  const map = SYSTEM_EMU_LABEL_KEYS[systemId]
  if (map && map[actionValue]) {
    return map[actionValue]
  }
  const opt = EMU_ACTION_OPTIONS.find((o) => o.value === actionValue)
  return opt ? opt.textKey : 'ctrl-act-null'
}

const CONTROL_SYSTEMS = [
  {id: 'gb', label: 'Game Boy'},
  {id: 'gbc', label: 'Game Boy Color'},
  {id: 'gba', label: 'GBA'},
  {id: 'nes', label: 'NES'},
  {id: 'md', label: 'Megadrive'},
  {id: 'snes', label: 'SNES'},
  {id: 'psx', label: 'PlayStation'},
]

const identityMap = () => ({
  UP: 'UP', DOWN: 'DOWN', LEFT: 'LEFT', RIGHT: 'RIGHT',
  A: 'A', B: 'B', X: 'X', Y: 'Y',
  L1: 'L', R1: 'R', L2: 'L2', R2: 'R2',
  START: 'START', SELECT: 'SELECT'
})

const DEFAULT_CONTROLS = {
  default: identityMap(),
  systems: {
    gb: {...identityMap(), A: 'B', B: 'A', X: 'null', Y: 'null', L1: 'null', R1: 'null', L2: 'null', R2: 'null'},
    gbc: {...identityMap(), A: 'B', B: 'A', X: 'null', Y: 'null', L1: 'null', R1: 'null', L2: 'null', R2: 'null'},
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

const DEFAULT_GAME_UNLOCK_COMBO = ['SELECT', 'SELECT', 'SELECT']

const VALID_UNLOCK_BUTTONS = new Set(PHYSICAL_BUTTONS.map((b) => b.id))

const normalizeGameUnlockCombo = (raw) => {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [...DEFAULT_GAME_UNLOCK_COMBO]
  }
  const cleaned = raw
    .map((v) => (typeof v === 'string' ? v.trim().toUpperCase() : ''))
    .filter((v) => VALID_UNLOCK_BUTTONS.has(v))
    .slice(0, 8)
  return cleaned.length ? cleaned : [...DEFAULT_GAME_UNLOCK_COMBO]
}

export {
  PHYSICAL_BUTTONS,
  EMU_ACTION_OPTIONS,
  SYSTEM_EMU_LABEL_KEYS,
  getEmuActionLabelKey,
  CONTROL_SYSTEMS,
  DEFAULT_CONTROLS,
  mergeControls,
  identityMap,
  DEFAULT_GAME_UNLOCK_COMBO,
  normalizeGameUnlockCombo
}
