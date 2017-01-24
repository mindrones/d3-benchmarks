import { default as _ } from 'lodash'
import { default as d3 } from 'd3'
import { default as Component } from '.'

Component.prototype.connectData = function() {
    this.options.data$
    .map(input => {
        let data = {
            tExtent: d3.extent(input.items, obj => obj.duration),
            mExtent: d3.extent(input.items, obj => obj.heap)
        }
        data.curves =
            _.chain(input.items)
            .groupBy(obj => `${obj.impl.split('.').slice(1).join('.')}(${obj.digits}).${obj.command}`)
            .map((points, id) => ({
                id: id.replace(/null/g, ''),
                domID: id.replace(/[().]/g, '_'),
                impl: points[0].impl,
                points: points
            }))
            .value()
        data.points =
            _.map(input.items, obj => _.assign(obj, {
                id: `${obj.impl}|${obj.digits}|${obj.command}|${obj.calls}`,
                impl: obj.impl
            }))
        data.uniquePoints = _.uniqWith(data.points, (a, b) =>
            _.isEqual(
                _.pick(a, 'heap', 'duration'),
                _.pick(b, 'heap', 'duration')
            )
        )
        data.allImplementations = input.allImplementations
        return data
    })
    .subscribe(data => {
        this.data = data
        this.updateScalesData()
        this.updateGenerators()
        this.updateAxes()
        this.updateSensors()
        this.updateCurves()
        this.updateCurvesGeometry()
    })
}
