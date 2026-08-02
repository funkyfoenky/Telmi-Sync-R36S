import {useContext} from 'react'
import LocalGamesContext from './LocalGamesContext.js'

const useLocalGames = () => useContext(LocalGamesContext).games

export {useLocalGames}
