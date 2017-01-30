import { default as _ } from 'lodash'
import { default as d3 } from 'd3'
import { Observable } from 'rxjs-es'
export default Component
import './colors'

function Component(options) {
    this.name = 'Controls'
    this.options = options
    this.init()
    this.setStateHandler$()
}

Component.prototype.init = function() {
    this.container = this.options.container.append('div').attr('class', this.name)

    let panel =
        this.container.selectAll('.panel')
        .data(
            _.map(['impl', 'digits', 'command'], key =>
                ({
                    key: key,
                    values: _.chain(this.options.data)
                        .groupBy(key)
                        .keys()
                        .map(value => ({
                            key: key,
                            value: key === 'digits'
                                ? value === 'null'
                                    ? null
                                    : parseInt(value, 10)
                                : value
                        }))
                        .value()
                })
            ),
            d => d.key
        )

    panel.exit().remove()

    let panelEnter =
        panel.enter()
        .append('div')
        .attr('class', 'panel')

    panelEnter
        .append('p')
        .attr('class', 'title')
        .text(d => ({
            impl: 'Implementation',
            digits: 'Digits',
            command: 'Command'
        }[d.key]))

    this.valueDiv =
        panelEnter
        .selectAll('.row')
        .data(d => d.values)

    let valueEnter =
        this.valueDiv.enter()
        .append('div')
        .attr('class', 'row')

    valueEnter
        .filter(d => d.key === 'impl')
        .append('div')
        .attr('class', 'dot')
        .style('background-color', d => {
            return d.key === 'impl' ? this.implColor(d.value) : null
        })

    valueEnter
        .append('div')
        .attr('class', 'value')
        .append('p')
        .text(d => {
            let value
            switch (d.key) {
                case 'impl': {
                    let d_value = d.value.split('.').slice(1).join('.')
                    switch (d_value) {
                        case 'current.path':
                        case 'withFormat.path':
                            value = `${d_value} ( null )`
                            break;
                        case 'withIf.path':
                            value = `${d_value} ( null | digits )`
                            break;
                        case 'withFormat.pathRound':
                        case 'withFormat.pathCoerceFixed':
                        case 'withFormat.pathFixed':
                        case 'withFormat.pathCoerceRound':
                            value = `${d_value} ( digits )`
                            break;
                        default:
                            break;
                    }
                    break;
                }
                default:
                    value = String(d.value)
            }
            return value
        })

    this.valueDiv = this.valueDiv.merge(valueEnter)

    /* mini legend */

    let legend = this.container.append('div').attr('class', 'legend')

    legend
    .append('div').attr('class', 'dot')
    .append('p').text('N')

    legend
    .append('div').attr('class', 'phrase')
    .append('p')
    .text('N = log10(calls)')
}

Component.prototype.setStateHandler$ = function() {
    this.stateHandler$ = Observable.merge(
        ..._.chain(this.valueDiv.nodes())
        .map(node => [
            Observable.fromEvent(node, 'mouseover')
            .map(() =>
                state => {
                    let d = _.mapValues(d3.select(node).datum(), key => String(key))
                    let update = {}
                    if (!state[d.key][d.value]) {
                        update =
                            _.chain(state)
                            .cloneDeep()
                            .pick(d.key)
                            .mapValues(obj => {
                                obj[d.value] = {pinned: false}
                                return obj
                            })
                            .value()
                    }
                    return Object.assign({}, state, update)
                }
            ),
            Observable.fromEvent(node, 'click')
            .map(() =>
                state => {
                    let d = _.mapValues(d3.select(node).datum(), key => String(key))
                    let update =
                        _.chain(state)
                        .cloneDeep()
                        .pick(d.key)
                        .mapValues(obj => {
                            obj[d.value].pinned = !obj[d.value].pinned
                            return obj
                            // return Object.assign(obj[d.value], {pinned: !obj[d.value].pinned})
                        })
                        .value()
                    return Object.assign({}, state, update)
                }
            ),
            Observable.fromEvent(node, 'mouseout')
            .map(() =>
                state => {
                    let d = _.mapValues(d3.select(node).datum(), key => String(key))
                    let update = {}
                    if (!state[d.key][d.value].pinned) {
                        update =
                            _.chain(state)
                            .cloneDeep()
                            .pick(d.key)
                            .mapValues(obj => _.omit(obj, d.value))
                            .value()
                    }
                    return Object.assign({}, state, update)
                }
            )
        ])
        .flatten()
        .value()
    )
    // .share()
}

Component.prototype.getStateHandler$ = function() {
    return this.stateHandler$
}

Component.prototype.subscribeToState = function(state$) {
    state$.subscribe(state => {
        this.valueDiv.select('.value')
        .classed('pinned', d =>
            state[d.key][d.value]
            && state[d.key][d.value].pinned
        )
        .classed('hovered', d =>
            state[d.key][d.value]
            ? !state[d.key][d.value].pinned
            : false
        )
    })
}
