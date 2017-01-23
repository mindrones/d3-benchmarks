import { default as Component } from '.'

Component.prototype.resize = function() {
    this.updateScalesGeometry()
    this.updateGenerators()
    this.updateSkeletonGeometry()
    this.updateAxes()
    this.updateCurvesGeometry()
    this.updateSensors()
}
