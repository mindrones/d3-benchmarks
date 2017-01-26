export default Component
import './axes'
import './colors'
import './curves'
import './data'
import './events'
import './generators'
import './geometry'
import './resize'
import './scales'
import './skeleton'
import './sensors'

function Component(options) {
    this.name = 'Chart'
    this.options = options

    this.initSkeleton()
    this.updateSkeletonGeometry()

    this.initScales()
    this.updateScalesGeometry()

    this.initGenerators()
    this.initAxes()
    this.initSensors()
    this.initCurves()

    this.connectData()
    this.setEvents()
}
