import { default as Component } from '.'

Component.prototype.initSensors = function() {
    this.sensors = this.g.append('g').attr('class', 'sensors')
}

Component.prototype.updateSensors = function() {
    var polygons =
        this.generators.voronoi.polygons(this.data.uniquePoints)

    var sensor =
        this.sensors.selectAll('.sensor').data(polygons)

    sensor.exit().remove()
    sensor.enter()
        .append('path')
        .attr('class', 'sensor')
        .on('mouseover', d => { this.dispatch.call('focus_changed', this, d.data) })
        .on('mouseout', () => { this.dispatch.call('focus_changed', this, null) })
        .merge(sensor)
        .attr('d', d => 'M' + d.join('L') + 'Z')
}
