import { default as Component } from '.'

Component.prototype.initCurve = function() {
    this.path = this.g.append('path')
}

Component.prototype.updateCurve = function() {
    if (this.stats) {this.stats.begin()}
    this.path.attr('d', this.line(this.data) + 'Z')
    if (this.stats) {this.stats.end()}
}

Component.prototype.updateCurveStyle = function() {
    this.path.attr('stroke', this.implColor(this.sharedState.impl))
}
