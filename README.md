# d3 benchmarks

Quick repo to support the discussion in [this d3-path issue](https://github.com/d3/d3-path/issues/10).

## Installation

- `npm install`
- `npm run build` (always run this after modifying files in `src/`)

## Benches

- `npm run round`
- `npm run path`: at the moment the number of command calls (i.e. `.moveTo()`) is hardcoded, please edit `COMMANDCALLS` in `bench/path`, I'll add it as a command line option later on.

## Example output

```bash
Executing 1000 command calls per test...
path.current.path().moveTo x 14,793 ops/sec ±2.08% (82 runs sampled)
path.withFormat.path().moveTo x 14,506 ops/sec ±3.15% (81 runs sampled)
path.withFormat.pathCoerceFixed(2).moveTo x 663 ops/sec ±2.71% (77 runs sampled)
path.withFormat.pathFixed(2).moveTo x 1,055 ops/sec ±3.30% (78 runs sampled)
path.withFormat.pathCoerceRound(2).moveTo x 5,157 ops/sec ±2.73% (80 runs sampled)
path.withFormat.pathRound(2).moveTo x 5,880 ops/sec ±2.03% (81 runs sampled)
path.withIf.path().moveTo x 14,044 ops/sec ±4.20% (80 runs sampled)
path.withIf.path(2).moveTo x 7,836 ops/sec ±2.94% (82 runs sampled)
```
