/* global implementations */

import { default as _ } from 'lodash'
import { default as d3 } from 'd3'
import { default as Component } from '.'

// state {impl, digits, amountOfPoints}

Component.prototype.subscribeToState = function() {
    this.options.state$
    .map(state => {
        let obj = {
            state: state,
            deAngle: 2 * Math.PI / state.amountOfPoints
        }
        obj.items = _.map(_.range(state.amountOfPoints), n => ({
            x: Math.cos(n * obj.deAngle),
            y: Math.sin(n * obj.deAngle)
        }))
        return obj
    })
    .subscribe(obj => {
        this.data = obj.items
        this.sharedState = obj.state

        // line
        switch (this.sharedState.impl) {
            case 'path.current.path':
                this.line = d3.line()
                break;
            case 'path.withFormat.path':
                this.line = implementations.line()
                break;
            case 'path.withFormat.pathRound':
                this.line = implementations.line()
                this.line.precision(this.sharedState.digits)
                break;
            default:
                break;
        }

        this.line
        .x(d => this.scales.x(d.x + this.geometry.jiggleRadius * this.cosAngle))
        .y(d => this.scales.y(d.y + this.geometry.jiggleRadius * this.sinAngle))

        this.updateCurveStyle()
    })
}

Component.prototype.startAnimation = function() {
    let angularSpeed = 15  // degrees/s
    d3.timer(elapsed => {
        let angle = (angularSpeed * elapsed / 1000) % 360
        this.cosAngle = Math.cos(angle)
        this.sinAngle = Math.sin(angle)
        if (this.data) {
            this.updateCurve()  // update + stats measurements
        }
    })
}
