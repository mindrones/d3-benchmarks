import { default as _ } from 'lodash'
import { default as d3 } from 'd3'
import { Observable } from 'rxjs-es'
import { default as Component } from '.'

Component.prototype.setEvents = function() {
    Observable.fromEvent(window, 'resize')
    .subscribe(() => {
        this.geometry.dirty = true
        this.resize()
    })
}
