var _ = require('lodash');
var esprima = require('esprima');
var escodegen = require('escodegen');
var Benchmark = require('benchmark');
var d3 = require('../build/bundle')

const COMMANDCALLS = 5
const DIGITS = 4

let path

function exec(funcName, digits, commandCalls) {
    /*
    return () => {
        let p = path(digits)
        p[funcName](10.1234567890, 10.1234567890)
        // ...
    }
    */
    let pathInitAST = esprima.parse(
        digits ? `let p = path(${digits})` : `let p = path()`
    ).body[0];

    let commandAST = esprima.parse(
        `p.${funcName}(10.1234567890, 10.1234567890)`
    ).body[0];

    let afuncAST = esprima.parse(`() => {}`).body[0];
    afuncAST.expression.body.body.push(
        pathInitAST,
        ..._.map(_.range(commandCalls), () => commandAST)
    )
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
    return eval(escodegen.generate(afuncAST))
}

new Benchmark.Suite('path')

// moveTo
.add('path.current.path().moveTo', exec('moveTo', null, COMMANDCALLS), {
    onStart: () => {path = d3.path.current.path},
    onComplete: onComplete('moveTo', null, COMMANDCALLS)
})
.add('path.withFormat.path().moveTo', exec('moveTo', null, COMMANDCALLS), {
    onStart: () => {path = d3.path.withFormat.path},
    onComplete: onComplete('moveTo', null, COMMANDCALLS)
})
.add('path.withFormat.pathCoerceFixed(2).moveTo', exec('moveTo', DIGITS, COMMANDCALLS), {
    onStart: () => {path = d3.path.withFormat.pathCoerceFixed},
    onComplete: onComplete('moveTo', DIGITS, COMMANDCALLS)
})
.add('path.withFormat.pathFixed(2).moveTo', exec('moveTo', DIGITS, COMMANDCALLS), {
    onStart: () => {path = d3.path.withFormat.pathFixed},
    onComplete: onComplete('moveTo', DIGITS, COMMANDCALLS)
})
.add('path.withFormat.pathCoerceRound(2).moveTo', exec('moveTo', DIGITS, COMMANDCALLS), {
    onStart: () => {path = d3.path.withFormat.pathCoerceRound},
    onComplete: onComplete('moveTo', DIGITS, COMMANDCALLS)
})
.add('path.withFormat.pathRound(2).moveTo', exec('moveTo', DIGITS, COMMANDCALLS), {
    onStart: () => {path = d3.path.withFormat.pathRound},
    onComplete: onComplete('moveTo', DIGITS, COMMANDCALLS)
})
.add('path.withIf.path().moveTo', exec('moveTo', null, COMMANDCALLS), {
    onStart: () => {path = d3.path.withIf.path},
    onComplete: onComplete('moveTo', null, COMMANDCALLS)
})
.add('path.withIf.path(2).moveTo', exec('moveTo', DIGITS, COMMANDCALLS), {
    onStart: () => {path = d3.path.withIf.path},
    onComplete: onComplete('moveTo', null, COMMANDCALLS)
})

// .add('path.withIf.path().moveToES6', exec('moveToES6', null, COMMANDCALLS), {
//     onStart: () => {path = d3.path.withIf.path},
//     onComplete: onComplete('moveToES6')
// })
// .add('path.withIf.path().moveTo4', exec('moveTo4', null, COMMANDCALLS), {
//     onStart: () => {path = d3.path.withIf.path},
//     onComplete: onComplete('moveTo4')
// })
// .add('path.withIf.path(2).moveTo4', exec('moveTo4', DIGITS, COMMANDCALLS), {
//     onStart: () => {path = d3.path.withIf.path},
//     onComplete: onComplete('moveTo4', 2)
// })
// .add('path.withIf.path().moveTo5', exec('moveTo5', null, COMMANDCALLS), {
//     onStart: () => {path = d3.path.withIf.path},
//     onComplete: onComplete('moveTo5')
// })
// .add('path.withIf.path(2).moveTo5', exec('moveTo5', DIGITS, COMMANDCALLS), {
//     onStart: () => {path = d3.path.withIf.path},
//     onComplete: onComplete('moveTo5', 2)
// })
// .add('path.withIf.path().moveTo6', exec('moveTo6', null, COMMANDCALLS), {
//     onStart: () => {path = d3.path.withIf.path},
//     onComplete: onComplete('moveTo6')
// })
// .add('path.withIf.path(2).moveTo6', exec('moveTo6', DIGITS, COMMANDCALLS), {
//     onStart: () => {path = d3.path.withIf.path},
//     onComplete: onComplete('moveTo6', 2)
// })
// .add('path.withIf.path().moveTo7', exec('moveTo7', null, COMMANDCALLS), {
//     onStart: () => {path = d3.path.withIf.path},
//     onComplete: onComplete('moveTo7')
// })
// .add('path.withIf.path(2).moveTo7', exec('moveTo7', DIGITS, COMMANDCALLS), {
//     onStart: () => {path = d3.path.withIf.path},
//     onComplete: onComplete('moveTo7', 2)
// })
.on('start', function() {
    console.log(`Executing ${COMMANDCALLS} command call${COMMANDCALLS > 1 ? 's' : ''} per test...`)
})
.on('cycle', function(event) {
    console.log(String(event.target));
    // console.log(event.target.count, event.target.times, event.target.stats);
})
.on('complete', () => {
    console.log(`Done`)
  // console.log('Fastest is ', this.filter('fastest'));
  // console.log('Fastest is ', this.filter('fastest').map('name'), this.stats);
})
.run();
// .run({ 'async': true });
