import { default as d3 } from 'd3'
import { default as _ } from 'lodash'
import { default as Component } from '.'

Object.defineProperty(Component.prototype, 'implColor', {
    get: function () {
        if(_.isUndefined(this._implColor)) {
            let implementations =
                _.chain(this.options.data)
                .groupBy(obj => obj.impl)
                .keys()
                .value()

            let hueScale =
                d3.scalePoint()
                .domain(implementations)
                .range([0, 300])
            this._implColor = key => d3.hsl(hueScale(key), 0.5, 0.5)
        }
        return this._implColor
    }
})
