import {getProcessParams} from '../Helpers/ProcessParams.js'
import {prepareContent} from './CardMakerR36s.js'

const _params_ = getProcessParams()

if (_params_.length === 0) {
  process.stderr.write('device-not-found')
} else {
  prepareContent(_params_[0]).catch((e) => process.stderr.write((e && e.toString()) || 'r36s-content-prepare-failed'))
}
