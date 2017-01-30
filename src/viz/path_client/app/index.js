import { default as d3 } from 'd3'
import { default as _ } from 'lodash'
import { default as Controls } from '../controls'
import { default as Chart } from '../chart'
export default App

function App(options) {
    this.options = options
    this.setSkeleton()
    this.initControls()
    this.initState()
    this.setStateLoopbacks()
    this.initChart()
}

App.prototype.setSkeleton = function() {
    let appdiv = d3.select(this.options.container).append('div').attr('class', 'app')
    appdiv.append('div').attr('id', 'Chart')
    appdiv.append('div').attr('id', 'Controls')
}

App.prototype.initControls = function() {
    this.controls = new Controls({
        container: d3.select('#Controls'),
        data: {
            impl: [
                'path.current.path',
                'path.withFormat.path',
                'path.withFormat.pathRound',
            ],
            digits: [null, 0, 1, 2, 3, 4, 5, 10, 15],
            amountOfPoints: _.map(_.range(2, 6), n => Math.pow(10, n))
        }
    })
}

App.prototype.initState = function() {
    this.state$ =
        this.controls.getStateHandler$()
        .startWith({
            impl: 'path.withFormat.pathRound',
            digits: null,
            amountOfPoints: 100000
        })
        .scan((state, handler) => handler(state))
}

App.prototype.setStateLoopbacks = function() {
    this.controls.subscribeToState(this.state$)
}

App.prototype.initChart = function() {
    new Chart({
        container: d3.select('#Chart'),
        state$: this.state$.distinctUntilChanged((a, b) => _.isEqual(a,b)),
        allImplementations: [
            'path.current.path',
            'path.withFormat.path',
            'path.withFormat.pathRound',
        ]
    })
}
