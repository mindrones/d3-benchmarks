# d3 benchmarks

Quick repo to support the discussion in [this d3-path issue](https://github.com/d3/d3-path/issues/10).

## Installation

- `npm install`
- `npm run build` (always run this after modifying files in `src/`)

## Benches

### path

Compare different implementations of d3's `path`, run with: `npm run path`.

**Please checkout the current results on this [interactive chart](https://mindrones.github.io/d3-benchmarks/)**

Tested implementations of `path()`:

- [current](https://github.com/d3/d3-path/blob/master/src/path.js): official version
- [withFormat](https://github.com/mindrones/d3-benchmarks/blob/master/src/path/withFormat.js): derived from [this PR](https://github.com/d3/d3-path/blob/fixed/src/path.js), with added implementations:

  - `pathCoerceFixed`: input value coercion and truncation via `.toFixed()`

    ```js
    export function pathCoerceFixed(digits) {
        var path = new Path;
        (digits = +digits).toFixed(digits); // Validate digits.
        path._format = function(x) { return +x.toFixed(digits); };
        return path;
    }
    ```

  - `pathFixed`: similar to the original PR but no input value coercion, truncation via `.toFixed()`

    ```js
    export function pathFixed(digits) {
        var path = new Path;
        (digits = +digits).toFixed(digits); // Validate digits.
        path._format = function(x) { return x.toFixed(digits); };
        return path;
    }
    ```

  - `pathCoerceRound`: input value coercion and truncation via [round](https://github.com/d3/d3-format/issues/32)

    ```js
    export function pathCoerceRound(digits) {
        var path = new Path;
        (digits = +digits).toFixed(digits); // Validate digits.
        path._format = function(x) { return round(+x, digits); };
        return path;
    }
    ```

  - `pathFixed`: no input value coercion and truncation via same round as above

    ```js
    export function pathRound(digits) {
        var path = new Path;
        (digits = +digits).toFixed(digits); // Validate digits.
        path._format = function(x) { return round(x, digits); };
        return path;
    }
    ```

- [withIf](https://github.com/mindrones/d3-benchmarks/blob/master/src/path/withIf.js): instead of using a `format()` function, use ifs and round if we provided `digits`.
  ```js
  moveTo: function(x, y) {
    if (this._d) {
      this._ += `M${R(this._x0 = this._x1 = x, this._d)},${R(this._y0 = this._y1 = y, this._d)}`;
    } else {
      this._ += `M${this._x0 = this._x1 = x},${this._y0 = this._y1 = y}`;
    }
  },
  ```
  This implementation sort of duplicate code, so later on I'll add implementations assigning values to temporary vars, like:
  ```js
  moveTo: function(x, y) {
    this._x0 = this._x1 = this._d ? R(x, this._d) : x
    this._y0 = this._y1 = this._d ? R(y, this._d) : y
    this._ += `M${this._x0},${this._y0}`;
  },
  ```

This test saves the test execution time and the heap used by the instance of `p` after executing all commands.

Results are saved in `./data/path.json` as a list of objects like:

```js
{
    "impl": "path.current.path",
    "digits": null,
    "command": "moveTo",
    "calls": 1,
    "heap": 46464.64,
    "duration": 3.170281801295085e-7
}
```

- `impl`: name of the implementation
- `digits`: digits we passed to `path()`
- `command`: executed path command ('moveTo', 'lineTo', etc)
- `calls`: how many times we invoked the command on the path instance `p`
- `heap`: heap memory used by the `p` instance after calling the `coommand` `calls` times, in bytes
- `duration`: mean test execution time, in seconds


### round

Compare two rounding functions and `.toFixed()`, also coercing the input (be it a number or a string) to a number, to check the coercion impact on speed.

Tested implementations:

  - [mbostock's round](https://github.com/d3/d3-format/issues/32)
  - [MDN php-like round](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round#PHP-Like_rounding_Method)

Run with: `npm run round`.

Results are saved in `./data/rounding.json` as a list of objects like:

```js
{
  "impl": "round",
  "transform": null,
  "digits": 0,
  "duration": 1.5478552534985366e-8
},
```

- `impl`: name of the rounding implementation
- `transform`: input coercion
  - null: no coercion
  - 'CoerceNumber': `+N`
  - 'CoerceString': `+(N.toString())`
- `digits`: digits we passed to the rounding function
  - `round(N, digits)`,
  - `roundMDN(N, digits)`,
  - `N.toFixed(digits)`
- `duration`: mean test execution time, in seconds
