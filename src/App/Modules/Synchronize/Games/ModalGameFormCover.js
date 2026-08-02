import {useRef} from 'react'
import {useLocale} from '../../../Components/Locale/LocaleHooks.js'

import ModalLayoutPadded from '../../../Components/Modal/ModalLayoutPadded.js'
import ModalTitle from '../../../Components/Modal/ModalTitle.js'
import ModalContent from '../../../Components/Modal/ModalContent.js'
import Form from '../../../Components/Form/Form.js'
import ButtonsContainer from '../../../Components/Buttons/ButtonsContainer.js'
import ButtonIconTextCheck from '../../../Components/Buttons/IconsTexts/ButtonIconTextCheck.js'
import InputImage from '../../../Components/Form/Input/InputImage.js'

function ModalGameFormCover({game, onValidate, onClose}) {
  const
    {getLocale} = useLocale(),
    coverRef = useRef(),
    defaultCover = game.image
      ? (game.image.includes('?') ? game.image.substring(0, game.image.indexOf('?')) : game.image)
      : ''

  return <ModalLayoutPadded isClosable={true} onClose={onClose}>
    <ModalTitle>{getLocale('game-edit-cover')} — {game.title} ({game.systemLabel}) :</ModalTitle>
    <Form>{
      (validation) => {
        return <>
          <ModalContent>
            <InputImage label={getLocale('picture-cover')}
                        id="game-cover"
                        defaultValue={defaultCover}
                        width={256}
                        height={256}
                        displayScale={0.5}
                        ref={coverRef}/>
          </ModalContent>
          <ButtonsContainer>
            <ButtonIconTextCheck text={getLocale('save')}
                                 rounded={true}
                                 onClick={() => {
                                   validation(
                                     [coverRef],
                                     (values) => {
                                       onValidate({...game, newImage: values[0]})
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

export default ModalGameFormCover
