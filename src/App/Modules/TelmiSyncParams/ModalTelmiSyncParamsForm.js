import {useEffect, useRef, useState} from 'react'
import {useLocale} from '../../Components/Locale/LocaleHooks.js'
import {useTelmiSyncParams} from '../../Components/TelmiSyncParams/TelmiSyncParamsHooks.js'
import {useElectronEmitter, useElectronListener} from '../../Components/Electron/Hooks/UseElectronEvent.js'
import ModalLayoutPadded from '../../Components/Modal/ModalLayoutPadded.js'
import ButtonsContainer from '../../Components/Buttons/ButtonsContainer.js'
import ButtonIconTextCheck from '../../Components/Buttons/IconsTexts/ButtonIconTextCheck.js'
import InputSelect from '../../Components/Form/Input/InputSelect.js'
import InputText from '../../Components/Form/Input/InputText.js'
import ModalTitle from '../../Components/Modal/ModalTitle.js'
import ModalContent from '../../Components/Modal/ModalContent.js'
import Form from '../../Components/Form/Form.js'

function ModalTelmiSyncParamsForm({onClose}) {
  const
    {getLocale} = useLocale(),
    {params, saveParams} = useTelmiSyncParams(),
    [audioDevices, setAudioDevices] = useState([]),
    [appVersion, setAppVersion] = useState(''),
    initialMode = params?.deviceMode === 'r36s' || params?.deviceMode === 'switch'
      ? params.deviceMode
      : 'miyoo',
    [deviceMode, setDeviceMode] = useState(initialMode),
    inputRef0 = useRef(),
    inputRef1 = useRef(),
    inputRef2 = useRef(),
    inputRef3 = useRef()

  useEffect(
    () => {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          setAudioDevices(
            devices
              .filter((v) => v.kind === 'audioinput')
              .map((v) => ({value: v.deviceId, text: v.label}))
          )
        })
    },
    []
  )

  useElectronEmitter('app-version-get', [])
  useElectronListener('app-version', (data) => setAppVersion(' v' + data), [])

  return <ModalLayoutPadded isClosable={true}
                            onClose={onClose}>
    <ModalTitle>{getLocale('telmi-sync-parameters', appVersion)} :</ModalTitle>
    <Form>{
      (validation) => {
        return <>
          <ModalContent>
            <InputSelect label={getLocale('telmi-sync-device-mode')}
                         key="telmi-sync-device-mode"
                         id="telmi-sync-device-mode"
                         defaultValue={deviceMode}
                         options={[
                           {value: 'miyoo', text: getLocale('telmi-sync-device-miyoo')},
                           {value: 'r36s', text: getLocale('telmi-sync-device-r36s')},
                           {value: 'switch', text: getLocale('telmi-sync-device-switch')},
                         ]}
                         onChange={(v) => setDeviceMode(v)}
                         ref={inputRef2}/>
            {deviceMode === 'r36s' ?
              <InputText label={getLocale('telmi-sync-r36s-path')}
                         key="telmi-sync-r36s-path"
                         id="telmi-sync-r36s-path"
                         defaultValue={params?.telmiR36Path || ''}
                         placeholder={getLocale('telmi-sync-r36s-path-placeholder')}
                         ref={inputRef3}/> :
              null}
            <InputSelect label={getLocale('audio-microphone-select')}
                         key="audio-microphone-select"
                         id="audio-microphone-select"
                         defaultValue={params.microphone}
                         options={audioDevices}
                         ref={inputRef0}/>
            <InputSelect label={getLocale('audio-piper-voice')}
                         key="audio-piper-voice"
                         id="audio-piper-voice"
                         defaultValue={params.piper.voice + '/' + params.piper.speaker}
                         options={[
                           {value: 'fr_FR-beatrice/0', text: 'Béatrice'},
                           {value: 'fr_FR-dantsu/0', text: 'DantSu'},
                         ]}
                         ref={inputRef1}/>
          </ModalContent>
          <ButtonsContainer>
            <ButtonIconTextCheck text={getLocale('save')}
                                 rounded={true}
                                 onClick={() => {
                                   const refs = [inputRef0, inputRef1, inputRef2]
                                   if (deviceMode === 'r36s') {
                                     refs.push(inputRef3)
                                   }
                                   validation(
                                     refs,
                                     (values) => {
                                       const piper = values[1].split('/')
                                       const mode = values[2] === 'r36s' || values[2] === 'switch'
                                         ? values[2]
                                         : 'miyoo'
                                       const next = {
                                         ...params,
                                         piper: {voice: piper[0], speaker: piper[1]},
                                         deviceMode: mode,
                                         switchMode: mode === 'switch',
                                         telmiR36Path: mode === 'r36s' && values[3]
                                           ? String(values[3]).trim() || null
                                           : (params.telmiR36Path || null)
                                       }
                                       if (values[0] !== undefined) {
                                         next.microphone = values[0]
                                       }
                                       saveParams(next)
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

export default ModalTelmiSyncParamsForm
