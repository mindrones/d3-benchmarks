var _ = require('lodash');
var esprima = require('esprima');
var escodegen = require('escodegen');
var benchmark = require('benchmark');
var d3 = require('../build/bundle')

const CALLS = 4
const DIGITS = 5
const commands = [
    'moveTo',
    'lineTo',
    'quadraticCurveTo',
    'rect',
    'bezierCurveTo',
    'arcTo',
    'arc'
]
const funcs = {
    'path.current.path': [null],
    'path.withFormat.path': [null],
    // 'path.withFormat.pathCoerceFixed': [DIGITS],
    // 'path.withFormat.pathFixed': [DIGITS],
    // 'path.withFormat.pathCoerceRound': [DIGITS],
    'path.withFormat.pathRound': [DIGITS],
    'path.withIf.path': [null, DIGITS],
}

let path

let suite = new benchmark.Suite('path')
.on('start', function() {
    console.log(`Calling ${CALLS} command${CALLS > 1 ? 's' : ''} per test...`)
})
.on('cycle', function(event) {
    console.log(String(event.target));
})
.on('complete', () => {
    console.log(`Done`)
})

_.each(commands, command => {
    _.each(funcs, (args, name) => {
        _.each(args, digits => {
            suite.add(
                `${name}(${digits ? digits : ''}).${command}`,    // 'path.current.path(2).moveTo'
                exec(command, digits, CALLS),                  // exec(moveTo, 2, 3)
                {
                    onStart: () => {path = _.get(d3, name)},
                    onComplete: onComplete(command, digits, CALLS)
                }
            )
        })
    })
})

suite.run()


function exec(funcName, digits, commandCalls) {
    let afuncAST = esprima.parse(`() => {}`).body[0];
    let initCode = digits ? `let p = path(${digits});` : `let p = path();`
    let commandCode

    if (_.includes([
        'moveTo',
        'lineTo',
        'quadraticCurveTo',
        'rect',
        'bezierCurveTo'
    ], funcName)) {
        switch (funcName) {
            case 'moveTo':
            case 'lineTo':
                commandCode = `p.${funcName}(10.1234567890, 10.1234567890);`
                break;
            case 'quadraticCurveTo':
            case 'rect':
                commandCode = `p.${funcName}(10.1234567890, 10.1234567890, 10.1234567890, 10.1234567890);`
                break;
            case 'bezierCurveTo':
                commandCode = `p.bezierCurveTo(10.1234567890, 10.1234567890, 10.1234567890, 10.1234567890, 10.1234567890, 10.1234567890)`
                break;
            default:
                break;
        }
        let commandAST = esprima.parse(commandCode).body[0];
        afuncAST.expression.body.body.push(
            esprima.parse(initCode),
            ..._.map(_.range(commandCalls), () => commandAST)
        )
    } else if (funcName === 'arcTo') {
        // arcs through points [0,0], [0.5,0.5], [1,0] and back
        // shifted of [delta, delta] to get numbers with digits

        let delta = 0.0123456789
        initCode += `p.moveTo(${1+delta},${0+delta});`
        let [x1, y1] = [0.5 + delta, 0.5 + delta]
        let y2 = 0 + delta
        let r = 1 / Math.sqrt(2)
        afuncAST.expression.body.body.push(
            esprima.parse(initCode),
            ..._.map(_.range(commandCalls), (n) => {
                // arcTo(x1, y1, x2, y2, radius)
                let x2 = n % 2 + delta
                commandCode = `p.arcTo(${x1},${y1},${x2},${y2},${r})`
                return esprima.parse(commandCode).body[0];
            })
        )
    } else if (funcName === 'arc') {
        // arc with center [1,-1] starting from [0,0] to [2,0] and back
        // shifted of [delta, delta] to get numbers with digits
        let delta = 0.0123456789

        let [x, y] = [1 + delta, -1 + delta]
        let r = Math.sqrt(2)

        afuncAST.expression.body.body.push(
            esprima.parse(initCode),
            ..._.map(_.range(commandCalls), (n) => {
                // arc(x, y, radius, startAngle, endAngle[, anticlockwise])
                let ccw = n % 2 === 1
                let a0 = Math.PI * (ccw ? 1 : 3) / 4
                let a1 = Math.PI * (ccw ? 3 : 1) / 4
                commandCode = `p.arc(${x},${y},${r},${a0},${a1},${ccw})`
                return esprima.parse(commandCode).body[0];
            })
        )
    }
    return eval(escodegen.generate(afuncAST))
}

function onComplete(funcName, digits, commandCalls) {
    // to check the result, append a console.log() to the exec() function

    let afuncAST = esprima.parse(
        exec(funcName, digits, commandCalls).toString()
    ).body[0];

    if (commandCalls < 5) {
        let logAST = esprima.parse(`console.log(p.toString())`).body[0];
        afuncAST.expression.body.body.push(logAST)
    }
    console.log(funcName, escodegen.generate(afuncAST))
    return eval(escodegen.generate(afuncAST))
}
