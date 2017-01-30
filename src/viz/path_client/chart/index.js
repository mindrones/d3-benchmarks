export default Component
import './colors'
import './curve'
import './events'
import './geometry'
import './resize'
import './scales'
import './stats'
import './skeleton'
import './update'

function Component(options) {
    this.name = 'Chart'
    this.options = options
    this.initSkeleton()
    this.updateSkeletonGeometry()
    this.initScales()
    this.updateScalesGeometry()
    this.initCurve()
    this.initStats()
    this.startAnimation()
    this.subscribeToState()
    this.setEvents()
}
