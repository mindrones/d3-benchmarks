import { default as d3 } from 'd3'
import { default as Component } from '.'

Component.prototype.initGenerators = function() {
    this.generators = {
        axes: {
            t: d3.axisBottom(),
            m: d3.axisLeft()
        },
        line: d3.line()
            .curve(d3.curveNatural)
            .x(d => this.scales.t(d.duration))
            .y(d => this.scales.m(d.heap)),
        voronoi: d3.voronoi()
            .x(d => this.scales.t(d.duration))
            .y(d => this.scales.m(d.heap))
    }
}

Component.prototype.updateGenerators = function() {
    this.generators.axes.t
        .scale(this.scales.t)
        .tickSize(-this.geometry.innerHeight)

    this.generators.axes.m
        .scale(this.scales.m)
        .tickSize(-this.geometry.innerWidth)

    this.generators.voronoi.extent(this.geometry.extent)
}
