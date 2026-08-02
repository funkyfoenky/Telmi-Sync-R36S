import {useCallback, useMemo, useState} from 'react'
import {useLocale} from '../../../Components/Locale/LocaleHooks.js'
import ModalLayoutPadded from '../../../Components/Modal/ModalLayoutPadded.js'
import ModalTitle from '../../../Components/Modal/ModalTitle.js'
import ModalContent from '../../../Components/Modal/ModalContent.js'
import ButtonsContainer from '../../../Components/Buttons/ButtonsContainer.js'
import ButtonIconTextCheck from '../../../Components/Buttons/IconsTexts/ButtonIconTextCheck.js'
import InputSelect from '../../../Components/Form/Input/InputSelect.js'
import {
  CONTROL_SYSTEMS,
  EMU_ACTION_OPTIONS,
  getEmuActionLabelKey,
  mergeControls,
  PHYSICAL_BUTTONS
} from './GameControlsDefaults.js'
import styles from './Games.module.scss'

function ModalGameControlsForm({parameters, onValidate, onClose}) {
  const
    {getLocale} = useLocale(),
    [systemId, setSystemId] = useState('nes'),
    [controls, setControls] = useState(() => mergeControls(parameters && parameters.controls)),

    actionOptions = useMemo(
      () => EMU_ACTION_OPTIONS.map((o) => ({
        value: o.value,
        text: getLocale(getEmuActionLabelKey(systemId, o.value))
      })),
      [getLocale, systemId]
    ),

    systemMap = controls.systems[systemId] || {},

    onChangeMapping = useCallback(
      (physId, action) => {
        setControls((prev) => ({
          ...prev,
          systems: {
            ...prev.systems,
            [systemId]: {
              ...prev.systems[systemId],
              [physId]: action
            }
          }
        }))
      },
      [systemId]
    ),

    onResetSystem = useCallback(
      () => {
        const merged = mergeControls(null)
        setControls((prev) => ({
          ...prev,
          systems: {
            ...prev.systems,
            [systemId]: {...merged.systems[systemId]}
          }
        }))
      },
      [systemId]
    )

  return <ModalLayoutPadded isClosable={true} onClose={onClose}>
    <ModalTitle>{getLocale('games-controls')} :</ModalTitle>
    <ModalContent>
      <p className={styles.controlsHelp}
         dangerouslySetInnerHTML={{__html: getLocale('games-controls-help')}}/>
      <div className={styles.systemTabs}>
        {CONTROL_SYSTEMS.map((s) => (
          <button key={s.id}
                  type="button"
                  className={[styles.systemTab, systemId === s.id ? styles.systemTabActive : ''].join(' ')}
                  onClick={() => setSystemId(s.id)}>
            {s.label}
          </button>
        ))}
      </div>
      <div className={styles.mappingGrid}>
        {PHYSICAL_BUTTONS.map((btn) => (
          <InputSelect key={'ctrl-' + systemId + '-' + btn.id + '-' + (systemMap[btn.id] || 'null')}
                       id={'ctrl-' + systemId + '-' + btn.id}
                       label={getLocale(btn.labelKey)}
                       options={actionOptions}
                       defaultValue={systemMap[btn.id] || 'null'}
                       onChange={(v) => onChangeMapping(btn.id, v)}/>
        ))}
      </div>
      <button type="button" className={styles.resetBtn} onClick={onResetSystem}>
        {getLocale('games-controls-reset')}
      </button>
    </ModalContent>
    <ButtonsContainer>
      <ButtonIconTextCheck text={getLocale('save')}
                           rounded={true}
                           onClick={() => {
                             onValidate({
                               ...parameters,
                               controls
                             })
                             onClose()
                           }}/>
    </ButtonsContainer>
  </ModalLayoutPadded>
}

export default ModalGameControlsForm
