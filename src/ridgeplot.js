// import {select} from 'd3-selection';
// import {schemeBlues} from 'd3-scale-chromatic';
import {scaleTime, scalePoint, scaleLinear} from 'd3-scale';
import {axisLeft, axisBottom} from 'd3-axis';
import {max, extent, bisectLeft} from 'd3-array';
import {area, curveCardinal} from 'd3-shape';
import {format} from 'd3-format';

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
            .curve(curveCardinal)
            .defined(d => !isNaN(d))
            .x((d, i) => x(data.bins[i]))
            .y0(0)
            .y1(d => z(d)),
        foci=null;



    function chart(selection){
        // draw chart
        // let container = select(selection);
        data = selection.datum();

        console.log(data, selection);
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
                .attr('fill', 'none')
                .attr('pointer-events', 'all');
		}
        const visarea = svg.select('.visarea');
        const overlay = svg.select('.overlay');
        // update vis size
        height = data.series.length * step

		svg.attr('width', width)
            .attr('height', height);
            
        // visarea.attr('transform',
        //     'translate(' + margin.left + ',' + margin.top + ')');
        console.log(margin, width, height)
        // scale
        x.domain(extent(data.bins))
            .range([margin.left, width - margin.right]);
        y.domain(data.series.map(d => d.name))
            .range([margin.top, height - margin.bottom]);
        z.domain([0, max(data.series, d => max(d.values))]).nice()
            .range([0, -overlap * y.step()]);
        
        
        console.log('x,y,z',x.domain(),y.domain(),z.domain());
        const group = visarea.selectAll("g")
            .data(data.series)
            .join("g")
            .attr("transform", d => `translate(0,${y(d.name) + 1})`);
                // .attr("transform", (d, i) => `translate(0,${i * (step + 1) + margin.top})`);
        
        group.append("path")
            .attr("fill", "#ddd")
            .attr("d", d=>{
                // console.log(d.values);
                return ridge(d.values)
            });
        
        let line = ridge.lineY1();
        group.append("path")
            .attr("fill", "none")
            .attr("stroke", "black")
            .attr("d", d => line(d.values));

        foci = group.append('g')
            .attr("class", "focus")
            .style("display", "none");
        
        console.log(foci);
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


    return chart;
}