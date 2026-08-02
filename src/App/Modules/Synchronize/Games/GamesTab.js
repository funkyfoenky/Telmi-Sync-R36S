import {useLocale} from '../../../Components/Locale/LocaleHooks.js'
import ButtonIconTextGamepad from '../../../Components/Buttons/IconsTexts/ButtonIconTextGamepad.js'

function GamesTab(props) {
  const {getLocale} = useLocale()
  return <ButtonIconTextGamepad {...props} text={getLocale('games')}/>
}

export default GamesTab
