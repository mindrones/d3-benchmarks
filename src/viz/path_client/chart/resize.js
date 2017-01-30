import { default as Component } from '.'

Component.prototype.resize = function() {
    this.updateScalesGeometry()
    this.updateSkeletonGeometry()
}
