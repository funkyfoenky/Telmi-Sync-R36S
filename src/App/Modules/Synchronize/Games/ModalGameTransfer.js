import ModalElectronTaskVisualizer from '../../../Components/Electron/Modal/ModalElectronTaskVisualizer.js'

function ModalGameTransfer({games, telmiOS, onClose}) {
  return <ModalElectronTaskVisualizer taskName="games-transfer"
                                      dataSent={[telmiOS, games]}
                                      onClose={onClose}/>
}

export default ModalGameTransfer
