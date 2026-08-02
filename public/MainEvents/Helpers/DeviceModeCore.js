/** Modes plateforme TelmiSync : miyoo (défaut) | r36s | switch — sans dépendance Electron */
const DEVICE_MODE_MIYOO = 'miyoo'
const DEVICE_MODE_R36S = 'r36s'
const DEVICE_MODE_SWITCH = 'switch'

/** Remettre à true pour réactiver le mode Switch (chemins switch/Telmi/…) */
const SWITCH_MODE_ENABLED = false

const normalizeDeviceMode = (params) => {
  if (!params || typeof params !== 'object') {
    return DEVICE_MODE_MIYOO
  }
  if (params.deviceMode === DEVICE_MODE_R36S ||
      params.deviceMode === DEVICE_MODE_SWITCH ||
      params.deviceMode === DEVICE_MODE_MIYOO) {
    if (params.deviceMode === DEVICE_MODE_SWITCH && !SWITCH_MODE_ENABLED) {
      return DEVICE_MODE_MIYOO
    }
    return params.deviceMode
  }
  if (params.switchMode === true) {
    return SWITCH_MODE_ENABLED ? DEVICE_MODE_SWITCH : DEVICE_MODE_MIYOO
  }
  return DEVICE_MODE_MIYOO
}

export {
  DEVICE_MODE_MIYOO,
  DEVICE_MODE_R36S,
  DEVICE_MODE_SWITCH,
  SWITCH_MODE_ENABLED,
  normalizeDeviceMode
}
