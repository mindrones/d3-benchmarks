import { default as _ } from 'lodash'
import * as utils from '../../utils'
import { default as Component } from '.'

Object.defineProperty(Component.prototype, 'geometry', {
    get: function () {
        if(!this._geometry) {
            this._geometry = {
                dirty: true,
                padding: {top: 20, right: 20, bottom: 60, left: 80},
                fontSize: utils.getElementGeometry(this.container.node(),
                    ['fontSize']
                ).fontSize
            }
            this._geometry.dotRadius = 0.55 * this._geometry.fontSize
            this._geometry.dotRadiusSafety = 1.3 * this._geometry.dotRadius
            this._geometry.dotRadiusFocusFactor = 1.5
            this._geometry.dotRadiusFocused =
                this._geometry.dotRadiusFocusFactor * this._geometry.dotRadius

            this._geometry.padding = _.mapValues(this._geometry.padding, n =>
                Math.max(n, this._geometry.dotRadiusFocused)
            )
            this._geometry.origin = [
                this.geometry.padding.left,
                this.geometry.padding.top,
            ]
        }

        if (this._geometry.dirty) {
            // container
            this._geometry.container = utils.getElementGeometry(
                this.container.node(), [
                    'paddingBottom',
                    'paddingLeft',
                    'paddingRight',
                    'paddingTop'
                ]
            )

            // x
            this._geometry.width =
                this._geometry.container.width
                - this._geometry.container.paddingLeft
                - this._geometry.container.paddingRight
            this._geometry.innerWidth =
                this._geometry.width
                - this._geometry.padding.left
                - this._geometry.padding.right

            // y
            this._geometry.height =
                this._geometry.container.height
                - this._geometry.container.paddingTop
                - this._geometry.container.paddingBottom
            this._geometry.innerHeight =
                this._geometry.height
                - this._geometry.padding.top
                - this._geometry.padding.bottom

            this._geometry.extent = [
                [0, 0],
                [this._geometry.innerWidth, this._geometry.innerHeight]
            ]

            this._geometry.dirty = false
        }

        return this._geometry
    }
})
