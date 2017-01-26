import { default as _ } from 'lodash'
import { default as d3 } from 'd3'
import { Observable } from 'rxjs-es'
import { default as Component } from '.'

Component.prototype.setEvents = function() {
    // internal events
    this.dispatch =
        d3.dispatch('focus_changed')
        .on('focus_changed', obj => {this.focusDots(obj)})

    // window events
    Observable.fromEvent(window, 'resize')
    // .debounceTime(20)
    .subscribe(() => {
        this.geometry.dirty = true
        this.resize()
    })
}
