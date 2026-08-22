import {useRef, useState} from 'react'
import {useLocale} from '../../../Components/Locale/LocaleHooks.js'
import {useElectronEmitter, useElectronListener} from '../../../Components/Electron/Hooks/UseElectronEvent.js'
import ModalLayoutPadded from '../../../Components/Modal/ModalLayoutPadded.js'
import ModalTitle from '../../../Components/Modal/ModalTitle.js'
import ModalContent from '../../../Components/Modal/ModalContent.js'
import Form from '../../../Components/Form/Form.js'
import InputSelect from '../../../Components/Form/Input/InputSelect.js'
import ButtonsContainer from '../../../Components/Buttons/ButtonsContainer.js'
import ButtonIconTextCheck from '../../../Components/Buttons/IconsTexts/ButtonIconTextCheck.js'

const {ipcRenderer} = window.require('electron')

function ModalTelmiOSRevForm({telmiOS, onClose}) {
  const
    {getLocale} = useLocale(),
    inputRef = useRef(),
    [catalog, setCatalog] = useState(null),
    [error, setError] = useState(null),
    [applying, setApplying] = useState(false),
    [applyMsg, setApplyMsg] = useState(null)

  useElectronEmitter('telmios-rev-get', [telmiOS])
  useElectronListener(
    'telmios-rev-data',
    (data) => {
      if (!data) {
        setError('r36s-boot-not-found')
        return
      }
      if (data.error) {
        setError(data.error)
        setCatalog(null)
        return
      }
      setError(null)
      setCatalog(data)
    },
    []
  )
  useElectronListener(
    'telmios-rev-apply-result',
    (result) => {
      setApplying(false)
      if (!result || !result.ok) {
        setApplyMsg(getLocale((result && result.error) || 'r36s-rev-apply-failed'))
        return
      }
      setApplyMsg(getLocale('telmios-rev-apply-ok', result.rev.id))
      setCatalog((prev) => prev ? {...prev, current: result.rev.id} : prev)
    },
    [getLocale]
  )

  const options = (() => {
    if (!catalog || !catalog.revs) {
      return [{value: '', text: ''}]
    }
    return catalog.revs.map((r) => {
      const marks = []
      if (catalog.current && r.id === catalog.current) {
        marks.push(getLocale('telmios-rev-current'))
      }
      if (catalog.default && r.id === catalog.default) {
        marks.push(getLocale('telmios-rev-default'))
      }
      const suffix = marks.length ? ' (' + marks.join(', ') + ')' : ''
      return {
        value: r.id,
        text: r.id + ' — ' + (r.label || r.id) + suffix
      }
    })
  })()

  const defaultValue = (catalog && (catalog.current || catalog.default)) || (options[0] && options[0].value) || ''

  return <ModalLayoutPadded isClosable={true} onClose={onClose}>
    <ModalTitle>{getLocale('telmios-rev-title')} :</ModalTitle>
    <Form>{
      (validation) => {
        return <>
          <ModalContent>
            {
              error &&
              <p>{getLocale(error)}</p>
            }
            {
              !error && !catalog &&
              <p>{getLocale('please-wait')}...</p>
            }
            {
              catalog &&
              <>
                <p>{getLocale('telmios-rev-hint')}</p>
                <InputSelect label={getLocale('telmios-rev-select')}
                             key={'telmios-rev-' + defaultValue + '-' + (catalog.current || '')}
                             id="telmios-rev-select"
                             required={true}
                             defaultValue={defaultValue}
                             options={options}
                             ref={inputRef}/>
                {
                  applyMsg &&
                  <p>{applyMsg}</p>
                }
              </>
            }
          </ModalContent>
          {
            catalog && !error &&
            <ButtonsContainer>
              <ButtonIconTextCheck text={getLocale('telmios-rev-apply')}
                                   rounded={true}
                                   disabled={applying}
                                   onClick={() => {
                                     validation(
                                       [inputRef],
                                       (values) => {
                                         const revId = values[0]
                                         if (!revId) {
                                           return
                                         }
                                         setApplying(true)
                                         setApplyMsg(null)
                                         ipcRenderer.send('telmios-rev-apply', telmiOS, revId)
                                       }
                                     )
                                   }}/>
            </ButtonsContainer>
          }
        </>
      }
    }</Form>
  </ModalLayoutPadded>
}

export default ModalTelmiOSRevForm
