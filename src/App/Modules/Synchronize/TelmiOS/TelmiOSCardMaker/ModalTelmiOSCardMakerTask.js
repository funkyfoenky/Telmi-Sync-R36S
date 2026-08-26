import {useCallback, useEffect, useState} from 'react'
import {useModal} from '../../../../Components/Modal/ModalHooks.js'
import {useElectronEmitter, useElectronListener} from '../../../../Components/Electron/Hooks/UseElectronEvent.js'
import ModalTaskVisualizer from '../../../../Components/Modal/Templates/ModalTasksVisualizer/ModalTasksVisualizer.js'
import ModalTelmiOSContentSdForm from './ModalTelmiOSContentSdForm.js'

function ModalTelmiOSCardMakerTask({drive, onClose}) {
  const
    {addModal, rmModal} = useModal(),
    [downloadStarted, setDownloadStarted] = useState(false),
    [processingStory, setProcessingStory] = useState(null),
    [waitingStories] = useState([]),
    [errorStories, setErrorStories] = useState([]),
    [isClosable, setIsClosable] = useState(false),
    isMulti = drive && drive.sdLayout === 'multi',
    openContentStep = useCallback(
      () => {
        addModal((key) => {
          const modal = <ModalTelmiOSContentSdForm key={key}
                                                   onClose={() => rmModal(modal)}/>
          return modal
        })
      },
      [addModal, rmModal]
    )

  useElectronListener(
    'telmios-cardmaker-task',
    (title, message, current, total) => {
      setDownloadStarted(true)
      if (title === '' && message === '' && current === 0 && total === 0) {
        setProcessingStory(null)
      } else {
        setProcessingStory({task: title, message, current, total})
      }
    },
    [setProcessingStory]
  )

  useElectronListener(
    'telmios-cardmaker-error',
    (title, error) => setErrorStories((errors) => ([
      ...errors,
      {task: title, message: error}
    ])),
    [setErrorStories]
  )

  useElectronEmitter('telmios-cardmaker', [drive])

  useEffect(() => {
    if (downloadStarted && processingStory === null && !waitingStories.length) {
      if (!errorStories.length) {
        if (isMulti) {
          openContentStep()
        }
        onClose()
      } else {
        setIsClosable(true)
      }
    } else {
      setIsClosable(false)
    }
  }, [downloadStarted, processingStory, waitingStories, errorStories, onClose, setIsClosable, isMulti, openContentStep])

  return <ModalTaskVisualizer errorTasks={errorStories}
                              processingTask={processingStory}
                              waitingTasks={waitingStories}
                              isClosable={isClosable}
                              onClose={onClose}/>
}

export default ModalTelmiOSCardMakerTask
