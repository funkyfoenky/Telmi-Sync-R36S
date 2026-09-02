import {useCallback, useEffect, useRef, useState} from 'react'
import {useLocale} from '../../../../Components/Locale/LocaleHooks.js'
import {useModal} from '../../../../Components/Modal/ModalHooks.js'
import {useElectronListener} from '../../../../Components/Electron/Hooks/UseElectronEvent.js'

import ModalLayoutPadded from '../../../../Components/Modal/ModalLayoutPadded.js'
import ModalTitle from '../../../../Components/Modal/ModalTitle.js'
import Form from '../../../../Components/Form/Form.js'
import ModalContent from '../../../../Components/Modal/ModalContent.js'
import InputSelect from '../../../../Components/Form/Input/InputSelect.js'
import ButtonsContainer from '../../../../Components/Buttons/ButtonsContainer.js'
import ButtonIconTextSDCard from '../../../../Components/Buttons/IconsTexts/ButtonIconTextSDCard.js'
import ButtonIconRedo from '../../../../Components/Buttons/Icons/ButtonIconRedo.js'
import ModalDialogConfirm from '../../../../Components/Modal/Templates/ModalDialogs/ModalDialogConfirm.js'
import ModalElectronTaskVisualizer from '../../../../Components/Electron/Modal/ModalElectronTaskVisualizer.js'

const {ipcRenderer} = window.require('electron')

const toGigabytes = (bytes) => (bytes / 1073741824).toFixed(2)

function ModalTelmiOSContentSdForm({onClose}) {
  const
    {getLocale} = useLocale(),
    {addModal, rmModal} = useModal(),
    [drives, setDrives] = useState([]),
    inputRefDrive = useRef(),
    refreshDrives = useCallback(
      () => {
        ipcRenderer.send('telmios-disklist-content')
      },
      []
    )

  useElectronListener(
    'telmios-disklist-content-data',
    (data) => {
      setDrives(Array.isArray(data) ? data : [])
    },
    []
  )

  useEffect(() => {
    refreshDrives()
  }, [refreshDrives])

  return <ModalLayoutPadded isClosable={true} onClose={onClose}>
    <ModalTitle>{getLocale('telmios-content-sd-title')} :</ModalTitle>
    <Form>{
      (validation) => {
        return <>
          <ModalContent>
            <p>{getLocale('telmios-content-sd-hint')}</p>
            <div style={{display: 'flex', alignItems: 'flex-end', gap: '0.75rem'}}>
              <div style={{flex: 1}}>
                <InputSelect label={getLocale('telmios-content-sd-select')}
                             key={'telmios-content-sd-drive-' + drives.map((d) => d.drive).join('-')}
                             id="telmios-content-sd-drive"
                             required={true}
                             options={[
                               {value: '', text: ''},
                               ...drives.map((drive, keyDrive) => ({
                                 value: keyDrive,
                                 text: drive.drive + ' ' + drive.name + ' (' + toGigabytes(drive.size) + getLocale('gb') + ')'
                               }))
                             ]}
                             ref={inputRefDrive}/>
              </div>
              <ButtonIconRedo title={getLocale('telmios-content-sd-refresh')}
                              onClick={refreshDrives}/>
            </div>
            {
              !drives.length &&
              <p>{getLocale('telmios-content-sd-empty')}</p>
            }
          </ModalContent>
          <ButtonsContainer>
            <ButtonIconTextSDCard text={getLocale('telmios-content-sd-prepare')}
                                  rounded={true}
                                  onClick={() => {
                                    validation(
                                      [inputRefDrive],
                                      (values) => {
                                        const selectedDrive = drives[values[0]]
                                        if (!selectedDrive) {
                                          return
                                        }
                                        const driveLabel = '<strong>' + selectedDrive.drive + ' (' + selectedDrive.name + ')</strong>'
                                        addModal((key) => {
                                          const confirmModal = <ModalDialogConfirm
                                            key={key}
                                            title={getLocale('telmios-content-sd-alert', selectedDrive.drive)}
                                            message={getLocale('telmios-content-sd-alert-message', driveLabel)}
                                            onConfirm={() => {
                                              addModal((taskKey) => {
                                                const taskModal = <ModalElectronTaskVisualizer
                                                  key={taskKey}
                                                  taskName="telmios-prepare-content"
                                                  dataSent={[selectedDrive]}
                                                  onClose={() => rmModal(taskModal)}/>
                                                return taskModal
                                              })
                                            }}
                                            onClose={() => rmModal(confirmModal)}/>
                                          return confirmModal
                                        })
                                        onClose()
                                      }
                                    )
                                  }}/>
          </ButtonsContainer>
        </>
      }
    }</Form>
  </ModalLayoutPadded>
}

export default ModalTelmiOSContentSdForm
