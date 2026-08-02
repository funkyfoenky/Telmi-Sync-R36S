import {getTelmiSyncParams} from './TelmiSyncParams.js'
import {
  DEVICE_MODE_MIYOO,
  DEVICE_MODE_R36S,
  DEVICE_MODE_SWITCH,
  SWITCH_MODE_ENABLED,
  normalizeDeviceMode
} from './DeviceModeCore.js'

const getDeviceMode = () => normalizeDeviceMode(getTelmiSyncParams())

const isSwitchMode = () => getDeviceMode() === DEVICE_MODE_SWITCH
const isR36sMode = () => getDeviceMode() === DEVICE_MODE_R36S
const isMiyooMode = () => getDeviceMode() === DEVICE_MODE_MIYOO

export {
  DEVICE_MODE_MIYOO,
  DEVICE_MODE_R36S,
  DEVICE_MODE_SWITCH,
  SWITCH_MODE_ENABLED,
  normalizeDeviceMode,
  getDeviceMode,
  isSwitchMode,
  isR36sMode,
  isMiyooMode
}
