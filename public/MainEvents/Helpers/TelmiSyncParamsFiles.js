import * as fs from 'fs'
import {normalizeDeviceMode, DEVICE_MODE_MIYOO} from './DeviceModeCore.js'

const
  saveTelmiSyncParamsContent = (parametersPath, params) => {
    const deviceMode = normalizeDeviceMode(params)
    const normalized = {
      ...params,
      deviceMode,
      // Miroir booléen pour compat (true seulement si switch réellement actif)
      switchMode: deviceMode === 'switch'
    }
    fs.writeFileSync(parametersPath, JSON.stringify(normalized))
  },
  defaultTelmiSyncParams = () => ({
    microphone: null,
    piper: {voice: 'fr_FR-beatrice', speaker: 0},
    deviceMode: DEVICE_MODE_MIYOO,
    switchMode: false,
    telmiR36Path: null
  }),
  getTelmiSyncParamsContent = (parametersPath) => {
    const base = defaultTelmiSyncParams()
    if (fs.existsSync(parametersPath)) {
      const loaded = {...base, ...JSON.parse(fs.readFileSync(parametersPath))}
      loaded.deviceMode = normalizeDeviceMode(loaded)
      loaded.switchMode = loaded.deviceMode === 'switch'
      return loaded
    }
    return base
  }

export {getTelmiSyncParamsContent, saveTelmiSyncParamsContent}
