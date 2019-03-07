import {event, select} from 'd3-selection';
// import {schemeBlues} from 'd3-scale-chromatic';
import {scalePoint, scaleLinear} from 'd3-scale';
import {axisLeft, axisBottom} from 'd3-axis';
import {max, extent, bisectLeft} from 'd3-array';
import {area, line, curveLinear} from 'd3-shape';
import {format} from 'd3-format';
import {brushX, brushSelection} from 'd3-brush';
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
        overlap = 0.9,
        step = 30,
        x = scaleLinear(),
        y = scalePoint(),
        z = scaleLinear(),
        ridge = area()
            .curve(curveLinear)
            .defined(d => !isNaN(d))
            .x((d, i) => x(data.bins[i]))
            .y0(0)
            .y1(d => z(d)),
        crossridge = line()
            .x(d=>x(d.value))
            .y(d=>y(d.name)),
        foci=null, 
        hoverEnabled = false,
        brushEnabled = true,
        onBrushMove = null,
        onBrushEnd = null,
        listeners = dispatch('brushmove', 'brushend'),
        brush = brushX()
            .on("brush", brushmove)
            .on("end", brushend),
        highlights = null,
        handle = null;



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

            svg.append('g')
                
		}
        const visarea = svg.select('.visarea');
        const overlay = svg.select('.overlay');
        // update vis size
        height = data.series.length * step

		svg.attr('width', width)
            .attr('height', height);
            
        // visarea.attr('transform',
        //     'translate(' + margin.left + ',' + margin.top + ')');
        // console.log(margin, width, height)
        //save prev state if any
        // scale
        x.domain(extent(data.bins))
            .range([margin.left, width - margin.right]);
        y.domain(data.series.map(d => d.name))
            .range([margin.top, height - margin.bottom]);
        z.domain([0, max(data.series, d => max(d.values))]).nice()
            .range([0, -overlap * y.step()]);
        
        
        // console.log('x,y,z',x.domain(),y.domain(),z.domain());
        const group = visarea.selectAll(".group")
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
                // console.log(d.values);
                return ridge(d.values)
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
        if (highlights){
            visarea.selectAll('.crossridge')
                .data(highlights)
                .join('path')
                .attr('class', 'crossridge')
                .attr("fill", "none")
                .attr("stroke", "#FF3D00")
                .attr("d", d => crossridge(d));
        }
        // brush
        if (brushEnabled && group.select('.brush').empty()){
            group.append('g')
                .attr('class', 'brush');
        }else if (!brushEnabled){
            group.select('.brush').remove();
        }

        brush.extent([[margin.left, -overlap * y.step()], [width, 0]]);
        
        group.select('.brush').call(brush);

        handle = group.select('.brush')
            .selectAll(".handle--custom")
            .data(d=>[{parent:d,type: "w"}, {parent:d,type: "e"}])
            .join('path')
            .attr("class", "handle--custom")
            .attr('display', 'none')
            .attr("cursor", "ew-resize")
            .attr('stroke', '#9E9E9E')
            .attr("d", function(d) {
                var e = +(d.type == "e"),
                    dx = e ? 1 : -1,
                    dy = overlap*y.step();
                return "M" + (.5 * dx) + "," + dy + "A6,6 0 0 " + e + " " + (6.5 * dx) + "," + (dy + 6) + "V" + (2 * dy - 6) + "A6,6 0 0 " + e + " " + (.5 * dx) + "," + (2 * dy) + "Z" + "M" + (2.5 * dx) + "," + (dy + 8) + "V" + (2 * dy - 8) + "M" + (4.5 * dx) + "," + (dy + 8) + "V" + (2 * dy - 8);
            });
  
        group.select('.brush').each(function(d){
            if (this.__brush_selection){
                brush.move(select(this),this.__brush_selection.map(x));
            }
        });
        //axis
        let yAxisGroup = visarea.select('.y.axis');
		if (yAxisGroup.empty()) {
            yAxisGroup = visarea.append('g')
                .attr('class', 'y axis');
        }
        yAxisGroup.attr("transform", `translate(${margin.left},0)`)
            .call(axisLeft(y).tickSize(0).tickPadding(4))
            .call(g => g.select(".domain").remove())

        let xAxisGroup = visarea.select('.x.axis');
        if (xAxisGroup.empty()) {
            xAxisGroup = visarea.append('g')
                .attr('class', 'x axis');
        }
        xAxisGroup.attr("transform", `translate(0,${height - margin.bottom})`)
            .call(axisBottom(x)
            .ticks(width / 80)
            .tickSizeOuter(0));
        
        overlay.attr("width", width)
            .attr("height", height)
            .on("mouseover", ()=>{ foci.style("display", null); })
            .on("mouseout", ()=>{ foci.style("display", "none"); })
            .on("mousemove", mousemove);

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
    chart.brushEnabled = function(value){
        if (!arguments.length) return brushEnabled;
        brushEnabled = value;
        return chart;
    }
    chart.on = function() {
        var value = listeners.on.apply(listeners, arguments);
        return value === listeners ? chart : value;
    };
    
    function mousemove(){
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
        if (selection==null){
            handle.filter(d=>d.parent.name==row.name).attr('display', 'none');
        }else{
            handle.filter(d=>d.parent.name==row.name).attr('display', null)
                .attr('transform', (d,i)=>{
                    return `translate(${selection[i]},${-2*overlap * y.step()})`
                });
        }
        listeners.apply("brushmove", this, [event, ...arguments]);
        // console.log('brushmove');
    }
    function brushend(row){
        
        let selection = event.selection;
        // console.log('brushend', row, selection);
        if (selection==null){
            // console.log('nulllllll')
            handle.filter(d=>d.parent.name==row.name).attr('display', 'none');
        }else{
            handle.filter(d=>d.parent.name==row.name).attr('display', null)
                .attr('transform', function(d,i){
                    // console.log(this);
                    // console.log(d);
                    return `translate(${selection[i]},${-2*overlap * y.step()})`
                });
        }
        listeners.apply("brushend", this, [event, ...arguments]);

        //save brush state
        this.__brush_selection = brushSelection(this).map(x.invert);
    }


    return chart;
}