import { default as d3 } from 'd3'
import { default as Component } from '.'

Component.prototype.initScales = function() {
    this.scales = {
        t: d3.scaleLog(),
        m: d3.scaleLog()
    }
}

Component.prototype.updateScalesData = function() {
    this.scales.t.domain(this.data.tExtent)
    this.scales.m.domain(this.data.mExtent)
}

Component.prototype.updateScalesGeometry = function() {
    this.scales.t.range([0, this.geometry.innerWidth])
    this.scales.m.range([this.geometry.innerHeight, 0])
}
