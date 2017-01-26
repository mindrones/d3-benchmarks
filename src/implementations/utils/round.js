// https://github.com/d3/d3-format/issues/32
export function round(x, n) {
  return n == null ? Math.round(x) : Math.round(x * (n = Math.pow(10, n))) / n;
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round#PHP-Like_rounding_Method
export function roundMDN(x, n) {
    var factor = Math.pow(10, n);
    var tempNumber = x * factor;
    var roundedTempNumber = Math.round(tempNumber);
    return roundedTempNumber / factor;
}
