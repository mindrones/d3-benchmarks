import { default as Component } from '.'

Component.prototype.initAxes = function() {
    this.axes = {
        t: this.g.append('g').attr('class', 'axis x'),
        m: this.g.append('g').attr('class', 'axis y')
    }

    // x labels
    this.tAxisLabel =
        this.axes.t.append('g')
        .append('text')
        .attr('class', 'label')
    this.tAxisLabel.append('tspan').text('Duration')
    this.tAxisLabel.append('tspan').text('[ s ]').attr('dx', '0.5em')

    this.tAxisLabelMin = this.axes.t.append('g')
    this.tAxisLabelMinText =
        this.tAxisLabelMin.append('text').attr('class', 'label min')

    this.tAxisLabelMax = this.axes.t.append('g')
    this.tAxisLabelMaxText =
        this.tAxisLabelMax.append('text').attr('class', 'label max')

    // y labels
    this.mAxisLabel =
        this.axes.m.append('g').attr('class', 'label')
        .append('text')
    this.mAxisLabel.append('tspan').text('Heap')
    this.mAxisLabel.append('tspan').text('[ bytes ]').attr('dx', '0.5em')

    this.mAxisLabelMin = this.axes.m.append('g')
    this.mAxisLabelMinText =
        this.mAxisLabelMin.append('text').attr('class', 'label min')

    this.mAxisLabelMax = this.axes.t.append('g')
    this.mAxisLabelMaxText =
        this.mAxisLabelMax.append('text').attr('class', 'label max')
}

Component.prototype.updateAxes = function() {
    /* x */

    this.axes.t
    .attr('transform', `translate(${[0,this.geometry.innerHeight]})`)
    .call(this.generators.axes.t)

    // dots with low memory values might overlap x axis ticks
    this.axes.t.selectAll('.tick text')
        .attr('y', this.geometry.dotRadiusSafety)

    // labels
    this.tAxisLabel
        .attr('transform', `translate(${[
            this.geometry.innerWidth/2,
            0.65 * this.geometry.padding.bottom
        ]})`)

    this.tAxisLabelMin
        .attr('transform', `translate(${[0, 0.65*this.geometry.padding.bottom]})`)
    this.tAxisLabelMinText
        .text(this.data.tExtent[0]
            ? `|< 1e${Math.log10(this.data.tExtent[0]).toFixed(1)}`
            : ''
        )

    this.tAxisLabelMax
        .attr('transform', `translate(${[
            this.geometry.innerWidth,
            0.65 * this.geometry.padding.bottom]})`
        )
    this.tAxisLabelMaxText
        .text(this.data.tExtent[1]
            ? `1e${Math.log10(this.data.tExtent[1]).toFixed(1)} >|`
            : ''
        )

    /* y */

    this.axes.m
    // .attr('transform', `translate(${[0,this.geometry.innerHeight]})`)
    .call(this.generators.axes.m)

    // dots with low time values might overlap y axis ticks
    this.axes.m.selectAll('.tick text')
    .attr('x', -this.geometry.dotRadiusSafety)

    this.mAxisLabel
        .attr('transform', `translate(${[
            -0.65 * this.geometry.padding.left,
            this.geometry.innerHeight/2
        ]}) rotate(-90)`)

    this.mAxisLabelMin
        .attr('transform', `translate(${[
            -0.65 * this.geometry.padding.left,
            this.geometry.innerHeight
        ]}) rotate(-90)`)
    this.mAxisLabelMinText
        .text(this.data.mExtent[0]
            ? `|< 1e${Math.log10(this.data.mExtent[0]).toFixed(1)}`
            : ''
        )

    this.mAxisLabelMax
        .attr('transform', `translate(${[
            -0.65 * this.geometry.padding.left,
            -this.geometry.innerHeight
        ]}) rotate(-90)`)
    this.mAxisLabelMaxText
        .text(this.data.mExtent[1]
            ? `1e${Math.log10(this.data.mExtent[1]).toFixed(1)} >|`
            : ''
        )
}
