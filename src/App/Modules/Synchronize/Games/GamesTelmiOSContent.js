import {useCallback, useState} from 'react'
import {useTelmiOS} from '../../../Components/TelmiOS/TelmiOSHooks.js'
import {useModal} from '../../../Components/Modal/ModalHooks.js'

import TelmiOSLayout from '../TelmiOS/TelmiOSLayout.js'
import GamesTable from './GamesTable.js'
import ModalGameTransfer from './ModalGameTransfer.js'

import styles from '../Synchronize.module.scss'

const {ipcRenderer} = window.require('electron')

function GamesTelmiOSContent({selectedLocalGames, setSelectedLocalGames}) {
  const
    {addModal, rmModal} = useModal(),
    telmiOS = useTelmiOS(),
    [selectedTelmiOSGames, setSelectedTelmiOSGames] = useState([]),
    onDelete = useCallback(
      (ids) => ipcRenderer.send('telmios-games-delete', telmiOS, ids),
      [telmiOS]
    ),
    onEditCover = useCallback(
      (game) => {
        if (game.newImage) {
          ipcRenderer.send('telmios-games-cover', telmiOS, game, game.newImage)
        }
      },
      [telmiOS]
    ),
    onTransfer = useCallback(
      () => {
        addModal((key) => {
          const modal = <ModalGameTransfer key={key}
                                           games={selectedLocalGames}
                                           telmiOS={telmiOS}
                                           onClose={() => {
                                             rmModal(modal)
                                             setSelectedLocalGames([])
                                           }}/>
          return modal
        })
      },
      [telmiOS, selectedLocalGames, setSelectedLocalGames, addModal, rmModal]
    )

  return <TelmiOSLayout telmiOS={telmiOS}
                        onTransfer={selectedLocalGames.length ? onTransfer : undefined}>
    <GamesTable id="games-telmios"
                className={styles.telmiOSTable}
                games={telmiOS.games || []}
                onEditCover={onEditCover}
                onDelete={onDelete}
                selectedGames={selectedTelmiOSGames}
                setSelectedGames={setSelectedTelmiOSGames}/>
  </TelmiOSLayout>
}

export default GamesTelmiOSContent
