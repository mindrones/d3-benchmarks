import { default as d3 } from 'd3'
import { default as Component } from '.'

Component.prototype.initScales = function() {
    this.scales = {
        x: d3.scaleLinear().domain([0, 1]),
        y: d3.scaleLinear().domain([0, 1])
    }
}

Component.prototype.updateScalesGeometry = function() {
    this.scales.x.range([0, this.geometry.radius])
    this.scales.y.range([0, this.geometry.radius])
}
