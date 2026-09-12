import {useCallback} from 'react'
import {useLocale} from '../../../Components/Locale/LocaleHooks.js'
import {useModal} from '../../../Components/Modal/ModalHooks.js'
import {useTelmiSyncParams} from '../../../Components/TelmiSyncParams/TelmiSyncParamsHooks.js'

import ModalTelmiOSCardMakerForm from './TelmiOSCardMaker/ModalTelmiOSCardMakerForm.js'

import styles from '../Synchronize.module.scss'


function TelmiOSNotDetected() {
  const
    {getLocale} = useLocale(),
    {addModal, rmModal} = useModal(),
    {params} = useTelmiSyncParams(),
    isR36s = params && params.deviceMode === 'r36s',
    openCardMaker = useCallback((initialLayout) => {
      addModal((key) => {
        const modal = <ModalTelmiOSCardMakerForm key={key}
                                                 initialLayout={initialLayout}
                                                 onClose={() => rmModal(modal)}/>
        return modal
      })
    }, [addModal, rmModal]),
    onCreateCard = useCallback(() => openCardMaker(), [openCardMaker]),
    onExpandCard = useCallback(() => openCardMaker('expand'), [openCardMaker])


  return <div className={styles.telmiOSInactive}>
    <h2 className={styles.telmiOSTitle}>
        <span className={styles.telmiOSTitleText}>
          {getLocale('telmios-not-detected')}
        </span>
    </h2>
    <div className={styles.telmiOSInactiveArea}>
      <div className={styles.telmiOSInactiveActions}>
        <button className={styles.telmiOSNewCard} onClick={onCreateCard}>
          <i className={styles.telmiOSNewCardIcon}>{'\uf7c2'}</i>
          <span className={styles.telmiOSNewCardText}>{getLocale('telmios-cardmaker-create')}</span>
        </button>
        {
          isR36s &&
          <button className={styles.telmiOSExpandLink} onClick={onExpandCard}>
            {getLocale('telmios-cardmaker-expand-create')}
          </button>
        }
      </div>
    </div>
  </div>
}

export default TelmiOSNotDetected
