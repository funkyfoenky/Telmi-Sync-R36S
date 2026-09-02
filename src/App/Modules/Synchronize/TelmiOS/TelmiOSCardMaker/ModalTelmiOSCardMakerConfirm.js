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
    isMulti = isR36s && drive.sdLayout === 'multi',
    isOther = isR36s && drive.imageProfile === 'other',
    driveLabel = '<strong>' + drive.drive + ' (' + drive.name + ')</strong>',
    title = !isR36s
      ? getLocale('telmios-cardmaker-alert', drive.drive)
      : (isMulti
        ? getLocale('telmios-cardmaker-alert-r36s-multi', drive.drive)
        : getLocale('telmios-cardmaker-alert-r36s', drive.drive)),
    message = !isR36s
      ? getLocale('telmios-cardmaker-alert-message', driveLabel)
      : (isMulti
        ? getLocale(
          isOther ? 'telmios-cardmaker-alert-message-r36s-multi-other' : 'telmios-cardmaker-alert-message-r36s-multi',
          driveLabel
        )
        : getLocale(
          isOther ? 'telmios-cardmaker-alert-message-r36s-other' : 'telmios-cardmaker-alert-message-r36s',
          driveLabel
        ))

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
