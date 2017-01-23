import { default as d3 } from 'd3'
import { default as _ } from 'lodash'
import { Observable } from 'rxjs-es'
import { default as Controls } from '../controls'
import { default as Chart } from '../chart'
export default App

import './skeleton'

function App(options) {
    this.options = options
    this.setSkeleton()
    this.load()
}

App.prototype.load = function() {
    this.data$ = Observable.bindNodeCallback(d3.json)('data/path.json')
    this.data$.subscribe(data => {
        this.controls = new Controls({
            container: d3.select('#Controls'),
            data: data
        })
        this.initState()
        this.setStateLoopbacks()
        this.initChart()
    })
}

App.prototype.initState = function() {
    this.state$ =
        this.controls.getStateHandler$()
        .startWith({
            impl: {
                'path.current.path': {pinned: true},
                'path.withIf.path': {pinned: true},
                'path.withFormat.path': {pinned: true},
                // 'path.withFormat.pathRound': {pinned: true}
            },
            digits: {
                null: {pinned: true},
                // 5: {pinned: true}
            },
            command: {
                moveTo: {pinned: true},
                // lineTo: {pinned: true},
                // quadraticCurveTo: {pinned: true},
                // rect: {pinned: true},
                // bezierCurveTo: {pinned: true},
                // arcTo: {pinned: true},
                // arc: {pinned: true}
            }
        })
        .scan((state, handler) => handler(state))
        // .share()
}

App.prototype.setStateLoopbacks = function() {
    this.controls.subscribeToState(this.state$)
}

App.prototype.initChart = function() {
    new Chart({
        container: d3.select('#Chart'),
        data$: Observable.combineLatest(this.state$, this.data$, (state, data) => {
            let items = data
            _.each(state, (dimObj, dimension) => {
                let values = _.keys(dimObj)
                if (dimension === 'digits') {
                    values = _.map(values, s =>
                        s === 'null' ? null : parseInt(s, 10)
                    )
                }
                items = _.filter(items, obj => {
                    return _.includes(values, obj[dimension])
                })
            })
            return {
                items: items,
                allImplementations: _.keys(_.groupBy(data, obj => obj.impl))
            }
        })
        .distinctUntilChanged((a, b) => _.isEqual(a,b))

        // FIXME fires 2 times as combineLatest subscribe to state$
        // as the chart does, but chaining `.share()` to `this.state$` won't
        // draw the curves until we mouseover the options in the control panel..
    })
}
