import {useLocale} from '../../../../Components/Locale/LocaleHooks.js'
import {useModal} from '../../../../Components/Modal/ModalHooks.js'
import {useTelmiSyncParams} from '../../../../Components/TelmiSyncParams/TelmiSyncParamsHooks.js'

import ModalDialogConfirm from '../../../../Components/Modal/Templates/ModalDialogs/ModalDialogConfirm.js'
import ModalTelmiOSCardMakerTask from './ModalTelmiOSCardMakerTask.js'

function ModalTelmiOSCardMakerConfirm({drive, onClose}) {
  const
    {getLocale} = useLocale(),
    {params} = useTelmiSyncParams(),
    {addModal, rmModal} = useModal(),
    isR36s = params && params.deviceMode === 'r36s',
    title = isR36s
      ? getLocale('telmios-cardmaker-alert-r36s', drive.drive)
      : getLocale('telmios-cardmaker-alert', drive.drive),
    message = isR36s
      ? getLocale('telmios-cardmaker-alert-message-r36s', '<strong>' + drive.drive + ' (' + drive.name + ')</strong>')
      : getLocale('telmios-cardmaker-alert-message', '<strong>' + drive.drive + ' (' + drive.name + ')</strong>')

  return <ModalDialogConfirm title={title}
                             message={message}
                             onConfirm={() => {
                               addModal((key) => {
                                 const modal = <ModalTelmiOSCardMakerTask key={key}
                                                                          drive={drive}
                                                                          onClose={() => rmModal(modal)}/>
                                 return modal
                               })
                             }}
                             onClose={onClose}/>

}

export default ModalTelmiOSCardMakerConfirm
