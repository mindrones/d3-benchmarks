var Benchmark = require('benchmark');
var d3 = require('../build/bundle')

new Benchmark.Suite('round')

.add('roundMDN', () => { d3.roundMDN(10.1234567890, 4) })
.add('round', () => { d3.round(10.1234567890, 4) })
.on('start', function() {
    console.log(`Executing round tests...`)
})
.on('cycle', function(event) {
    console.log(String(event.target));
})
.on('complete', () => {
    console.log(`Done`)
})
.run({ 'async': true });
