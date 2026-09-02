import { useEffect, useMemo, useRef, useState } from 'react'
import { useElectronEmitter, useElectronListener } from '../Electron/Hooks/UseElectronEvent.js'
import { useTelmiSyncParams } from '../TelmiSyncParams/TelmiSyncParamsHooks.js'
import { useModal } from '../Modal/ModalHooks.js'
import { useLocale } from '../Locale/LocaleHooks.js'
import ModalElectronTaskVisualizer from '../Electron/Modal/ModalElectronTaskVisualizer.js'
import ModalDialogAlert from '../Modal/Templates/ModalDialogs/ModalDialogAlert.js'
import TelmiOSContext from './TelmiOSContext.js'

const {ipcRenderer} = window.require('electron')

const telmiOSToString = (telmiOS) => {
  return telmiOS === null ?
    '' :
    telmiOS.drive + '_' + telmiOS.telmiOS.label + '-v' + telmiOS.telmiOS.version.major + '.' + telmiOS.telmiOS.version.minor + '.' + telmiOS.telmiOS.version.fix
}

function TelmiOSProvider ({children}) {
  const
    {params} = useTelmiSyncParams(),
    {getLocale} = useLocale(),
    [telmiOS, setTelmiOS] = useState(null),
    [diskusage, setDiskusage] = useState(null),
    [stories, setStories] = useState([]),
    [music, setMusic] = useState([]),
    [games, setGames] = useState([]),
    {addModal, rmModal} = useModal(),
    deviceMode = params !== null ? (params.deviceMode || 'miyoo') : null,
    isR36s = deviceMode === 'r36s',
    isSwitch = deviceMode === 'switch',
    prevTelmiKeyRef = useRef(''),
    prevModeRef = useRef(null),
    data = useMemo(() => ({...telmiOS, diskusage, stories, music, games}), [telmiOS, diskusage, stories, music, games])

  useElectronListener(
    'telmios-data',
    (t) => {
      if (telmiOSToString(t) !== telmiOSToString(telmiOS)) {
        setTelmiOS(t)
        if(t === null) {
          setDiskusage(null)
          setStories([])
          setMusic([])
          setGames([])
        }
      }
    },
    [setTelmiOS, telmiOS]
  )

  useElectronListener('telmios-diskusage-data', (du) => setDiskusage(du), [setDiskusage])
  useElectronEmitter('telmios-diskusage', [telmiOS])

  useEffect(
    () => {
      const key = telmiOSToString(telmiOS)
      const keyChanged = key !== prevTelmiKeyRef.current
      const modeChanged = deviceMode !== prevModeRef.current
      prevTelmiKeyRef.current = key
      prevModeRef.current = deviceMode

      if (telmiOS === null || params === null || isSwitch || (!keyChanged && !modeChanged)) {
        return
      }

      // SD OS seule (BOOT) : pas de check firmware / pas de sync Stories
      if (telmiOS.osOnly) {
        return
      }

      // R36S : check silencieuse (popup si outdated via telmios-update-outdated)
      if (isR36s) {
        ipcRenderer.send('telmios-update', telmiOS)
        return
      }

      // Miyoo : mise à jour Onion automatique
      addModal((k) => {
        const modal = <ModalElectronTaskVisualizer key={k}
                                                   taskName="telmios-update"
                                                   dataSent={[telmiOS]}
                                                   onClose={() => rmModal(modal)}/>
        return modal
      })
    },
    [telmiOS, params, deviceMode, isR36s, isSwitch, addModal, rmModal]
  )

  useElectronListener(
    'telmios-update-outdated',
    () => {
      addModal((key) => {
        const modal = <ModalDialogAlert key={key}
                                        title={getLocale('telmios-outdated-title')}
                                        message={getLocale('telmios-outdated')}
                                        onClose={() => rmModal(modal)}/>
        return modal
      })
    },
    [addModal, rmModal, getLocale]
  )

  useElectronListener('telmios-stories-data', (telmiOSStories) => setStories(telmiOSStories), [setStories])
  useElectronEmitter('telmios-stories-get', [telmiOS && !telmiOS.osOnly ? telmiOS : null])

  useElectronListener('telmios-musics-data', (telmiOSMusics) => setMusic(telmiOSMusics), [setMusic])
  useElectronEmitter('telmios-musics-get', [telmiOS && !telmiOS.osOnly ? telmiOS : null])

  useElectronListener('telmios-games-data', (telmiOSGames) => setGames(telmiOSGames), [setGames])
  // Jeux appareil : uniquement en mode R36S (évite de créer Games/ sur Miyoo / BOOT)
  useEffect(
    () => {
      if (!isR36s || telmiOS === null || telmiOS.osOnly) {
        setGames([])
        return
      }
      ipcRenderer.send('telmios-games-get', telmiOS)
    },
    [isR36s, telmiOS]
  )

  return <TelmiOSContext.Provider value={data}>{children}</TelmiOSContext.Provider>
}

export default TelmiOSProvider
