(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global = global || self, global.rainbow = factory());
}(this, function () { 'use strict';

	function rainbow (){
	    let pickerSize = 120,
			container, 
			pickerGroup,
	        huePickerElm,
			hueHandleElm,
			slPickerElm,
			slHandleElm,
	        inputElm,
	        handleSize = 15,
	        barThickness = 8,
			hueScale = d3.scaleLinear().domain([0,pickerSize]).range([0,360]).clamp(true),
			//(t)=>d3.hsl(t * 360, 1, 0.5) + ""),
			satScale = d3.scaleLinear().domain([0,pickerSize]).range([0, 1]).clamp(true),
			lumScale = d3.scaleLinear().domain([pickerSize, 0]).range([0, 1]).clamp(true),
			hue=360, sat=0.5, lum=0.5,
			gradient = 'linear-gradient(180deg,red,#ff0,#0f0,#0ff,#00f,#f0f,red)',
			hueDrag = d3.drag()
	        .on("drag", ()=>{
	            hueHandleMoved(d3.event.y);
	        })
	        .on("end", ()=>{
	            hueHandleEnd(d3.event.y);
			}),
			slDrag = d3.drag()
	        .on("drag", ()=>{
	            slHandleMoved(d3.event);
	        })
	        .on("end", ()=>{
	            slHandleEnd(d3.event);
	        }),
	        listeners = d3.dispatch('handlemove', 'handleend', 'close');
	        
	    function picker(selection){
	        
	        container = selection.select('.picker-container');
	        if (container.empty()){
	            container = selection.append('div')
	                .attr('class', 'picker-container')
	                .style('position', 'fixed')
	                .style('padding', '10px')
	                .style('padding-left', '15px')
	                .style('border-radius', '4px')
	                .style('box-shadow', '0px 1px 3px 0px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 2px 1px -1px rgba(0,0,0,0.12)')
	                .style('transform', 'translate(-50%,10px)')
	                .style('background-color', '#fff')
	                .style('z-index', '999');
	                // .style('align-items', 'center');
				pickerGroup = container.append('div')
					.attr("class", "picker-group")
					.style("display", "flex");

			
	            // blackElm = container.append('div')
	            //     .attr('class', 'black')
	            //     .style('width', `${1.2*barThickness}px`)
	            //     .style('height', `${1.2*barThickness}px`)
	            //     .style('margin-left', '10px')
	            //     .style('background-color', 'black')
	            //     .style('border-radius', '50%')
				//     .on('click',reset);

				// saturation and luminance picker
				let slPickerGroup = pickerGroup.append('div')
					.attr("class", "sl-picker")
					.style('position', 'relative');
				
				slPickerElm = slPickerGroup.append("div")
					.style("width", `${pickerSize}px`)
					.style("height", `${pickerSize}px`)
					.style("border", '1px solid #eeeee')
					.style('background-color', d3.hsl(hue, 1.0, 0.5))
					.style("background-image", "linear-gradient(180deg, white, rgba(255,255,255,0) 50%),linear-gradient(0deg, black, rgba(0,0,0,0) 50%),linear-gradient(90deg, gray, rgba(128,128,128,0))")
					// .style("background", slGradient(d3.hsl(hue, 1.0, 0.5)))
					.on('click', clickSlArea);
					
				slHandleElm = slPickerGroup.append('div')
					.attr('class', 'sl-picker-handle')
					.style('cursor', 'pointer')
					.style('position', 'absolute')
					.style('transform', 'translate(-50%,-50%)')
	                .style('width', `${handleSize}px`)
					.style('height', `${handleSize}px`)
					.style('top', `${lumScale.invert(lum)}px`)
					.style('left', `${satScale.invert(sat)}px`)
					.style('border-radius', '50%')
					.style('background-color', d3.hsl(hue, sat, lum))
					.style('border', '2px solid white')
					.call(slDrag);

				// hue picker
				huePickerElm = pickerGroup.append('div')
				.attr('class', 'hue-picker')
				.style("margin-left", "12px")
				.style('position', 'relative')
				.style('height', `${pickerSize}px`);

				huePickerElm.append('div')
					.attr('class', 'hue-picker-bar')
					.style('height', '100%')
					.style('width', `${barThickness}px`)
					.style('border-radius', '4px')
					.style('background', gradient)
					.on('click', clickHueBar);

				hueHandleElm = huePickerElm.append('div')
					.attr('class', 'hue-picker-handle')
					.style('cursor', 'pointer')
					.style('position', 'absolute')
					.style('transform', 'translate(-50%,-50%)')
					.style('left', '50%')
					.style('top', `${hueScale.invert(hue)}px`)
					.style('width', `${handleSize}px`)
					.style('height', `${handleSize}px`)
					.style('border-radius', '50%')
					.style('background-color', d3.hsl(hue, 1.0, 0.5))
					.style('border', '2px solid white')
					.call(hueDrag);

				let bottomGroup = container.append('div')
					.style('display', 'flex')
					.style('margin-top', '10px');
				inputElm = bottomGroup.append('input')
					.style("width", `${pickerSize}px`)
					.style('outline', 'none')
					.style('border', 'none')
					.style('color', '#757575')
					.style('font-size', '12px')
					.style('border-radius', '4px')
					.style('background', '#eeeeee')
					.attr('spellcheck', 'false')
					.attr('value', d3.hsl(hue, sat, lum))
					.on('input', textChanged);

				bottomGroup.append('div')
	                .attr('class', 'close')
					.style('cursor', 'pointer')
					.style('text-align', 'center')
	                // .style('font-family', 'Arial, Helvetica, sans-serif')
	                .style('border-radius', '50%')
	                // .style('font-size', '12px')
	                .style('margin-left', '5px')
					.style('width', '24px')
					.style('height', '24px')
					.style('background-repeat', 'no-repeat')
					.style('background-image','url(data:image/svg+xml;utf8;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCFET0NUWVBFIHN2ZyBQVUJMSUMgIi0vL1czQy8vRFREIFNWRyAxLjEvL0VOIiAiaHR0cDovL3d3dy53My5vcmcvR3JhcGhpY3MvU1ZHLzEuMS9EVEQvc3ZnMTEuZHRkIj4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iNTEycHgiIHZlcnNpb249IjEuMSIgaGVpZ2h0PSI1MTJweCIgdmlld0JveD0iMCAwIDY0IDY0IiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCA2NCA2NCI+CiAgPGc+CiAgICA8cGF0aCBmaWxsPSIjOWU5ZTllIiBkPSJNMjguOTQxLDMxLjc4NkwwLjYxMyw2MC4xMTRjLTAuNzg3LDAuNzg3LTAuNzg3LDIuMDYyLDAsMi44NDljMC4zOTMsMC4zOTQsMC45MDksMC41OSwxLjQyNCwwLjU5ICAgYzAuNTE2LDAsMS4wMzEtMC4xOTYsMS40MjQtMC41OWwyOC41NDEtMjguNTQxbDI4LjU0MSwyOC41NDFjMC4zOTQsMC4zOTQsMC45MDksMC41OSwxLjQyNCwwLjU5YzAuNTE1LDAsMS4wMzEtMC4xOTYsMS40MjQtMC41OSAgIGMwLjc4Ny0wLjc4NywwLjc4Ny0yLjA2MiwwLTIuODQ5TDM1LjA2NCwzMS43ODZMNjMuNDEsMy40MzhjMC43ODctMC43ODcsMC43ODctMi4wNjIsMC0yLjg0OWMtMC43ODctMC43ODYtMi4wNjItMC43ODYtMi44NDgsMCAgIEwzMi4wMDMsMjkuMTVMMy40NDEsMC41OWMtMC43ODctMC43ODYtMi4wNjEtMC43ODYtMi44NDgsMGMtMC43ODcsMC43ODctMC43ODcsMi4wNjIsMCwyLjg0OUwyOC45NDEsMzEuNzg2eiIvPgogIDwvZz4KPC9zdmc+Cg==)')
					.style('background-size', '12px')
					.style('background-position', 'center')
	                .on('mouseenter',function(){
	                    d3.select(this).style('background-color', '#eee');
	                })
	                .on('mouseleave',function(){
	                    d3.select(this).style('background-color', null);
	                })
	                .on('click', pickerclose);
	        }
	        huePickerElm.style('height', `${pickerSize}px`);

	        hueHandleElm.style('width', `${handleSize}px`)
	            .style('height', `${handleSize}px`);

	        let initY = parseInt(hueHandleElm.style('top'));
	        updateHueHandle(initY);
	    }
	    picker.pickerSize = function(value) {
	        if (!arguments.length) return pickerSize;
	        pickerSize = value;
	        return picker;
	    };
	    picker.handleSize = function(value) {
	        if (!arguments.length) return handleSize;
	        handleSize = value;
	        return picker;
	    };
	    picker.barThickness = function(value) {
	        if (!arguments.length) return barThickness;
	        barThickness = value;
	        return picker;
	    };
	    picker.on = function() {
	        var value = listeners.on.apply(listeners, arguments);
	        return value === listeners ? picker : value;
	    };
	    picker.show  = function(x,y){
	        container.style('display', null)
	            .style('left', x+'px')
	            .style('top', y+'px');
	    };
	    picker.hide  = function(){
	        container.style('display', 'none');
	    };
	    picker.set = function(hsl){
			let sl = {
				x:satScale.invert(hsl.s?hsl.s:sat),
				y:lumScale.invert(hsl.l)
			};
			updateHueHandle(hueScale.invert(hsl.h?hsl.h:hue));
			updateSlHandle(sl);

	        // if (hsl.l==0){
	        //     // hueHandleElm.style('display', 'none');
	        //     // blackElm.style('width', `${handleSize}px`)
	        //     // .style('height', `${handleSize}px`)
	        // }else{
	        //     let x = pickerSize*hsl.h/360;
	        //     x = x<0? 0: (x>pickerSize?pickerSize:x);
	        //     hueHandleElm.style('background-color', hsl.toString());

	        //     // blackElm.style('width', `${1.2*barThickness}px`)
	        //     // .style('height', `${1.2*barThickness}px`)
	        // }
	    };
	    // function reset(){
	    //     picker.set(d3.hsl('black'));
	    //     listeners.apply("handleend", this, [d3.hsl('black').toString(),null,...arguments]);
		// }
		function textChanged(){
			let hsl = d3.hsl(this.value);
			let sl = {
				x:satScale.invert(hsl.s?hsl.s:sat),
				y:lumScale.invert(hsl.l)
			};
			updateHueHandle(hueScale.invert(hsl.h?hsl.h:hue), true);
			updateSlHandle(sl, true);
			listeners.apply("handleend", this, [d3.hsl(hue, sat, lum),...arguments]);
		}
		function pickerclose(){
	        picker.hide();
	        listeners.apply("close", this, [...arguments]);
	    }
	    function clickHueBar(){
			let loc = d3.mouse(this)[1];
	        updateHueHandle(loc);
	        listeners.apply("handleend", this, [d3.hsl(hue, sat, lum),loc,...arguments]);
		}
		function clickSlArea(){
			let loc = d3.mouse(this);
			loc = {x:loc[0], y:loc[1]};
			updateSlHandle(loc);
	        listeners.apply("handleend", this, [d3.hsl(hue, sat, lum),loc,...arguments]);
	    }
	    function hueHandleMoved(loc){
			updateHueHandle(loc);
	        listeners.apply("handlemove", this, [d3.hsl(hue, sat, lum),loc,'hue',...arguments]);
	    }
	    function hueHandleEnd(loc){
	        updateHueHandle(loc);
	        listeners.apply("handleend", this, [d3.hsl(hue, sat, lum),loc,'hue',...arguments]);
		}
		function slHandleMoved(loc){
			updateSlHandle(loc);
			listeners.apply("handlemove", this, [d3.hsl(hue, sat, lum),loc,'hue',...arguments]);
		}
		function slHandleEnd(loc){
			updateSlHandle(loc);
			listeners.apply("handleend", this, [d3.hsl(hue, sat, lum),loc,'hue',...arguments]);
		}
	    function updateHueHandle(loc, dontUpdateText=false){
			hue = hueScale(loc);

			hueHandleElm.style('top', `${hueScale.invert(hue)}px`)
				.style('background-color', d3.hsl(hue, 1.0, 0.5));

			slPickerElm.style('background-color', d3.hsl(hue, 1.0, 0.5));

			slHandleElm.style('background-color', d3.hsl(hue, sat, lum));
			if (!dontUpdateText){
				inputElm.node().value = d3.hsl(hue, sat, lum);
			}
		}
		function updateSlHandle(loc, dontUpdateText=false){
			sat = satScale(loc.x);
			lum = lumScale(loc.y);

			slHandleElm
				.style('display', null)
				.style('top', `${lumScale.invert(lum)}px`)
				.style('left', `${satScale.invert(sat)}px`)
				.style('background-color', d3.hsl(hue, sat, lum));
			if (!dontUpdateText){
				// inputElm.attr('value', d3.hsl(hue, sat, lum));
				inputElm.node().value = d3.hsl(hue, sat, lum);
				// console.log(inputElm.attr('value'), inputElm.node().value);
				// inputElm.node().setAttribute('value', inputElm.node().value);
			}
			
		}
	    return picker;
	}

	return rainbow;

}));
