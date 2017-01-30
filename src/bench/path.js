/*
node --expose-gc bench/path.js
to be run as idle as possible:
  - charger connected
  - no wifi | sleep mode
  - no or limited amount of open apps | user activities
*/

const fs = require('fs')
const _ = require('lodash')
const esprima = require('esprima')
const escodegen = require('escodegen')
const benchmark = require('benchmark');
const bundle = require('../../build/bundle')

const RESULTS_PATH = './data/path.json'
const MAXEXP = 4    // test with 1, 10, 100, ..., 10^MAXEXP command invocations
const MAXDIGITS = -Math.floor(Math.log10(Number.EPSILON))   // 16 on this machine
const DIGITS_STEP = 5   // 16-1 = 15 -> digits 0, 5, 10, 15
const commands = [
    'moveTo',
    'lineTo',
    'quadraticCurveTo',
    'rect',
    'bezierCurveTo',
    'arcTo',
    'arc'
]

// implementation / digits to be used as argument of path()
const implementations = {
    'path.current.path': [null],
    'path.withIf.path': [null, MAXDIGITS],
    'path.withFormat.path': [null],
    'path.withFormat.pathRound': [MAXDIGITS],
    'path.withFormat.pathCoerceRound': [MAXDIGITS],
    'path.withFormat.pathFixed': [MAXDIGITS],
    'path.withFormat.pathCoerceFixed': [MAXDIGITS]
}

// vars to accumulate benchmarks data
let testData
let results = []

// these will change at each benchmark: we want them to be at module level
// so that they won't be garbage collected until we explicitly call global.gc()
// (which is why we run this bench with the flag `--expose-gc`)
let path, p

// setup the suite
console.log(`Benchmarks setup...`)
let suite = new benchmark.Suite('path')
.on('start', function() {
    console.log(`Benchmarking...`)
})
.on('cycle', function(event) {
    console.log(`Done.`)
})
.on('complete', () => {
    fs.writeFile(RESULTS_PATH, JSON.stringify(results, null, 2), err => {
        if (err) {throw err}
        console.log('Saved results in:', RESULTS_PATH)
    })
})

// generate test functions and add the tests to the suite
// this can take a while because some of them have 10^MAXEXP lines of code
_.each(commands, command => {
    _.each(implementations, (maxDigits, impl) => {
        _.chain(maxDigits)
        .map(n => _.isNumber(n) ? _.range(0, n, DIGITS_STEP) : n)
        .flatten()
        .each(digits => {
            _.each(_.range(MAXEXP + 1), exp => {
                let calls = Math.pow(10, exp)
                let callsExp = calls.toExponential()
                let digitsString = _.isNull(digits) ? '' : digits
                suite.add(
                    `${impl}(${digitsString}).${command}.${callsExp}`,   // 'path.current.path(2).moveTo.5e2'
                    exec(command, digits, calls),                           // exec(moveTo, 2, 5)
                    {
                        onStart: () => {
                            console.log(`Executing ${impl}(${digitsString}).${command}.${callsExp}...`)

                            path = _.get(bundle, impl)
                            testData = {
                                impl: impl,
                                digits: digits,
                                command: command,
                                calls: calls,
                                heap: []
                            }
                            p = null
                        },
                        onCycle: (event) => {
                            // garbage collect everything we can, apart from `p`
                            global.gc()
                            let heapBeforeGC = process.memoryUsage().heapUsed

                            // free `p`
                            p = null

                            // should garbage collect only `p`
                            global.gc()
                            let heapAfterGC = process.memoryUsage().heapUsed
                            testData.heap.push(heapBeforeGC - heapAfterGC)
                        },
                        onComplete: (event) => {
                            testData.heap = _.reduce(testData.heap,
                                (sum, x) => sum + x
                            ) / testData.heap.length
                            testData.duration = event.target.times.period   // secs
                            results.push(testData)
                            checkOutput(command, digits, calls)()
                        },
                        onError: (event) => {
                            // FIXME log errors and save in file
                            console.log('*************************************')
                            console.log(event)
                            console.log('*************************************')
                        }
                    }
                )
            })
        })
        .value()
    })
})

suite.run()


function exec(command, digits, commandCalls) {
    let afuncAST = esprima.parse(`() => {}`).body[0]

    // make sure `p` is global, don't use `let p = ...`
    let initCode = _.isNull(digits) ? `p = path();` : `p = path(${digits});`

    let commandCode
    const N = 10.1234567890123456   // 16 digits as per MAXDIGITS on this machine
    if (_.includes([
        'moveTo',
        'lineTo',
        'quadraticCurveTo',
        'rect',
        'bezierCurveTo'
    ], command)) {
        switch (command) {
            case 'moveTo':
            case 'lineTo':
                commandCode = `p.${command}(${N},${N});`
                break;
            case 'quadraticCurveTo':
            case 'rect':
                commandCode = `p.${command}(${N},${N},${N},${N});`
                break;
            case 'bezierCurveTo':
                commandCode = `p.bezierCurveTo(${N},${N},${N},${N},${N},${N},${N},${N})`
                break;
            default:
                break;
        }
        let commandAST = esprima.parse(commandCode).body[0];
        afuncAST.expression.body.body.push(
            esprima.parse(initCode),
            ..._.map(_.range(commandCalls), () => commandAST)
        )
    } else if (command === 'arcTo') {
        // arcs through points [0,0], [0.5,0.5], [1,0] and back
        // shifted of [delta, delta] to get numbers with digits

        const delta = 0.1234567890123456
        initCode += `p.moveTo(${1 + delta},${0 + delta});`
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
    } else if (command === 'arc') {
        // arc with center [1,-1] starting from [0,0] to [2,0] and back
        // shifted of [delta, delta] to get numbers with digits

        const delta = 0.1234567890123456
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

// to check the result, append a console.log() to the exec() function
function checkOutput(command, digits, commandCalls) {
    let afuncAST = esprima.parse(
        exec(command, digits, commandCalls).toString()
    ).body[0];

    if (commandCalls <= 10) {
        console.log('checkOutput...')
        let logAST = esprima.parse(`console.log(p.toString())`).body[0];
        afuncAST.expression.body.body.push(logAST)
    }
    return eval(escodegen.generate(afuncAST))
}
