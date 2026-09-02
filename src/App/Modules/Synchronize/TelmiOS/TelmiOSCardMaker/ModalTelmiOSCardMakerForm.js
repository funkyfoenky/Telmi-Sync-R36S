import {useRef, useState} from 'react'
import {useLocale} from '../../../../Components/Locale/LocaleHooks.js'
import {useModal} from '../../../../Components/Modal/ModalHooks.js'
import {useTelmiSyncParams} from '../../../../Components/TelmiSyncParams/TelmiSyncParamsHooks.js'
import {useElectronEmitter, useElectronListener} from '../../../../Components/Electron/Hooks/UseElectronEvent.js'

import ModalLayoutPadded from '../../../../Components/Modal/ModalLayoutPadded.js'
import ModalTitle from '../../../../Components/Modal/ModalTitle.js'
import Form from '../../../../Components/Form/Form.js'
import ModalContent from '../../../../Components/Modal/ModalContent.js'
import InputSelect from '../../../../Components/Form/Input/InputSelect.js'
import ButtonsContainer from '../../../../Components/Buttons/ButtonsContainer.js'
import ButtonIconTextSDCard from '../../../../Components/Buttons/IconsTexts/ButtonIconTextSDCard.js'
import ModalTelmiOSCardMakerConfirm from './ModalTelmiOSCardMakerConfirm.js'

const toGigabytes = (bytes) => (bytes / 1073741824).toFixed(2)

const formatDriveOption = (drive, getLocale) => {
  const letter = (drive.drive || '').replace(/\\$/, '').replace(/:$/, '')
  const label = letter
    ? letter + ':'
    : getLocale('telmios-cardmaker-physical-disk', drive.diskNumber)
  return label + ' — ' + drive.name + ' (' + toGigabytes(drive.size) + getLocale('gb') + ')'
}

function ModalTelmiOSCardMakerForm({onClose}) {
  const
    {getLocale} = useLocale(),
    {addModal, rmModal} = useModal(),
    {params} = useTelmiSyncParams(),
    isR36s = params && params.deviceMode === 'r36s',
    [drives, setDrives] = useState([]),
    [imageProfile, setImageProfile] = useState('v20'),
    [sdLayout, setSdLayout] = useState('mono'),
    inputRefProfile = useRef(),
    inputRefDrive = useRef(),
    inputRefLayout = useRef()

  useElectronEmitter('telmios-disklist', [])
  useElectronListener(
    'telmios-disklist-data',
    (data) => {
      setDrives(data)
    },
    []
  )

  return <ModalLayoutPadded isClosable={true}
                            onClose={onClose}>
    <ModalTitle>{getLocale('telmios-cardmaker-create')} :</ModalTitle>
    <Form>{
      (validation) => {
        return <>
          <ModalContent>
            {
              isR36s &&
              <InputSelect label={getLocale('telmios-cardmaker-image-profile')}
                           key="telmios-cardmaker-image-profile"
                           id="telmios-cardmaker-image-profile"
                           required={true}
                           defaultValue={imageProfile}
                           options={[
                             {value: 'v20', text: getLocale('telmios-cardmaker-image-v20')},
                             {value: 'other', text: getLocale('telmios-cardmaker-image-other')}
                           ]}
                           onChange={(v) => setImageProfile(v)}
                           ref={inputRefProfile}/>
            }
            {
              isR36s &&
              <p>{getLocale(imageProfile === 'other' ? 'telmios-cardmaker-image-other-hint' : 'telmios-cardmaker-image-v20-hint')}</p>
            }
            {
              isR36s &&
              <InputSelect label={getLocale('telmios-cardmaker-sd-layout')}
                           key="telmios-cardmaker-sd-layout"
                           id="telmios-cardmaker-sd-layout"
                           required={true}
                           defaultValue={sdLayout}
                           options={[
                             {value: 'mono', text: getLocale('telmios-cardmaker-sd-mono')},
                             {value: 'multi', text: getLocale('telmios-cardmaker-sd-multi')}
                           ]}
                           onChange={(v) => setSdLayout(v)}
                           ref={inputRefLayout}/>
            }
            {
              isR36s &&
              <p>{getLocale(sdLayout === 'multi' ? 'telmios-cardmaker-sd-multi-hint' : 'telmios-cardmaker-sd-mono-hint')}</p>
            }
            <InputSelect label={getLocale(isR36s && sdLayout === 'multi' ? 'telmios-cardmaker-select-os' : 'telmios-cardmaker-select')}
                         key="telmios-cardmaker-drive"
                         id="telmios-cardmaker-drive"
                         required={true}
                         options={[
                           {value: '', text: ''},
                           ...drives.map((drive, keyDrive) => ({
                             value: keyDrive,
                             text: formatDriveOption(drive, getLocale)
                           }))
                         ]}
                         ref={inputRefDrive}/>
          </ModalContent>
          <ButtonsContainer>
            <ButtonIconTextSDCard text={getLocale('make')}
                                  rounded={true}
                                  onClick={() => {
                                    const refs = isR36s ? [inputRefProfile, inputRefLayout, inputRefDrive] : [inputRefDrive]
                                    validation(
                                      refs,
                                      (values) => {
                                        const profile = isR36s ? values[0] : 'v20'
                                        const layout = isR36s ? values[1] : 'mono'
                                        const driveIndex = isR36s ? values[2] : values[0]
                                        const selectedDrive = {
                                          ...drives[driveIndex],
                                          sdLayout: layout === 'multi' ? 'multi' : 'mono',
                                          imageProfile: profile === 'other' ? 'other' : 'v20'
                                        }
                                        addModal((key) => {
                                          const modal = <ModalTelmiOSCardMakerConfirm key={key}
                                                                                      drive={selectedDrive}
                                                                                      onClose={() => rmModal(modal)}/>
                                          return modal
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

export default ModalTelmiOSCardMakerForm
