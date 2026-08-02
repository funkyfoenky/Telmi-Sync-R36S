import {useCallback, useState} from 'react'
import {useLocale} from '../../../Components/Locale/LocaleHooks.js'
import {useModal} from '../../../Components/Modal/ModalHooks.js'
import {useTelmiOS} from '../../../Components/TelmiOS/TelmiOSHooks.js'
import GamesTelmiOSContent from './GamesTelmiOSContent.js'
import GamesLocalContent from './GamesLocalContent.js'
import ModalGameControlsForm from './ModalGameControlsForm.js'
import ModalGameUnlockForm from './ModalGameUnlockForm.js'
import ButtonIconTextGamepad from '../../../Components/Buttons/IconsTexts/ButtonIconTextGamepad.js'
import styles from './Games.module.scss'

const {ipcRenderer} = window.require('electron')

function GamesContent() {
  const
    {getLocale} = useLocale(),
    {addModal, rmModal} = useModal(),
    telmiOS = useTelmiOS(),
    [selectedLocalGames, setSelectedLocalGames] = useState([]),

    saveParameters = useCallback(
      (params) => {
        if (!telmiOS || !telmiOS.telmiOS) {
          return
        }
        telmiOS.telmiOS.parameters = params
        ipcRenderer.send('telmios-save-parameters', telmiOS)
      },
      [telmiOS]
    ),

    onOpenControls = useCallback(
      () => {
        if (!telmiOS || !telmiOS.drive || !telmiOS.telmiOS) {
          window.alert(getLocale('games-controls-need-device'))
          return
        }
        addModal((key) => {
          const modal = <ModalGameControlsForm key={key}
                                               parameters={telmiOS.telmiOS.parameters || {}}
                                               onValidate={saveParameters}
                                               onClose={() => rmModal(modal)}/>
          return modal
        })
      },
      [telmiOS, addModal, rmModal, getLocale, saveParameters]
    ),

    onOpenUnlock = useCallback(
      () => {
        if (!telmiOS || !telmiOS.drive || !telmiOS.telmiOS) {
          window.alert(getLocale('games-controls-need-device'))
          return
        }
        addModal((key) => {
          const modal = <ModalGameUnlockForm key={key}
                                             parameters={telmiOS.telmiOS.parameters || {}}
                                             onValidate={saveParameters}
                                             onClose={() => rmModal(modal)}/>
          return modal
        })
      },
      [telmiOS, addModal, rmModal, getLocale, saveParameters]
    )

  return <div className={styles.wrapper}>
    <div className={styles.toolbar}>
      <ButtonIconTextGamepad text={getLocale('games-unlock-combo')}
                             rounded={true}
                             onClick={onOpenUnlock}/>
      <ButtonIconTextGamepad text={getLocale('games-controls')}
                             rounded={true}
                             onClick={onOpenControls}/>
    </div>
    <div className={styles.panels}>
      <GamesTelmiOSContent setSelectedLocalGames={setSelectedLocalGames}
                           selectedLocalGames={selectedLocalGames}/>
      <GamesLocalContent setSelectedGames={setSelectedLocalGames}
                         selectedGames={selectedLocalGames}/>
    </div>
  </div>
}

export default GamesContent
