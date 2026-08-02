import {useState} from 'react'
import {useElectronEmitter, useElectronListener} from '../Electron/Hooks/UseElectronEvent.js'
import LocalGamesContext from './LocalGamesContext.js'

function LocalGamesProvider({children}) {
  const [games, setGames] = useState([])

  useElectronListener('local-games-data', (g) => setGames(g), [setGames])
  useElectronEmitter('local-games-get', [])

  return <LocalGamesContext.Provider value={{games}}>{children}</LocalGamesContext.Provider>
}

export default LocalGamesProvider
