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
            _.map(this.options.data, (values, key) => ({
                key: key,
                values: _.map(values, value => ({key: key, value: value}))
            })),
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
            amountOfPoints: 'Amount of points'
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
                            value = `${d_value} ( null | digits )`
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
}

Component.prototype.setStateHandler$ = function() {
    this.stateHandler$ = Observable.merge(
        ..._.map(this.valueDiv.nodes(), node => {
            let d = d3.select(node).datum()
            return Observable
                .fromEvent(node, 'click')
                .map(() =>
                    state => {
                        let currentImpl = state.impl

                        let update = _.pick(state, d.key)
                        update[d.key] = d.value

                        switch (d.key) {
                            case 'impl':
                                switch (d.value) {
                                    case 'path.current.path':
                                    case 'path.withFormat.path':
                                        update.digits = null
                                        break;
                                    default:
                                        break;
                                }
                                break;
                            case 'digits':
                                switch (currentImpl) {
                                    case 'path.current.path':
                                    case 'path.withFormat.path':
                                        update.digits = null
                                        break;
                                    default:
                                        break;
                                }
                                break;
                            default:
                                break;
                        }

                        console.log('update', update)

                        return Object.assign({}, state, update)
                    }
                )
        })
    )
}

Component.prototype.getStateHandler$ = function() {
    return this.stateHandler$
}

Component.prototype.subscribeToState = function(state$) {
    state$.subscribe(state => {
        console.log(state)

        this.valueDiv.select('.value')
        .classed('pinned', d => {
            return (state[d.key] === d.value)
        })
    })
}
