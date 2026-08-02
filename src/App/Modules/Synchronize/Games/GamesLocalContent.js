import {useCallback, useMemo} from 'react'
import {useLocalGames} from '../../../Components/LocalGames/LocalGamesHooks.js'
import {useTelmiOS} from '../../../Components/TelmiOS/TelmiOSHooks.js'
import GamesTable from './GamesTable.js'

const {ipcRenderer} = window.require('electron')

function GamesLocalContent({setSelectedGames, selectedGames}) {
  const
    localGames = useLocalGames(),
    {games: telmiOSGames} = useTelmiOS(),

    games = useMemo(
      () => {
        const onDevice = (telmiOSGames || []).map((g) => g.id)
        return localGames.map((g) => ({...g, cellDisabled: onDevice.includes(g.id)}))
      },
      [localGames, telmiOSGames]
    ),

    onEditCover = useCallback(
      (game) => {
        if (game.newImage) {
          ipcRenderer.send('local-games-cover', game, game.newImage)
        }
      },
      []
    ),
    onDelete = useCallback((ids) => ipcRenderer.send('local-games-delete', ids), [])

  return <GamesTable id="games-local"
                     games={games}
                     onEditCover={onEditCover}
                     onDelete={onDelete}
                     setSelectedGames={setSelectedGames}
                     selectedGames={selectedGames}/>
}

export default GamesLocalContent
