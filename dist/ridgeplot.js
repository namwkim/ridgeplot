(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('d3-selection'), require('d3-scale'), require('d3-axis'), require('d3-array'), require('d3-shape'), require('d3-format'), require('d3-brush'), require('d3-dispatch')) :
  typeof define === 'function' && define.amd ? define(['d3-selection', 'd3-scale', 'd3-axis', 'd3-array', 'd3-shape', 'd3-format', 'd3-brush', 'd3-dispatch'], factory) :
  (global = global || self, global.ridgeplot = factory(global.d3, global.d3, global.d3, global.d3, global.d3, global.d3, global.d3, global.d3));
}(this, function (d3Selection, d3Scale, d3Axis, d3Array, d3Shape, d3Format, d3Brush, d3Dispatch) { 'use strict';

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
        responsive = false,
        selectable = true,
        overlap = 0.9,
        step = 30,
        x = d3Scale.scaleLinear(),
        y = d3Scale.scalePoint(),
        z = d3Scale.scaleLinear(),
        ridge = d3Shape.area().curve(d3Shape.curveLinear).defined(function (d) {
      return !isNaN(d);
    }).x(function (d, i) {
      return x(data.bins[i]);
    }).y0(0).y1(function (d) {
      return z(d);
    }),
        crossridge = d3Shape.line().x(function (d) {
      return x(d.value);
    }).y(function (d) {
      return y(d.name);
    }),
        foci = null,
        hoverEnabled = false,
        brushEnabled = true,
        xAxisLabelFormat = null,
        yAxisLabelFormat = null,
        listeners = d3Dispatch.dispatch('brushmove', 'brushend', 'selectrow'),
        brush = d3Brush.brushX().on("brush", brushmove).on("end", brushend),
        highlights = null,
        handle = null,
        group = null;

    function chart(selection) {
      // draw chart
      // let container = select(selection);
      data = selection.datum(); // console.log(data, selection);

      if (!data) {
        return;
      }

      var svg = selection.select('svg');

      if (svg.empty()) {
        // init
        svg = selection.append('svg');
        svg.append('g').attr('class', 'visarea');
        svg.append("rect").attr("class", "overlay").attr('fill', 'none');
        svg.append('g');
      }

      var visarea = svg.select('.visarea');
      var overlay = svg.select('.overlay'); // update vis size

      if (responsive) {
        svg.attr('width', '100%').attr('height', '100%');
        var rect = svg.node().getBoundingClientRect();
        console.log(rect);
        height = rect.height;
        step = height / data.series.length;
      } else {
        height = data.series.length * step;
        svg.attr('width', width).attr('height', height);
      } // scales


      x.domain(d3Array.extent(data.bins)).range([margin.left, width - margin.right]);
      y.domain(data.series.map(function (d) {
        return d.name;
      })).range([margin.top, height - margin.bottom]);
      z.domain([0, d3Array.max(data.series, function (d) {
        return d3Array.max(d.values);
      })]).nice().range([0, -overlap * y.step()]); //axis

      var yAxisGroup = visarea.select('.y.axis');

      if (yAxisGroup.empty()) {
        yAxisGroup = visarea.append('g').attr('class', 'y axis');
      }

      yAxisGroup.attr("transform", "translate(".concat(selectable ? margin.left - 24 : margin.left, ",0)")).call(d3Axis.axisLeft(y).tickSize(0).tickPadding(4)).call(function (g) {
        return g.select(".domain").remove();
      });
      var xAxisGroup = visarea.select('.x.axis');

      if (xAxisGroup.empty()) {
        xAxisGroup = visarea.append('g').attr('class', 'x axis');
      }

      xAxisGroup.attr("transform", "translate(0,".concat(height - margin.bottom, ")")).call(d3Axis.axisBottom(x).ticks(width / 80).tickSizeOuter(0)); // console.log('x,y,z',x.domain(),y.domain(),z.domain());

      group = visarea.selectAll(".group").data(data.series).join("g").attr('class', 'group').attr("transform", function (d) {
        return "translate(0,".concat(y(d.name) + 1, ")");
      }); // .attr("transform", (d, i) => `translate(0,${i * (step + 1) + margin.top})`);

      group.selectAll('.area').data(function (d) {
        return [d];
      }).join("path").attr('class', 'area').attr("fill", "#ddd").attr("d", function (d) {
        return ridge(d.values);
      });
      var line = ridge.lineY1();
      group.selectAll('.line').data(function (d) {
        return [d];
      }).join("path").attr('class', 'line').attr("fill", "none").attr("stroke", "black").attr("d", function (d) {
        return line(d.values);
      });

      if (selectable = true) {
        group.selectAll('.checkbox').data(function (d) {
          return [d];
        }).join(function (enter) {
          return enter.append("foreignObject").attr('class', 'checkbox').attr('x', margin.left - 24).attr('y', -10).attr('width', 24).attr('height', 24).append("xhtml:input").attr("type", "checkbox").attr("name", function (d) {
            return d.name;
          }).on('change', selectrow);
        });
      }

      if (group.select('.focus').empty() && hoverEnabled) {
        foci = group.append('g').attr("class", "focus").style("display", "none"); // console.log(foci);

        foci.append("circle").attr('fill', '#757575').attr("r", 2);
        foci.append("text").attr("x", 9).attr("font-size", 10).attr("paint-order", "stroke").attr('stroke', 'white').attr('fill', 'black').attr('stroke-width', '3').attr('stroke-linecap', 'round').attr("font-family", "sans-serif").attr("dy", ".35em");
        overlay.attr('pointer-events', 'all');
      } else if (!hoverEnabled) {
        group.select('.focus').remove();
        overlay.attr('pointer-events', 'none');
      } // visualize highlights


      if (highlights) {
        visarea.selectAll('.crossridge').data(highlights).join('path').attr('class', 'crossridge').attr("fill", "none").attr('stroke-opacity', 0.5).attr("stroke", "#FFA500").attr("d", function (d) {
          return crossridge(d);
        });
      } // brush


      if (brushEnabled && group.select('.brush').empty()) {
        group.append('g').attr('class', 'brush');
      } else if (!brushEnabled) {
        group.select('.brush').remove();
      }

      brush.extent([[margin.left, -overlap * y.step() / 4], [width - margin.right, overlap * y.step() / 4]]);
      group.select('.brush').call(brush); //brush customize

      handle = group.select('.brush').selectAll(".handle--custom").data(function (d) {
        return [{
          parent: d,
          type: "w"
        }, {
          parent: d,
          type: "e"
        }];
      }).join('path').attr("class", "handle--custom").attr('display', 'none').attr("cursor", "ew-resize").attr('fill', '#eee').attr('stroke', '#757575') // .attr('y0', 1)
      // .attr('y1', -overlap*y.step()+1); 
      .attr("d", function (d) {
        var e = +(d.type == "e"),
            dx = e ? 3 : -3,
            dy = overlap * y.step() / 4;
        return "M" + dx + "," + -dy + "V" + dy + "H" + -dx + "V" + -dy + "Z" + "M" + 0 + "," + (-dy + dy / 2) + "V" + (dy - dy / 2);
      }); // disable overlay brush

      group.select('.brush').select('.overlay').style('cursor', 'auto').on('mousedown', null); // disable brush area

      group.select('.brush .selection').attr('fill-opacity', 0).style('cursor', 'auto').attr('fill', null).attr('stroke', null);
      group.select('.brush').each(function (d) {
        if (this.__brush_selection) {
          brush.move(d3Selection.select(this), this.__brush_selection.map(x));
        } else {
          brush.move(d3Selection.select(this), d3Array.extent(data.bins).map(x));
        }
      });
      overlay.attr("width", width).attr("height", height).on("mouseover", function () {
        foci.style("display", null);
      }).on("mouseout", function () {
        foci.style("display", "none");
      }).on("mousemove", focusmove);
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

    chart.responsive = function (value) {
      if (!arguments.length) return responsive;
      responsive = value;
      return chart;
    };

    chart.hoverEnabled = function (value) {
      if (!arguments.length) return hoverEnabled;
      hoverEnabled = value;
      return chart;
    };

    chart.highlights = function (value) {
      if (!arguments.length) return highlights;
      highlights = value;
      return chart;
    };

    chart.margin = function (value) {
      if (!arguments.length) return margin;
      margin = value;
      return chart;
    };

    chart.x = function (value) {
      if (!arguments.length) return x;
      x = value;
      return chart;
    };

    chart.y = function (value) {
      if (!arguments.length) return y;
      y = value;
      return chart;
    };

    chart.overlap = function (value) {
      if (!arguments.length) return overlap;
      overlap = value;
      return chart;
    };

    chart.brushEnabled = function (value) {
      if (!arguments.length) return brushEnabled;
      brushEnabled = value;
      return chart;
    };

    chart.xAxisLabelFormat = function (value) {
      if (!arguments.length) return xAxisLabelFormat;
      xAxisLabelFormat = value;
      return chart;
    };

    chart.yAxisLabelFormat = function (value) {
      if (!arguments.length) return yAxisLabelFormat;
      yAxisLabelFormat = value;
      return chart;
    };

    chart.on = function () {
      var value = listeners.on.apply(listeners, arguments);
      return value === listeners ? chart : value;
    };

    function selectrow(d) {
      listeners.apply("selectrow", this, [d.name, this.checked]);
    }

    function focusmove() {
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
        return d3Format.format(',')(d.values[di]);
      });
    }

    function brushmove(row) {
      var selection = d3Selection.event.selection;
      group.select('.brush').select('.overlay').attr('cursor', 'ew-resize');

      if (selection == null) {
        handle.filter(function (d) {
          return d.parent.name == row.name;
        }).attr('display', 'none');
      } else {
        handle.filter(function (d) {
          return d.parent.name == row.name;
        }).attr('display', null).attr('transform', function (d, i) {
          return "translate(".concat(selection[i], ",", 0, ")");
        });
        var dataSelection = selection.map(x.invert);
        group.filter(function (d) {
          return d.name == row.name;
        }).selectAll('.area').attr("d", function (d) {
          var sidx = data.bins.findIndex(function (value) {
            return value >= dataSelection[0];
          });
          var eidx = data.bins.length - data.bins.slice().reverse().findIndex(function (value) {
            return value <= dataSelection[1];
          });
          ridge.defined(function (d, i) {
            return i >= sidx && i < eidx;
          });
          return ridge(d.values);
        });
      }

      listeners.apply("brushmove", this, [selection ? selection.map(x.invert) : null, selection].concat(Array.prototype.slice.call(arguments))); // console.log('brushmove');
    }

    function brushend(row) {
      var selection = d3Selection.event.selection;

      if (selection == null) {
        // console.log('nulllllll')
        // handle.filter(d=>d.parent.name==row.name).attr('display', 'none');
        brush.move(d3Selection.select(this), d3Array.extent(data.bins).map(x));
      } else {
        handle.filter(function (d) {
          return d.parent.name == row.name;
        }).attr('display', null).attr('transform', function (d, i) {
          // console.log(this);
          // console.log(d);
          return "translate(".concat(selection[i], ",", 0, ")");
        }); //save brush state

        var dataSelection = selection.map(x.invert);
        this.__brush_selection = dataSelection;
        group.filter(function (d) {
          return d.name == row.name;
        }).selectAll('.area').attr("d", function (d) {
          var sidx = data.bins.findIndex(function (value) {
            return value >= dataSelection[0];
          });
          var eidx = data.bins.length - data.bins.slice().reverse().findIndex(function (value) {
            return value <= dataSelection[1];
          });
          ridge.defined(function (d, i) {
            return i >= sidx && i < eidx;
          });
          return ridge(d.values);
        });
      }

      listeners.apply("brushend", this, [selection ? selection.map(x.invert) : null, selection].concat(Array.prototype.slice.call(arguments)));
    }

    return chart;
  }

  return ridgeplot;

}));
