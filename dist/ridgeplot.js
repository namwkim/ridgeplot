(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('d3-scale'), require('d3-axis'), require('d3-array'), require('d3-shape')) :
  typeof define === 'function' && define.amd ? define(['d3-scale', 'd3-axis', 'd3-array', 'd3-shape'], factory) :
  (global = global || self, global.ridgeplot = factory(global.d3, global.d3, global.d3, global.d3));
}(this, function (d3Scale, d3Axis, d3Array, d3Shape) { 'use strict';

  // Computes the decimal coefficient and exponent of the specified number x with
  // significant digits p, where x is positive and p is in [1, 21] or undefined.
  // For example, formatDecimal(1.23) returns ["123", 0].
  function formatDecimal(x, p) {
    if ((i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e")) < 0) return null; // NaN, ±Infinity
    var i, coefficient = x.slice(0, i);

    // The string returned by toExponential either has the form \d\.\d+e[-+]\d+
    // (e.g., 1.2e+3) or the form \de[-+]\d+ (e.g., 1e+3).
    return [
      coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
      +x.slice(i + 1)
    ];
  }

  function exponent(x) {
    return x = formatDecimal(Math.abs(x)), x ? x[1] : NaN;
  }

  function formatGroup(grouping, thousands) {
    return function(value, width) {
      var i = value.length,
          t = [],
          j = 0,
          g = grouping[0],
          length = 0;

      while (i > 0 && g > 0) {
        if (length + g + 1 > width) g = Math.max(1, width - length);
        t.push(value.substring(i -= g, i + g));
        if ((length += g + 1) > width) break;
        g = grouping[j = (j + 1) % grouping.length];
      }

      return t.reverse().join(thousands);
    };
  }

  function formatNumerals(numerals) {
    return function(value) {
      return value.replace(/[0-9]/g, function(i) {
        return numerals[+i];
      });
    };
  }

  // [[fill]align][sign][symbol][0][width][,][.precision][~][type]
  var re = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;

  function formatSpecifier(specifier) {
    return new FormatSpecifier(specifier);
  }

  formatSpecifier.prototype = FormatSpecifier.prototype; // instanceof

  function FormatSpecifier(specifier) {
    if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);
    var match;
    this.fill = match[1] || " ";
    this.align = match[2] || ">";
    this.sign = match[3] || "-";
    this.symbol = match[4] || "";
    this.zero = !!match[5];
    this.width = match[6] && +match[6];
    this.comma = !!match[7];
    this.precision = match[8] && +match[8].slice(1);
    this.trim = !!match[9];
    this.type = match[10] || "";
  }

  FormatSpecifier.prototype.toString = function() {
    return this.fill
        + this.align
        + this.sign
        + this.symbol
        + (this.zero ? "0" : "")
        + (this.width == null ? "" : Math.max(1, this.width | 0))
        + (this.comma ? "," : "")
        + (this.precision == null ? "" : "." + Math.max(0, this.precision | 0))
        + (this.trim ? "~" : "")
        + this.type;
  };

  // Trims insignificant zeros, e.g., replaces 1.2000k with 1.2k.
  function formatTrim(s) {
    out: for (var n = s.length, i = 1, i0 = -1, i1; i < n; ++i) {
      switch (s[i]) {
        case ".": i0 = i1 = i; break;
        case "0": if (i0 === 0) i0 = i; i1 = i; break;
        default: if (i0 > 0) { if (!+s[i]) break out; i0 = 0; } break;
      }
    }
    return i0 > 0 ? s.slice(0, i0) + s.slice(i1 + 1) : s;
  }

  var prefixExponent;

  function formatPrefixAuto(x, p) {
    var d = formatDecimal(x, p);
    if (!d) return x + "";
    var coefficient = d[0],
        exponent = d[1],
        i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1,
        n = coefficient.length;
    return i === n ? coefficient
        : i > n ? coefficient + new Array(i - n + 1).join("0")
        : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i)
        : "0." + new Array(1 - i).join("0") + formatDecimal(x, Math.max(0, p + i - 1))[0]; // less than 1y!
  }

  function formatRounded(x, p) {
    var d = formatDecimal(x, p);
    if (!d) return x + "";
    var coefficient = d[0],
        exponent = d[1];
    return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient
        : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1)
        : coefficient + new Array(exponent - coefficient.length + 2).join("0");
  }

  var formatTypes = {
    "%": function(x, p) { return (x * 100).toFixed(p); },
    "b": function(x) { return Math.round(x).toString(2); },
    "c": function(x) { return x + ""; },
    "d": function(x) { return Math.round(x).toString(10); },
    "e": function(x, p) { return x.toExponential(p); },
    "f": function(x, p) { return x.toFixed(p); },
    "g": function(x, p) { return x.toPrecision(p); },
    "o": function(x) { return Math.round(x).toString(8); },
    "p": function(x, p) { return formatRounded(x * 100, p); },
    "r": formatRounded,
    "s": formatPrefixAuto,
    "X": function(x) { return Math.round(x).toString(16).toUpperCase(); },
    "x": function(x) { return Math.round(x).toString(16); }
  };

  function identity(x) {
    return x;
  }

  var prefixes = ["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"];

  function formatLocale(locale) {
    var group = locale.grouping && locale.thousands ? formatGroup(locale.grouping, locale.thousands) : identity,
        currency = locale.currency,
        decimal = locale.decimal,
        numerals = locale.numerals ? formatNumerals(locale.numerals) : identity,
        percent = locale.percent || "%";

    function newFormat(specifier) {
      specifier = formatSpecifier(specifier);

      var fill = specifier.fill,
          align = specifier.align,
          sign = specifier.sign,
          symbol = specifier.symbol,
          zero = specifier.zero,
          width = specifier.width,
          comma = specifier.comma,
          precision = specifier.precision,
          trim = specifier.trim,
          type = specifier.type;

      // The "n" type is an alias for ",g".
      if (type === "n") comma = true, type = "g";

      // The "" type, and any invalid type, is an alias for ".12~g".
      else if (!formatTypes[type]) precision == null && (precision = 12), trim = true, type = "g";

      // If zero fill is specified, padding goes after sign and before digits.
      if (zero || (fill === "0" && align === "=")) zero = true, fill = "0", align = "=";

      // Compute the prefix and suffix.
      // For SI-prefix, the suffix is lazily computed.
      var prefix = symbol === "$" ? currency[0] : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : "",
          suffix = symbol === "$" ? currency[1] : /[%p]/.test(type) ? percent : "";

      // What format function should we use?
      // Is this an integer type?
      // Can this type generate exponential notation?
      var formatType = formatTypes[type],
          maybeSuffix = /[defgprs%]/.test(type);

      // Set the default precision if not specified,
      // or clamp the specified precision to the supported range.
      // For significant precision, it must be in [1, 21].
      // For fixed precision, it must be in [0, 20].
      precision = precision == null ? 6
          : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision))
          : Math.max(0, Math.min(20, precision));

      function format(value) {
        var valuePrefix = prefix,
            valueSuffix = suffix,
            i, n, c;

        if (type === "c") {
          valueSuffix = formatType(value) + valueSuffix;
          value = "";
        } else {
          value = +value;

          // Perform the initial formatting.
          var valueNegative = value < 0;
          value = formatType(Math.abs(value), precision);

          // Trim insignificant zeros.
          if (trim) value = formatTrim(value);

          // If a negative value rounds to zero during formatting, treat as positive.
          if (valueNegative && +value === 0) valueNegative = false;

          // Compute the prefix and suffix.
          valuePrefix = (valueNegative ? (sign === "(" ? sign : "-") : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;
          valueSuffix = (type === "s" ? prefixes[8 + prefixExponent / 3] : "") + valueSuffix + (valueNegative && sign === "(" ? ")" : "");

          // Break the formatted value into the integer “value” part that can be
          // grouped, and fractional or exponential “suffix” part that is not.
          if (maybeSuffix) {
            i = -1, n = value.length;
            while (++i < n) {
              if (c = value.charCodeAt(i), 48 > c || c > 57) {
                valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
                value = value.slice(0, i);
                break;
              }
            }
          }
        }

        // If the fill character is not "0", grouping is applied before padding.
        if (comma && !zero) value = group(value, Infinity);

        // Compute the padding.
        var length = valuePrefix.length + value.length + valueSuffix.length,
            padding = length < width ? new Array(width - length + 1).join(fill) : "";

        // If the fill character is "0", grouping is applied after padding.
        if (comma && zero) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";

        // Reconstruct the final output based on the desired alignment.
        switch (align) {
          case "<": value = valuePrefix + value + valueSuffix + padding; break;
          case "=": value = valuePrefix + padding + value + valueSuffix; break;
          case "^": value = padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length); break;
          default: value = padding + valuePrefix + value + valueSuffix; break;
        }

        return numerals(value);
      }

      format.toString = function() {
        return specifier + "";
      };

      return format;
    }

    function formatPrefix(specifier, value) {
      var f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier)),
          e = Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3,
          k = Math.pow(10, -e),
          prefix = prefixes[8 + e / 3];
      return function(value) {
        return f(k * value) + prefix;
      };
    }

    return {
      format: newFormat,
      formatPrefix: formatPrefix
    };
  }

  var locale;
  var format;
  var formatPrefix;

  defaultLocale({
    decimal: ".",
    thousands: ",",
    grouping: [3],
    currency: ["$", ""]
  });

  function defaultLocale(definition) {
    locale = formatLocale(definition);
    format = locale.format;
    formatPrefix = locale.formatPrefix;
    return locale;
  }

  // import {select} from 'd3-selection';
  function ridgeplot () {
    // initialize
    var width = 500,
        height = 0,
        margin = {
      top: 40,
      left: 120,
      right: 20,
      bottom: 30
    },
        data = null,
        overlap = 0.9,
        step = 30,
        x = d3Scale.scaleLinear(),
        y = d3Scale.scalePoint(),
        z = d3Scale.scaleLinear(),
        ridge = d3Shape.area().curve(d3Shape.curveCardinal).defined(function (d) {
      return !isNaN(d);
    }).x(function (d, i) {
      return x(data.bins[i]);
    }).y0(0).y1(function (d) {
      return z(d);
    }),
        foci = null;

    function chart(selection) {
      // draw chart
      // let container = select(selection);
      data = selection.datum();
      console.log(data, selection);

      if (!data) {
        return;
      }

      var svg = selection.select('svg');

      if (svg.empty()) {
        // init
        svg = selection.append('svg');
        svg.append('g').attr('class', 'visarea');
        svg.append("rect").attr("class", "overlay").attr('fill', 'none').attr('pointer-events', 'all');
      }

      var visarea = svg.select('.visarea');
      var overlay = svg.select('.overlay'); // update vis size

      height = data.series.length * step;
      svg.attr('width', width).attr('height', height); // visarea.attr('transform',
      //     'translate(' + margin.left + ',' + margin.top + ')');

      console.log(margin, width, height); // scale

      x.domain(d3Array.extent(data.bins)).range([margin.left, width - margin.right]);
      y.domain(data.series.map(function (d) {
        return d.name;
      })).range([margin.top, height - margin.bottom]);
      z.domain([0, d3Array.max(data.series, function (d) {
        return d3Array.max(d.values);
      })]).nice().range([0, -overlap * y.step()]);
      console.log('x,y,z', x.domain(), y.domain(), z.domain());
      var group = visarea.selectAll("g").data(data.series).join("g").attr("transform", function (d) {
        return "translate(0,".concat(y(d.name) + 1, ")");
      }); // .attr("transform", (d, i) => `translate(0,${i * (step + 1) + margin.top})`);

      group.append("path").attr("fill", "#ddd").attr("d", function (d) {
        // console.log(d.values);
        return ridge(d.values);
      });
      var line = ridge.lineY1();
      group.append("path").attr("fill", "none").attr("stroke", "black").attr("d", function (d) {
        return line(d.values);
      });
      foci = group.append('g').attr("class", "focus").style("display", "none");
      console.log(foci);
      foci.append("circle").attr('fill', '#757575').attr("r", 2);
      foci.append("text").attr("x", 9).attr("font-size", 10).attr("paint-order", "stroke").attr('stroke', 'white').attr('fill', 'black').attr('stroke-width', '3').attr('stroke-linecap', 'round').attr("font-family", "sans-serif").attr("dy", ".35em"); //axis

      var yAxisGroup = visarea.select('.y.axis');

      if (yAxisGroup.empty()) {
        yAxisGroup = visarea.append('g').attr('class', 'y axis');
      }

      yAxisGroup.attr("transform", "translate(".concat(margin.left, ",0)")).call(d3Axis.axisLeft(y).tickSize(0).tickPadding(4)).call(function (g) {
        return g.select(".domain").remove();
      });
      var xAxisGroup = visarea.select('.x.axis');

      if (xAxisGroup.empty()) {
        xAxisGroup = visarea.append('g').attr('class', 'x axis');
      }

      xAxisGroup.attr("transform", "translate(0,".concat(height - margin.bottom, ")")).call(d3Axis.axisBottom(x).ticks(width / 80).tickSizeOuter(0));
      overlay.attr("width", width).attr("height", height).on("mouseover", function () {
        foci.style("display", null);
      }).on("mouseout", function () {
        foci.style("display", "none");
      }).on("mousemove", mousemove);
    }

    chart.width = function (value) {
      if (!arguments.length) return width;
      width = value;
      return chart;
    };

    chart.height = function (value) {
      if (!arguments.length) return height;
      height = value;
      return chart;
    };

    function mousemove() {
      var x0 = x.invert(d3.mouse(this)[0]),
          i = d3Array.bisectLeft(data.bins, x0, 1),
          d0 = data.bins[i - 1],
          d1 = data.bins[i],
          dx = x0 - d0 > d1 - x0 ? d1 : d0,
          di = x0 - d0 > d1 - x0 ? i : i - 1;
      foci.attr("transform", function (d) {
        return "translate(" + x(dx) + "," + z(d.values[di]) + ")";
      });
      foci.select("text").text(function (d) {
        return format(',')(d.values[di]);
      });
    }

    return chart;
  }

  return ridgeplot;

}));
