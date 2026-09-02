import * as path from 'path'
import * as fs from 'fs'
import { isSwitchMode, isR36sMode } from './DeviceMode.js'

const
  isSwitchLayout = () => isSwitchMode(),
  getPathTelmiOsParameters = (drive) => {
    return isSwitchLayout() ?
      path.join(drive, 'switch', 'Telmi', 'Saves', '.parameters') :
      path.join(drive, 'Saves', '.parameters')
  },
  getPathTelmiOsFlashLogo = (drive) => {
    return isSwitchLayout() ?
      path.join(drive, 'switch', 'Telmi', 'Saves', '.flashLogo') :
      path.join(drive, 'Saves', '.flashLogo')
  },

  readTelmiOSParameters = (telmiDevice) => {
    const paramsPath = getPathTelmiOsParameters(telmiDevice.drive)
    if (!fs.existsSync(paramsPath)) {
      telmiDevice.telmiOS.parameters = {}
      telmiDevice.telmiOS.parameters.bootSplashscreen = ''
      return telmiDevice
    }

    telmiDevice.telmiOS.parameters = JSON.parse(fs.readFileSync(paramsPath).toString('utf8'))
    const pathFlashLogo = getPathTelmiOsFlashLogo(telmiDevice.drive)
    if (fs.existsSync(pathFlashLogo)) {
      telmiDevice.telmiOS.parameters.bootSplashscreen = fs.readFileSync(pathFlashLogo).toString('utf-8')
    } else {
      telmiDevice.telmiOS.parameters.bootSplashscreen = ''
    }
    if (isR36sMode() && !telmiDevice.telmiOS.parameters.controls) {
      const controlsPath = isSwitchLayout()
        ? path.join(telmiDevice.drive, 'switch', 'Telmi', 'config', 'controls.json')
        : path.join(telmiDevice.drive, 'config', 'controls.json')
      if (fs.existsSync(controlsPath)) {
        try {
          telmiDevice.telmiOS.parameters.controls = JSON.parse(fs.readFileSync(controlsPath).toString('utf8'))
        } catch (e) {}
      }
    }
    return telmiDevice
  },

  saveTelmiOSParameters = (telmiDevice) => {
    const parameters = {...telmiDevice.telmiOS.parameters}
    delete parameters.bootSplashscreen
    // Hors R36S : ne pas persister les options jeux dans .parameters Miyoo
    if (!isR36sMode()) {
      delete parameters.controls
      delete parameters.gameUnlockCombo
    }
    const paramsPath = getPathTelmiOsParameters(telmiDevice.drive)
    fs.writeFileSync(paramsPath, JSON.stringify(parameters, null, 2))
    if (telmiDevice.telmiOS.parameters.bootSplashscreen !== '') {
      fs.writeFileSync(getPathTelmiOsFlashLogo(telmiDevice.drive), telmiDevice.telmiOS.parameters.bootSplashscreen)
    }
    if (isR36sMode() && parameters.controls && typeof parameters.controls === 'object') {
      const configDir = isSwitchLayout()
        ? path.join(telmiDevice.drive, 'switch', 'Telmi', 'config')
        : path.join(telmiDevice.drive, 'config')
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, {recursive: true})
      }
      fs.writeFileSync(
        path.join(configDir, 'controls.json'),
        JSON.stringify(parameters.controls, null, 2)
      )
    }
  }

export {readTelmiOSParameters, saveTelmiOSParameters}
