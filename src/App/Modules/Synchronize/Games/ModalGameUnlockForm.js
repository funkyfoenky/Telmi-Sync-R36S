import {useCallback, useMemo, useState} from 'react'
import {useLocale} from '../../../Components/Locale/LocaleHooks.js'
import ModalLayoutPadded from '../../../Components/Modal/ModalLayoutPadded.js'
import ModalTitle from '../../../Components/Modal/ModalTitle.js'
import ModalContent from '../../../Components/Modal/ModalContent.js'
import ButtonsContainer from '../../../Components/Buttons/ButtonsContainer.js'
import ButtonIconTextCheck from '../../../Components/Buttons/IconsTexts/ButtonIconTextCheck.js'
import InputSelect from '../../../Components/Form/Input/InputSelect.js'
import {PHYSICAL_BUTTONS, DEFAULT_GAME_UNLOCK_COMBO, normalizeGameUnlockCombo} from './GameControlsDefaults.js'
import styles from './Games.module.scss'

function ModalGameUnlockForm({parameters, onValidate, onClose}) {
  const
    {getLocale} = useLocale(),
    [combo, setCombo] = useState(() => normalizeGameUnlockCombo(parameters && parameters.gameUnlockCombo)),

    buttonOptions = useMemo(
      () => PHYSICAL_BUTTONS.map((b) => ({
        value: b.id,
        text: getLocale(b.labelKey)
      })),
      [getLocale]
    ),

    onChangeStep = useCallback(
      (index, value) => {
        setCombo((prev) => {
          const next = [...prev]
          next[index] = value
          return next
        })
      },
      []
    ),

    onAddStep = useCallback(
      () => {
        setCombo((prev) => prev.length >= 8 ? prev : [...prev, 'SELECT'])
      },
      []
    ),

    onRemoveStep = useCallback(
      (index) => {
        setCombo((prev) => {
          if (prev.length <= 1) {
            return prev
          }
          return prev.filter((_, i) => i !== index)
        })
      },
      []
    ),

    onReset = useCallback(
      () => setCombo([...DEFAULT_GAME_UNLOCK_COMBO]),
      []
    )

  return <ModalLayoutPadded isClosable={true} onClose={onClose}>
    <ModalTitle>{getLocale('games-unlock-combo')} :</ModalTitle>
    <ModalContent>
      <p className={styles.controlsHelp}
         dangerouslySetInnerHTML={{__html: getLocale('games-unlock-combo-help')}}/>
      <div className={styles.unlockList}>
        {combo.map((step, index) => (
          <div key={'unlock-' + index + '-' + step} className={styles.unlockRow}>
            <span className={styles.unlockIndex}>{index + 1}.</span>
            <InputSelect id={'unlock-step-' + index}
                         options={buttonOptions}
                         defaultValue={step}
                         onChange={(v) => onChangeStep(index, v)}/>
            <button type="button"
                    className={styles.unlockRemove}
                    disabled={combo.length <= 1}
                    onClick={() => onRemoveStep(index)}
                    title={getLocale('games-unlock-remove')}>
              ×
            </button>
          </div>
        ))}
      </div>
      <div className={styles.unlockActions}>
        <button type="button"
                className={styles.resetBtn}
                disabled={combo.length >= 8}
                onClick={onAddStep}>
          {getLocale('games-unlock-add')}
        </button>
        <button type="button" className={styles.resetBtn} onClick={onReset}>
          {getLocale('games-unlock-reset')}
        </button>
      </div>
      <p className={styles.unlockPreview}>
        {getLocale('games-unlock-preview')}: <strong>{combo.join(' → ')}</strong>
      </p>
    </ModalContent>
    <ButtonsContainer>
      <ButtonIconTextCheck text={getLocale('save')}
                           rounded={true}
                           onClick={() => {
                             onValidate({
                               ...parameters,
                               gameUnlockCombo: normalizeGameUnlockCombo(combo)
                             })
                             onClose()
                           }}/>
    </ButtonsContainer>
  </ModalLayoutPadded>
}

export default ModalGameUnlockForm
