# d3 benchmarks

Quick repo to support the discussion in [this d3-path issue](https://github.com/d3/d3-path/issues/10).

## Installation

- `npm install`
- `npm run build` (always run this after modifying files in `src/`)

## Benches

- `npm run round`
- `npm run path`: at the moment the number of command calls (i.e. `.moveTo()`) is hardcoded, please edit `COMMANDCALLS` in `bench/path`, I'll add it as a command line option later on.
