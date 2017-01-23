(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.d3 = global.d3 || {})));
}(this, (function (exports) { 'use strict';

var pi = Math.PI;
var tau = 2 * pi;
var epsilon = 1e-6;
var tauEpsilon = tau - epsilon;

function Path() {
  this._x0 = this._y0 = // start of current subpath
  this._x1 = this._y1 = null; // end of current subpath
  this._ = "";
}

function path() {
  return new Path;
}

Path.prototype = path.prototype = {
  constructor: Path,
  moveTo: function(x, y) {
    this._ += "M" + (this._x0 = this._x1 = +x) + "," + (this._y0 = this._y1 = +y);
  },
  closePath: function() {
    if (this._x1 !== null) {
      this._x1 = this._x0, this._y1 = this._y0;
      this._ += "Z";
    }
  },
  lineTo: function(x, y) {
    this._ += "L" + (this._x1 = +x) + "," + (this._y1 = +y);
  },
  quadraticCurveTo: function(x1, y1, x, y) {
    this._ += "Q" + (+x1) + "," + (+y1) + "," + (this._x1 = +x) + "," + (this._y1 = +y);
  },
  bezierCurveTo: function(x1, y1, x2, y2, x, y) {
    this._ += "C" + (+x1) + "," + (+y1) + "," + (+x2) + "," + (+y2) + "," + (this._x1 = +x) + "," + (this._y1 = +y);
  },
  arcTo: function(x1, y1, x2, y2, r) {
    x1 = +x1, y1 = +y1, x2 = +x2, y2 = +y2, r = +r;
    var x0 = this._x1,
        y0 = this._y1,
        x21 = x2 - x1,
        y21 = y2 - y1,
        x01 = x0 - x1,
        y01 = y0 - y1,
        l01_2 = x01 * x01 + y01 * y01;

    // Is the radius negative? Error.
    if (r < 0) { throw new Error("negative radius: " + r); }

    // Is this path empty? Move to (x1,y1).
    if (this._x1 === null) {
      this._ += "M" + (this._x1 = x1) + "," + (this._y1 = y1);
    }

    // Or, is (x1,y1) coincident with (x0,y0)? Do nothing.
    else if (!(l01_2 > epsilon)) {}

    // Or, are (x0,y0), (x1,y1) and (x2,y2) collinear?
    // Equivalently, is (x1,y1) coincident with (x2,y2)?
    // Or, is the radius zero? Line to (x1,y1).
    else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon) || !r) {
      this._ += "L" + (this._x1 = x1) + "," + (this._y1 = y1);
    }

    // Otherwise, draw an arc!
    else {
      var x20 = x2 - x0,
          y20 = y2 - y0,
          l21_2 = x21 * x21 + y21 * y21,
          l20_2 = x20 * x20 + y20 * y20,
          l21 = Math.sqrt(l21_2),
          l01 = Math.sqrt(l01_2),
          l = r * Math.tan((pi - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2),
          t01 = l / l01,
          t21 = l / l21;

      // If the start tangent is not coincident with (x0,y0), line to.
      if (Math.abs(t01 - 1) > epsilon) {
        this._ += "L" + (x1 + t01 * x01) + "," + (y1 + t01 * y01);
      }

      this._ += "A" + r + "," + r + ",0,0," + (+(y01 * x20 > x01 * y20)) + "," + (this._x1 = x1 + t21 * x21) + "," + (this._y1 = y1 + t21 * y21);
    }
  },
  arc: function(x, y, r, a0, a1, ccw) {
    x = +x, y = +y, r = +r;
    var dx = r * Math.cos(a0),
        dy = r * Math.sin(a0),
        x0 = x + dx,
        y0 = y + dy,
        cw = 1 ^ ccw,
        da = ccw ? a0 - a1 : a1 - a0;

    // Is the radius negative? Error.
    if (r < 0) { throw new Error("negative radius: " + r); }

    // Is this path empty? Move to (x0,y0).
    if (this._x1 === null) {
      this._ += "M" + x0 + "," + y0;
    }

    // Or, is (x0,y0) not coincident with the previous point? Line to (x0,y0).
    else if (Math.abs(this._x1 - x0) > epsilon || Math.abs(this._y1 - y0) > epsilon) {
      this._ += "L" + x0 + "," + y0;
    }

    // Is this arc empty? We’re done.
    if (!r) { return; }

    // Is this a complete circle? Draw two arcs to complete the circle.
    if (da > tauEpsilon) {
      this._ += "A" + r + "," + r + ",0,1," + cw + "," + (x - dx) + "," + (y - dy) + "A" + r + "," + r + ",0,1," + cw + "," + (this._x1 = x0) + "," + (this._y1 = y0);
    }

    // Otherwise, draw an arc!
    else {
      if (da < 0) { da = da % tau + tau; }
      this._ += "A" + r + "," + r + ",0," + (+(da >= pi)) + "," + cw + "," + (this._x1 = x + r * Math.cos(a1)) + "," + (this._y1 = y + r * Math.sin(a1));
    }
  },
  rect: function(x, y, w, h) {
    this._ += "M" + (this._x0 = this._x1 = +x) + "," + (this._y0 = this._y1 = +y) + "h" + (+w) + "v" + (+h) + "h" + (-w) + "Z";
  },
  toString: function() {
    return this._;
  }
};



var index$1 = Object.freeze({
	path: path
});

// https://github.com/d3/d3-format/issues/32
function round(x, n) {
  return n == null ? Math.round(x) : Math.round(x * (n = Math.pow(10, n))) / n;
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round#PHP-Like_rounding_Method
function roundMDN(x, n) {
    var factor = Math.pow(10, n);
    var tempNumber = x * factor;
    var roundedTempNumber = Math.round(tempNumber);
    return roundedTempNumber / factor;
}

var pi$1 = Math.PI;
var tau$1 = 2 * pi$1;
var epsilon$1 = 1e-6;
var tauEpsilon$1 = tau$1 - epsilon$1;

function Path$1() {
  this._x0 = this._y0 = // start of current subpath
  this._x1 = this._y1 = null; // end of current subpath
  this._ = "";
}

Path$1.prototype = path$2.prototype = {
  constructor: Path$1,
  _format: function(x) {
    return x;
  },
  moveTo: function(x, y) {
    this._ += "M" + this._format(this._x0 = this._x1 = +x) + "," + this._format(this._y0 = this._y1 = +y);
  },
  closePath: function() {
    if (this._x1 !== null) {
      this._x1 = this._x0, this._y1 = this._y0;
      this._ += "Z";
    }
  },
  lineTo: function(x, y) {
    this._ += "L" + this._format(this._x1 = +x) + "," + this._format(this._y1 = +y);
  },
  quadraticCurveTo: function(x1, y1, x, y) {
    this._ += "Q" + this._format(+x1) + "," + this._format(+y1) + "," + this._format(this._x1 = +x) + "," + this._format(this._y1 = +y);
  },
  bezierCurveTo: function(x1, y1, x2, y2, x, y) {
    this._ += "C" + this._format(+x1) + "," + this._format(+y1) + "," + this._format(+x2) + "," + this._format(+y2) + "," + this._format(this._x1 = +x) + "," + this._format(this._y1 = +y);
  },
  arcTo: function(x1, y1, x2, y2, r) {
    x1 = +x1, y1 = +y1, x2 = +x2, y2 = +y2, r = +r;
    var x0 = this._x1,
        y0 = this._y1,
        x21 = x2 - x1,
        y21 = y2 - y1,
        x01 = x0 - x1,
        y01 = y0 - y1,
        l01_2 = x01 * x01 + y01 * y01;

    // Is the radius negative? Error.
    if (r < 0) { throw new Error("negative radius: " + r); }

    // Is this path empty? Move to (x1,y1).
    if (this._x1 === null) {
      this._ += "M" + this._format(this._x1 = x1) + "," + this._format(this._y1 = y1);
    }

    // Or, is (x1,y1) coincident with (x0,y0)? Do nothing.
    else if (!(l01_2 > epsilon$1)) {}

    // Or, are (x0,y0), (x1,y1) and (x2,y2) collinear?
    // Equivalently, is (x1,y1) coincident with (x2,y2)?
    // Or, is the radius zero? Line to (x1,y1).
    else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon$1) || !r) {
      this._ += "L" + this._format(this._x1 = x1) + "," + this._format(this._y1 = y1);
    }

    // Otherwise, draw an arc!
    else {
      var x20 = x2 - x0,
          y20 = y2 - y0,
          l21_2 = x21 * x21 + y21 * y21,
          l20_2 = x20 * x20 + y20 * y20,
          l21 = Math.sqrt(l21_2),
          l01 = Math.sqrt(l01_2),
          l = r * Math.tan((pi$1 - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2),
          t01 = l / l01,
          t21 = l / l21;

      // If the start tangent is not coincident with (x0,y0), line to.
      if (Math.abs(t01 - 1) > epsilon$1) {
        this._ += "L" + this._format(x1 + t01 * x01) + "," + this._format(y1 + t01 * y01);
      }

      this._ += "A" + this._format(r) + "," + this._format(r) + ",0,0," + (+(y01 * x20 > x01 * y20)) + "," + this._format(this._x1 = x1 + t21 * x21) + "," + this._format(this._y1 = y1 + t21 * y21);
    }
  },
  arc: function(x, y, r, a0, a1, ccw) {
    x = +x, y = +y, r = +r;
    var dx = r * Math.cos(a0),
        dy = r * Math.sin(a0),
        x0 = x + dx,
        y0 = y + dy,
        cw = 1 ^ ccw,
        da = ccw ? a0 - a1 : a1 - a0;

    // Is the radius negative? Error.
    if (r < 0) { throw new Error("negative radius: " + r); }

    // Is this path empty? Move to (x0,y0).
    if (this._x1 === null) {
      this._ += "M" + this._format(x0) + "," + this._format(y0);
    }

    // Or, is (x0,y0) not coincident with the previous point? Line to (x0,y0).
    else if (Math.abs(this._x1 - x0) > epsilon$1 || Math.abs(this._y1 - y0) > epsilon$1) {
      this._ += "L" + this._format(x0) + "," + this._format(y0);
    }

    // Is this arc empty? We’re done.
    if (!r) { return; }

    // Is this a complete circle? Draw two arcs to complete the circle.
    if (da > tauEpsilon$1) {
      this._ += "A" + this._format(r) + "," + this._format(r) + ",0,1," + cw + "," + this._format(x - dx) + "," + this._format(y - dy) + "A" + this._format(r) + "," + this._format(r) + ",0,1," + cw + "," + this._format(this._x1 = x0) + "," + this._format(this._y1 = y0);
    }

    // Otherwise, draw an arc!
    else {
      if (da < 0) { da = da % tau$1 + tau$1; }
      this._ += "A" + this._format(r) + "," + this._format(r) + ",0," + (+(da >= pi$1)) + "," + cw + "," + this._format(this._x1 = x + r * Math.cos(a1)) + "," + this._format(this._y1 = y + r * Math.sin(a1));
    }
  },
  rect: function(x, y, w, h) {
    this._ += "M" + this._format(this._x0 = this._x1 = +x) + "," + this._format(this._y0 = this._y1 = +y) + "h" + this._format(+w) + "v" + this._format(+h) + "h" + this._format(-w) + "Z";
  },
  toString: function() {
    return this._;
  }
};

function path$2() {
  return new Path$1;
}

function pathCoerceFixed(digits) {
  var path = new Path$1;
  (digits = +digits).toFixed(digits); // Validate digits.
  path._format = function(x) { return +x.toFixed(digits); };
  return path;
}
function pathFixed(digits) {
  var path = new Path$1;
  (digits = +digits).toFixed(digits); // Validate digits.
  path._format = function(x) { return x.toFixed(digits); };
  return path;
}

function pathCoerceRound(digits) {
  var path = new Path$1;
  (digits = +digits).toFixed(digits); // Validate digits.
  path._format = function(x) { return round(+x, digits); };
  return path;
}
function pathRound(digits) {
  var path = new Path$1;
  (digits = +digits).toFixed(digits); // Validate digits.
  path._format = function(x) { return round(x, digits); };
  return path;
}


var withFormat = Object.freeze({
	path: path$2,
	pathCoerceFixed: pathCoerceFixed,
	pathFixed: pathFixed,
	pathCoerceRound: pathCoerceRound,
	pathRound: pathRound
});

var pi$2 = Math.PI;
var tau$2 = 2 * pi$2;
var epsilon$2 = 1e-6;
var tauEpsilon$2 = tau$2 - epsilon$2;

function Path$2(digits) {
  this._d = digits;
  this._x0 = this._y0 = // start of current subpath
  this._x1 = this._y1 = null; // end of current subpath
  this._ = "";
}

Path$2.prototype = path$3.prototype = {
  constructor: Path$2,
  moveTo: function(x, y) {
    if (this._d) {
      this._ += "M" + (round(this._x0 = this._x1 = x, this._d)) + "," + (round(this._y0 = this._y1 = y, this._d));
    } else {
      this._ += "M" + (this._x0 = this._x1 = x) + "," + (this._y0 = this._y1 = y);
    }
  },
  closePath: function() {
    if (this._x1 !== null) {
      this._x1 = this._x0, this._y1 = this._y0;
      this._ += "Z";
    }
  },
  lineTo: function(x, y) {
    if (this._d) {
      this._ += "L" + (round(this._x1 = x, this._d)) + "," + (round(this._y1 = y, this._d));
    } else {
      this._ += "L" + (this._x1 = x) + "," + (this._y1 = y);
    }
  },
  quadraticCurveTo: function(x1, y1, x, y) {
    if (this._d) {
      this._ += "Q" + (round(x1, this._d)) + "," + (round(y1, this._d)) + "," + (round(this._x1 = x, this._d)) + "," + (round(this._y1 = y, this._d));
    } else {
      this._ += "Q" + x1 + "," + y1 + "," + (this._x1 = x) + "," + (this._y1 = y);
    }
  },
  bezierCurveTo: function(x1, y1, x2, y2, x, y) {
    if (this._d) {
      this._ += "C" + (round(x1, this._d)) + "," + (round(y1, this._d)) + "," + (round(x2, this._d)) + "," + (round(y2, this._d)) + "," + (round(this._x1 = x, this._d)) + "," + (round(this._y1 = y, this._d));
    } else {
      this._ += "C" + x1 + "," + y1 + "," + x2 + "," + y2 + "," + (this._x1 = x) + "," + (this._y1 = y);
    }
  },
  arcTo: function(x1, y1, x2, y2, r) {
    x1 = +x1, y1 = +y1, x2 = +x2, y2 = +y2, r = +r;
    var x0 = this._x1,
        y0 = this._y1,
        x21 = x2 - x1,
        y21 = y2 - y1,
        x01 = x0 - x1,
        y01 = y0 - y1,
        l01_2 = x01 * x01 + y01 * y01;

    // Is the radius negative? Error.
    if (r < 0) { throw new Error("negative radius: " + r); }

    // Is this path empty? Move to (x1,y1).
    if (this._x1 === null) {
    //   this._ += "M" + this._format(this._x1 = x1) + "," + this._format(this._y1 = y1);
      this.moveTo(x1, y1);
    }

    // Or, is (x1,y1) coincident with (x0,y0)? Do nothing.
    else if (!(l01_2 > epsilon$2)) {}

    // Or, are (x0,y0), (x1,y1) and (x2,y2) collinear?
    // Equivalently, is (x1,y1) coincident with (x2,y2)?
    // Or, is the radius zero? Line to (x1,y1).
    else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon$2) || !r) {
    //   this._ += "L" + this._format(this._x1 = x1) + "," + this._format(this._y1 = y1);
        this.lineTo(x1, y1);
    }

    // Otherwise, draw an arc!
    else {
      var x20 = x2 - x0,
          y20 = y2 - y0,
          l21_2 = x21 * x21 + y21 * y21,
          l20_2 = x20 * x20 + y20 * y20,
          l21 = Math.sqrt(l21_2),
          l01 = Math.sqrt(l01_2),
          l = r * Math.tan((pi$2 - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2),
          t01 = l / l01,
          t21 = l / l21;

      // If the start tangent is not coincident with (x0,y0), line to.
      if (Math.abs(t01 - 1) > epsilon$2) {
        this.lineTo(x1 + t01 * x01, y1 + t01 * y01);
      }

      if (this._d) {
        this._ += "A" + (round(r, this._d)) + "," + (round(r, this._d)) + ",0,0," + (+(y01 * x20 > x01 * y20)) + "," + (round(this._x1 = x1 + t21 * x21, this._d)) + "," + (round(this._y1 = y1 + t21 * y21, this._d));
      } else {
          this._ += "A" + r + "," + r + ",0,0," + (+(y01 * x20 > x01 * y20)) + "," + (this._x1 = x1 + t21 * x21) + "," + (this._y1 = y1 + t21 * y21);
      }
    }
  },
  arc: function(x, y, r, a0, a1, ccw) {
    x = +x, y = +y, r = +r;
    var dx = r * Math.cos(a0),
        dy = r * Math.sin(a0),
        x0 = x + dx,
        y0 = y + dy,
        cw = 1 ^ ccw,
        da = ccw ? a0 - a1 : a1 - a0;

    // Is the radius negative? Error.
    if (r < 0) { throw new Error("negative radius: " + r); }

    // Is this path empty? Move to (x0,y0).
    if (this._x1 === null) {
        this.moveTo(x0, y0);
    }

    // Or, is (x0,y0) not coincident with the previous point? Line to (x0,y0).
    else if (Math.abs(this._x1 - x0) > epsilon$2 || Math.abs(this._y1 - y0) > epsilon$2) {
        this.lineTo(x0, y0);
    }

    // Is this arc empty? We’re done.
    if (!r) { return; }

    // Is this a complete circle? Draw two arcs to complete the circle.
    if (da > tauEpsilon$2) {
        if (this._d) {
          this._ += "A" + (r = round(r, this._d)) + "," + r + ",0,1," + cw + "," + (round(x - dx, this._d)) + "," + (round(y - dy, this._d)) + ",A" + r + "," + r + ",0,1," + cw + "," + (round(this._x1 = x0, this._d)) + "," + (round(this._y1 = y0, this._d));
        } else {
          this._ += "A" + r + "," + r + ",0,1," + cw + "," + (x - dx) + "," + (y - dy) + ",A" + r + "," + r + ",0,1," + cw + "," + (this._x1 = x0) + "," + (this._y1 = y0);
        }
    }

    // Otherwise, draw an arc!
    else {
      if (da < 0) { da = da % tau$2 + tau$2; }
      if (this._d) {
        this._ += "A" + (round(r, this._d)) + "," + (round(r, this._d)) + ",0," + (+(da >= pi$2)) + "," + cw + "," + (round(this._x1 = x + r * Math.cos(a1), this._d)) + "," + (round(this._y1 = y + r * Math.sin(a1), this._d));
      } else {
        this._ += "A" + r + "," + r + ",0," + (+(da >= pi$2)) + "," + cw + "," + (this._x1 = x + r * Math.cos(a1)) + "," + (this._y1 = y + r * Math.sin(a1));
      }
    }
  },
  rect: function(x, y, w, h) {
    if (this._d) {
      this._ += "M" + (round(this._x0 = this._x1 = x, this._d)) + "," + (round(this._y0 = this._y1 = y, this._d)) + "h" + (round(w, this._d)) + "v" + (round(h, this._d)) + "h" + (round(-w, this._d)) + "Z";
    } else {
      this._ += "M" + (this._x0 = this._x1 = x) + "," + (this._y0 = this._y1 = y) + "h" + w + "v" + h + "h" + (-w) + "Z";
    }
  },
  toString: function() {
    return this._;
  }
};

function path$3(digits) {
  (digits = +digits).toFixed(digits); // Validate digits.
  return new Path$2(digits);
}


var withIf = Object.freeze({
	path: path$3
});



var index = Object.freeze({
	current: index$1,
	withFormat: withFormat,
	withIf: withIf
});

exports.path = index;
exports.round = round;
exports.roundMDN = roundMDN;

Object.defineProperty(exports, '__esModule', { value: true });

})));
