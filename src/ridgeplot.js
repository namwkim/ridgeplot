import {event, select} from 'd3-selection';
// import {schemeBlues} from 'd3-scale-chromatic';
import {scalePoint, scaleLog, scaleLinear} from 'd3-scale';
import {axisLeft, axisBottom} from 'd3-axis';
import {min, max, extent, bisectLeft} from 'd3-array';
import {area, line, curveLinear} from 'd3-shape';
import {format} from 'd3-format';
import {brushX} from 'd3-brush';
import {dispatch} from 'd3-dispatch';

export default function(){
    // initialize

    let width = 500, 
        height = 0,
        margin = {
            top: 40,
            left: 120,
            right: 20,
            bottom: 30
        },
        data = null,
        responsive = false,
        overlap = 0.9,
        step = 30,
        x = scaleLinear(),
        y = scalePoint(),
		z = scaleLog(),
		tz = null,
        ridge = area()
            .curve(curveLinear)
            .defined(d => !isNaN(d))
            .x((d, i) => x(data.bins[i]))
            .y0(0)
            .y1(d =>z(d+tz)),
        crossridge = line()
            .x(d=>x(d.value))
            .y(d=>y(d.name)),
        foci=null, 
        hoverEnabled = false,
        brushEnabled = true,
        onBrushMove = null,
		onBrushEnd = null,
		xAxisLabelFormat = format(',.0f'),
		yAxisLabelFormat = null,
        listeners = dispatch('brushmove', 'brushend', 'selectrow'),
        ranges = {},
        brush = brushX()
            .on("brush", brushmove)
            .on("end", brushend),
        highlights = null,
        exponent = 0.025,
        // highlightScale = scalePow().exponent(-0.5). range([1]),
        handle = null,
        group = null,
        highlightGroup = null;;



    function chart(selection){
        // draw chart
        // let container = select(selection);
        data = selection.datum();

        // console.log(data, selection);
        if (!data){
            return;
        }
        let svg = selection.select('svg');
		if (svg.empty()) { // init
			svg = selection.append('svg');
			svg.append('g')
                .attr('class', 'visarea');
            
            svg.append("rect")
                .attr("class", "overlay")
                .attr('fill', 'none');

            var gradient = svg.append("defs")
                .append("linearGradient")
                  .attr("id", "knobGradient")
                  .attr("x1", "0%")
                  .attr("y1", "0%")
                  .attr("x2", "100%")
                  .attr("y2", "100%");
              
              gradient.append("stop")
                  .attr("offset", "0%")
                  .attr("stop-color", "#fff");
              
              gradient.append("stop")
                  .attr("offset", "100%")
                  .attr("stop-color", "#eee");
		}
        const visarea = svg.select('.visarea');
        const overlay = svg.select('.overlay');

        // update vis size
        if (responsive){
            svg.attr('width', '100%')
                .attr('height', '100%');
            let rect = svg.node().getBoundingClientRect();
            height = rect.height;
            step = height/data.series.length;
        }else{
            height = data.series.length * step;
            svg.attr('width', width)
             .attr('height', height);
        }

        // scales
        x.domain(extent(data.bins))
            .range([margin.left, width - margin.right]);
        y.domain(data.series.map(d => d.name))
			.range([margin.top, height - margin.bottom]);

		tz = min(data.series, d => min(d.values.filter(v=>v>0)))/2; // non-zero min /2 
		z.domain([tz, max(data.series, d => max(d.values))+tz])
			.range([0, -overlap * y.step()]);
        //axis
        let yAxisGroup = visarea.select('.y.axis');
        if (yAxisGroup.empty()) {
            yAxisGroup = visarea.append('g')
                .attr('class', 'y axis');
        }
        yAxisGroup.attr("transform", `translate(${margin.left-5},0)`)
            .call(axisLeft(y).tickSize(0).tickPadding(4).tickFormat(yAxisLabelFormat))
            .call(g => g.select(".domain").remove())

        yAxisGroup.selectAll('.tick > text')
            .attr('fill', function(){ 
                return this.__selected?'#000':'#9e9e9e';
            })
            .attr('font-weight', function(){
                return this.__selected?'bold':'normal'
            })
            .attr('cursor', 'pointer')
            .on('click', selectrow);

        let xAxisGroup = visarea.select('.x.axis');
        if (xAxisGroup.empty()) {
            xAxisGroup = visarea.append('g')
                .attr('class', 'x axis');
        }
        xAxisGroup.attr("transform", `translate(0,${height - margin.bottom})`)
            .call(axisBottom(x)
            .ticks(width / 80)
            .tickSizeOuter(0)
            .tickFormat(xAxisLabelFormat));
        xAxisGroup.selectAll('.tick')
            .select('line')
            .attr('stroke', '#9e9e9e')
        xAxisGroup.selectAll('.tick').select('text')
            .attr('fill', '#9e9e9e');


        // console.log('x,y,z',x.domain(),y.domain(),z.domain());
        group = visarea.selectAll(".group")
            .data(data.series)
            .join("g")
            .attr('class', 'group')
            .attr("transform", d => `translate(0,${y(d.name) + 1})`);
                // .attr("transform", (d, i) => `translate(0,${i * (step + 1) + margin.top})`);
        
        group.selectAll('.area')
            .data(d=>[d])
            .join("path")
            .attr('class', 'area')
            .attr("fill", "#ddd")
            .attr("d", d=>{
                return ridge(d.values);
            });
        
        let line = ridge.lineY1();
        group.selectAll('.line')
            .data(d=>[d])
            .join("path")
            .attr('class', 'line')
            .attr("fill", "none")
            .attr("stroke", "black")
            .attr("d", d => line(d.values));
        
        if (group.select('.focus').empty() && hoverEnabled){
            foci = group.append('g')
            .attr("class", "focus")
            .style("display", "none");
        
            // console.log(foci);
            foci.append("circle")
                .attr('fill', '#757575')
                .attr("r", 2);
        
            foci.append("text")
                .attr("x", 9)
                .attr("font-size", 10)
                .attr("paint-order","stroke")
                .attr('stroke', 'white')
                .attr('fill', 'black')
                .attr('stroke-width', '3')
                .attr('stroke-linecap', 'round')
                .attr("font-family", "sans-serif")
                .attr("dy", ".35em");	

            overlay.attr('pointer-events', 'all');
        }else if (!hoverEnabled){
            group.select('.focus').remove();
            overlay.attr('pointer-events', 'none');
        }
        // visualize highlights
        if (highlights && highlights.length>0){
            // console.log('highlights.length', highlights.length, Math.pow(highlights.length, -exponent));
            highlightGroup = visarea.selectAll('.crossridge')
                .data(highlights)
                .join('path')
                .attr('class', 'crossridge')
                .attr("fill", "none")
                .attr('stroke-opacity', d=>highlightVisible(d) ? Math.max(0.025, 1.0/(highlights.length/10)) : 0.0)//highlightScale.domain([1, highlights.length])(highlights.length))
                .attr("stroke", "#FFA500")
                .attr("d", d => crossridge(d));
        }

        // brush
        if (brushEnabled && group.select('.brush').empty()){
            group.append('g')
                .attr('class', 'brush');
        }else if (!brushEnabled){
            group.select('.brush').remove();
        }

        brush.extent([[margin.left, -overlap * y.step()/4], [width-margin.right, overlap * y.step()/4]]);
        
        group.select('.brush').call(brush);

        //brush customize
        handle = group.select('.brush')
            .selectAll(".handle--custom")
            .data(d=>[{parent:d,type: "w"}, {parent:d,type: "e"}])
            .join('g')
            .attr("class", "handle--custom")
            .attr('display', 'none')
            .attr("cursor", "ew-resize");

        handle.selectAll('.label')
            .data(d=>[d])
            .join('text')
            .attr('class', 'label')
            .attr('fill', '#757575')
            .attr('visibility',  'hidden')
            .attr('font-size', '9px')
            .attr('font-family', 'arial')
            .attr('alignment-baseline', 'baseline')
            .attr('text-anchor', 'middle')
            .attr('dy', -(y.step()/4+1)+'px');
        
        handle.selectAll('.knob')
            .data(d=>[d])
            // .join('path')
            .join('rect')
            .attr('class', 'knob')
            .attr('stroke', '#757575')
            .attr('fill', 'url(#knobGradient)')
            .attr('x', -3)
            .attr('y', -overlap*y.step()/4)
            .attr('width', 6)
            .attr('height', overlap*y.step()/2)
            .attr('rx', 2)
            .attr('rx', 2)
            // .attr('y0', 1)
            // .attr('y1', -overlap*y.step()+1); 
            // .attr("d", function(d) {
            //     var e = +(d.type == "e"),
            //         dx = e ? 3 : -3,
            //         dy = overlap*y.step()/4;
            //     return "M" + (dx) + "," + (-dy) +  "V" + ( dy) + "H" + (-dx) + "V"+  (- dy)+ "Z" + "M" + (0) + "," + (-dy + dy/2) + "V" + (dy - dy/2);
            // });
        
        // disable overlay brush
        group.select('.brush').select('.overlay')
            .style('cursor', 'auto')
            .on('mousedown', null);
        // disable brush area
        group.select('.brush .selection')
            .attr('fill-opacity',0)
            .style('cursor', 'auto')
            .attr('fill', null)
            .attr('stroke', null);
        group.select('.brush').each(function(d){
            this.__brush_initializing = true;
            if (this.__brush_selection){
                brush.move(select(this),this.__brush_selection.map(x));
            }else{                
                brush.move(select(this),extent(data.bins).map(x));
            }
        });

        
        overlay.attr("width", width)
            .attr("height", height)
            .on("mouseover", ()=>{ foci.style("display", null); })
            .on("mouseout", ()=>{ foci.style("display", "none"); })
            .on("mousemove", focusmove);

    }
    chart.width = function(value) {
        if (!arguments.length) return width;
        width = value;
        return chart;
    };

    chart.height = function(value) {
        if (!arguments.length) return height;
        height = value;
        return chart;
    };
    chart.responsive = function(value) {
        if (!arguments.length) return responsive;
        responsive = value;
        return chart;
    };
    chart.hoverEnabled = function(value){
        if (!arguments.length) return hoverEnabled;
        hoverEnabled = value;
        return chart;
    }
    chart.highlights = function(value){
        if (!arguments.length) return highlights;
        highlights = value;
        return chart;
    }
    chart.margin = function(value) {
        if (!arguments.length) return margin;
        margin = value;
        return chart;
    };
    chart.x = function(value) {
        if (!arguments.length) return x;
        x = value;
        return chart;
    };
    chart.y = function(value) {
        if (!arguments.length) return y;
        y = value;
        return chart;
	};
	chart.z = function(value) {
        if (!arguments.length) return z;
        z = value;
        return chart;
    };
    chart.overlap = function(value) {
        if (!arguments.length) return overlap;
        overlap = value;
        return chart;
    };
    chart.exponent = function(value) {
        if (!arguments.length) return exponent;
        exponent = value;
        return chart;
    };
    chart.brushEnabled = function(value){
        if (!arguments.length) return brushEnabled;
        brushEnabled = value;
        return chart;
	}
	chart.xAxisLabelFormat = function(value){
		if (!arguments.length) return xAxisLabelFormat;
        xAxisLabelFormat = value;
        return chart;
	}
	chart.yAxisLabelFormat = function(value){
		if (!arguments.length) return yAxisLabelFormat;
        yAxisLabelFormat = value;
        return chart;
	}
    chart.on = function() {
        var value = listeners.on.apply(listeners, arguments);
        return value === listeners ? chart : value;
    };
    function selectrow(d){
        this.__selected = this.__selected?false:true;
        // console.log(d);
        select(this)
            .attr('font-weight', this.__selected?'bold':'normal')
            .attr('fill', this.__selected?'#000':'#9e9e9e');
        
        listeners.apply("selectrow", this, [d, this.__selected]);
    }
    function focusmove(){
        var x0 = x.invert(d3.mouse(this)[0]),
        i = bisectLeft(data.bins, x0, 1),
        d0 = data.bins[i - 1],
        d1 = data.bins[i],
        dx = x0 - d0 > d1 - x0 ? d1 : d0,
        di = x0 - d0 > d1 - x0 ? i : i-1;
        foci.attr("transform", d=>"translate(" + x(dx) + "," + z(d.values[di]) + ")");
        foci.select("text").text(d=>{
            return format(',')(d.values[di]);
        });
    }
    function brushmove(row){
        let selection = event.selection;
        group.select('.brush').select('.overlay').attr('cursor', 'ew-resize');
        if (selection==null){
            handle.filter(d=>d.parent.name==row.name).attr('display', 'none');
        }else{
            let dataSelection = selection.map(x.invert);
            ranges[row.name] = dataSelection;
            handle.filter(d=>d.parent.name==row.name).attr('display', null)
                .attr('transform', (d,i)=>{
                    return `translate(${selection[i]},${0})`
                }).select('.label')
                .attr('visibility',  'visible')
                .text((d,i)=>xAxisLabelFormat(dataSelection[i]));
            
            group.filter(d=>d.name==row.name).selectAll('.area')
                .attr("d", d=>{
                    let sidx = data.bins.findIndex(value=>value>=dataSelection[0]);
                    let eidx = data.bins.length - data.bins.slice().reverse().findIndex(value=>value<=dataSelection[1]);
                    ridge.defined((d,i)=>i>=sidx && i<eidx);
                    return ridge(d.values);
                });
            if (highlights && highlights.length>0){
                // console.log('highlights.length', highlights.length, Math.pow(highlights.length, -exponent));
                highlightGroup
                    .attr('stroke-opacity',d=>highlightVisible(d)? Math.pow(highlights.length, -exponent):0.0);
            }
        }
        listeners.apply("brushmove", this, [selection?selection.map(x.invert):null,selection, row, this.__brush_initializing]);
        // console.log('brushmove');
    }
    function brushend(row){
        
        let selection = event.selection;
        if (selection==null){
            brush.move(select(this),extent(data.bins).map(x));
        }else{
            //save brush state
            let dataSelection = selection.map(x.invert);
            this.__brush_selection = dataSelection;
            ranges[row.name] = dataSelection;

            handle.filter(d=>d.parent.name==row.name).attr('display', null)
                .attr('transform', function(d,i){
                    return `translate(${selection[i]},${0})`
                }).select('.label')
                .attr('visibility',  'hidden')
                .text((d,i)=>xAxisLabelFormat(dataSelection[i]));


            group.filter(d=>d.name==row.name).selectAll('.area')
                .attr("d", d=>{
                    let sidx = data.bins.findIndex(value=>value>=dataSelection[0]);
                    let eidx = data.bins.length - data.bins.slice().reverse().findIndex(value=>value<=dataSelection[1]);
                    ridge.defined((d,i)=>i>=sidx && i<eidx);
                    return ridge(d.values);
                });
        }
        listeners.apply("brushend", this, [selection?selection.map(x.invert):null,selection, row, this.__brush_initializing]);
        this.__brush_initializing = false;
        
    }
    function highlightVisible(ds){
        if (Object.values(ranges).length>0){
            return !ds.some(d=>ranges[d.name]? (d.value<ranges[d.name][0]|| d.value > ranges[d.name][1]):true);
        }else{
            return true;
        }
    }


    return chart;
}