import {useLocale} from '../../../Components/Locale/LocaleHooks.js'
import ModalDialogConfirm from '../../../Components/Modal/Templates/ModalDialogs/ModalDialogConfirm.js'

function ModalGamesDeleteConfirm(props) {
  const {getLocale} = useLocale()
  return <ModalDialogConfirm {...props}
                             title={getLocale('games-delete')}
                             message={getLocale('games-delete-confirm')}/>
}

export default ModalGamesDeleteConfirm
