import {useLocale} from '../../../Components/Locale/LocaleHooks.js'
import ModalDialogConfirm from '../../../Components/Modal/Templates/ModalDialogs/ModalDialogConfirm.js'

function ModalGameDeleteConfirm(props) {
  const {getLocale} = useLocale()
  return <ModalDialogConfirm {...props}
                             title={getLocale('game-delete')}
                             message={getLocale('game-delete-confirm', props.game.title)}/>
}

export default ModalGameDeleteConfirm
