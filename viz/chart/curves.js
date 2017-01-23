import { default as Component } from '.'

Component.prototype.initCurves = function() {
    this.trends = this.g.append('g').attr('class', 'trends')
    this.curves = this.trends.append('g').attr('class', 'curves')
    this.dots = this.trends.append('g').attr('class', 'dots')
}

Component.prototype.updateCurves = function() {
    /* curves */

    this.curve =
        this.curves.selectAll('.curve')
        .data(this.data.curves, d => d.id)
    this.curve.exit().remove()

    let curveEnter = this.curve.enter().append('g').attr('class', 'curve')

    // curve path

    curveEnter.append('path')
    .attr('id', d => d.domID)
    .style('stroke', d => this.implColor(d.impl))

    // curve label

    curveEnter
    .append('text')
    .attr('dy', -this.geometry.dotRadiusSafety)
    .style('fill', d => this.implColor(d.impl))
    .append('textPath')
    .attr('startOffset', '90%')
    .attr('href', d => `#${d.domID}`)
    .text(d => d.id)

    this.curve = curveEnter.merge(this.curve)

    // dots with text
    this.dot = this.dots.selectAll('.dot').data(this.data.points)
    this.dot.exit().remove()
    let dotEnter = this.dot.enter().append('g').attr('class', 'dot')

    dotEnter.append('circle')
    dotEnter.append('text')
    .text(d => Math.log10(d.calls))

    this.dot = dotEnter.merge(this.dot)
    this.dot.select('circle').style('stroke', d => this.implColor(d.impl))
    this.dot.select('text').style('fill', d => this.implColor(d.impl))
}

Component.prototype.updateCurvesGeometry = function() {
    this.curve
    .select('path')
    .attr('d', d => {
        return this.generators.line(d.points)
    })

    this.dot
    .attr('transform', d => `translate(${[
        this.scales.t(d.duration),
        this.scales.m(d.heap)
    ]})`)
    .select('circle')
    .attr('r', this.geometry.dotRadiusFocusFactor * this.geometry.dotRadius)
}

Component.prototype.focusDots = function(focus) {
    this.dot
    .select('circle')
    .attr('r', d => (!focus || (d.calls !== focus.calls))
        ? this.geometry.dotRadius
        : this.geometry.dotRadiusFocused
    )

    this.dot
    .select('text')
    .attr('font-size', d => (!focus || (d.calls !== focus.calls))
        ? null
        : `${this.geometry.dotRadiusFocusFactor}em`
    )
}
