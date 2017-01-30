/*
node bench/round.js
to be run as idle as possible:
  - charger connected
  - no wifi | sleep mode
  - no or limited amount of open apps | user activities
*/

const fs = require('fs')
const _ = require('lodash')
const esprima = require('esprima')
const escodegen = require('escodegen')
const benchmark = require('benchmark')
const bundle = require('../../build/bundle')

const RESULTS_PATH = './data/rounding.json'
const N = 10.1234567890123456
const TRANSFORM = [null, 'CoerceNumber', 'CoerceString']
const IMPLEMENTATIONS = ['round', 'roundMDN', 'fixed']
const DIGITS = [0, 5, 10, 15]

let testData
let results = []

let suite = new benchmark.Suite('rounding')
.on('start', function() {
    console.log(`Executing rounding tests...`)
})
.on('cycle', function(event) {
    console.log(String(event.target));
})
.on('complete', () => {
    fs.writeFile(RESULTS_PATH, JSON.stringify(results, null, 2), err => {
        if (err) {throw err}
        console.log('Saved results in:', RESULTS_PATH)
    })
})

// generate test functions and add themto the suite
_.each(IMPLEMENTATIONS, impl => {
    _.each(TRANSFORM, transform => {
        _.each(DIGITS, digits => {
            suite.add(
                transform ? `${impl}.${transform}.${digits}` : `${impl}.${digits}`,
                exec(transform, impl, digits),
                {
                    onStart: () => {
                        testData = {
                            impl: impl,
                            transform: transform,
                            digits: digits
                        }
                    },
                    onComplete: (event) => {
                        testData.duration = event.target.times.period   // secs
                        results.push(testData)
                        checkOutput(transform, impl, digits)()
                    },
                    onError: (event) => {
                        // FIXME log arrors and save in file
                        console.log('*************************************')
                        console.log(event)
                        console.log('*************************************')
                    }
                }
            )
        })
    })
})

suite.run()

function exec(transform, implementation, digits) {
    let afuncAST = esprima.parse(`() => {}`).body[0]
    afuncAST.expression.body.body.push(
        esprima.parse(
            roundingCode(transform, implementation, digits)
        )
    )
    return eval(escodegen.generate(afuncAST))
}

// to check the result, append a console.log() to the exec() function
function checkOutput(transform, implementation, digits) {
    let afuncAST = esprima.parse(`() => {}`).body[0]
    let code = roundingCode(transform, implementation, digits)
    let testName = transform
        ? `${implementation}.${transform}.${digits}`
        : `${implementation}.${digits}`

    afuncAST.expression.body.body.push(
        esprima.parse(`console.log('${testName}: ${N} => ', ${code})`)
    )
    return eval(escodegen.generate(afuncAST))
}

function roundingCode(transform, implementation, digits) {
    let transformedN
    switch (transform) {
        case null:
            transformedN = `${N}`
            break;
        case 'CoerceNumber':
            transformedN = `+${N}`
            break;
        case 'CoerceString':
            transformedN = `+"${N}"`
            break;
        default:
            break;
    }

    let code
    switch (implementation) {
        case 'round':
            code = `bundle.round(${transformedN}, ${digits})`
            break;
        case 'roundMDN':
            code = `bundle.roundMDN(${transformedN}, ${digits})`
            break;
        case 'fixed':
            code = `${N}.toFixed(${digits})`
            break;
        default:
            break;
    }
    return code
}
