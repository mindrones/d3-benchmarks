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
                ).fontSize,
                jiggleRadius: 0.05
            }
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

            // origin
            this._geometry.origin = [
                this._geometry.padding.left + this._geometry.innerWidth / 2,
                this._geometry.padding.top + this._geometry.innerHeight / 2
            ]
            this._geometry.radius = Math.min(
                0.75 * this._geometry.innerWidth / 2,
                0.75 * this._geometry.innerHeight / 2
            )

            this._geometry.dirty = false
        }

        return this._geometry
    }
})
