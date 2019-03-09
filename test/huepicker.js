export default function (){
    let width = 120,
        container, 
        pickerElm,
        handleElm,
        blackElm,
        handleSize = 15,
        barHeight = 8,
        rainbow = d3.scaleSequential((t)=>d3.hsl(t * 360, 1, 0.5) + ""),
        gradient = 'linear-gradient(to right,red,#ff0,#0f0,#0ff,#00f,#f0f,red)',
        drag = d3.drag()
        .on("drag", ()=>{
            updateHandle(d3.event.x,width);
            handlemove(d3.event.x);
        })
        .on("end", ()=>{
            handleend(d3.event.x);
        }),
        listeners = d3.dispatch('handlemove', 'handleend', 'close');
        
    function picker(selection){
        
        container = selection.select('.picker-container');
        if (container.empty()){
            container = selection.append('div')
                .attr('class', 'picker-container')
                .style('position', 'fixed')
                .style('padding', '5px')
                .style('padding-left', '15px')
                .style('border-radius', '4px')
                .style('box-shadow', '0px 1px 3px 0px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 2px 1px -1px rgba(0,0,0,0.12)')
                .style('transform', 'translate(-50%,30%)')
                .style('background-color', '#fff')
                .style('display', 'flex')
                .style('z-index', '999')
                .style('align-items', 'center');

            pickerElm = container.append('div')
                .attr('class', 'picker')
                .style('position', 'relative')
                .style('width', `${width}px`);

            pickerElm.append('div')
                .attr('class', 'picker-bar')
                .style('width', '100%')
                .style('height', `${barHeight}px`)
                .style('border-radius', '4px')
                .style('background', gradient)
                .on('mousedown', clickBar)

            handleElm = pickerElm.append('div')
                .attr('class', 'picker-handle')
                .style('display', 'none')
                .style('cursor', 'pointer')
                .style('position', 'absolute')
                .style('transform', 'translate(-50%,-50%)')
                .style('top', '50%')
                .style('left', '0')
                .style('width', `${handleSize}px`)
                .style('height', `${handleSize}px`)
                .style('border-radius', '50%')
                .style('background-color', 'white')
                .style('border', '2px solid white')
                .call(drag);
            blackElm = container.append('div')
                .attr('class', 'black')
                .style('width', `${1.2*barHeight}px`)
                .style('height', `${1.2*barHeight}px`)
                .style('margin-left', '10px')
                .style('background-color', 'black')
                .style('border-radius', '50%')
                .on('click',reset);

            container.append('div')
                .attr('class', 'close')
                .style('cursor', 'pointer')
                .style('font-family', 'Arial, Helvetica, sans-serif')
                .style('color', '#757575')
                .style('font-size', '14px')
                .style('margin-left', '10px')
                .style('padding', '5px')
                .text('Close')
                .on('mouseenter',function(){
                    d3.select(this).style('background-color', '#eee');
                })
                .on('mouseleave',function(){
                    d3.select(this).style('background-color', null);
                })
                .on('click', pickerclose);
        }
        pickerElm.style('width', `${width}px`);

        handleElm.style('width', `${handleSize}px`)
            .style('height', `${handleSize}px`);

        let initX = parseInt(handleElm.style('left'));
        updateHandle(initX, width);
    }
    picker.width = function(value) {
        if (!arguments.length) return width;
        width = value;
        return picker;
    };
    picker.handleSize = function(value) {
        if (!arguments.length) return handleSize;
        handleSize = value;
        return picker;
    };
    picker.barHeight = function(value) {
        if (!arguments.length) return barHeight;
        barHeight = value;
        return picker;
    };
    picker.on = function() {
        var value = listeners.on.apply(listeners, arguments);
        return value === listeners ? picker : value;
    };
    picker.show  = function(x,y){
        container.style('display', 'flex')
            .style('left', x+'px')
            .style('top', y+'px');
    };
    picker.hide  = function(){
        container.style('display', 'none');
    }
    picker.set = function(hsl){
        if (hsl.l==0){
            handleElm.style('display', 'none');
            blackElm.style('width', `${handleSize}px`)
            .style('height', `${handleSize}px`)
        }else{
            let x = width*hsl.h/360;
            x = x<0? 0: (x>width?width:x);
            handleElm.style('display', null)
                .style('background-color', hsl.toString());

            blackElm.style('width', `${1.2*barHeight}px`)
            .style('height', `${1.2*barHeight}px`)
        }
    }
    function reset(){
        picker.set(d3.hsl('black'));
        listeners.apply("handleend", this, [d3.hsl('black').toString(),null,...arguments]);
    }
    function clickBar(){
        let x = d3.mouse(this)[0];
        let hue = updateHandle(x,width);
        listeners.apply("handleend", this, [hue,x,...arguments]);
    }
    function handlemove(x){
        x = x<0? 0: (x>width?width:x);
        let hue = rainbow(x/width);
        listeners.apply("handlemove", this, [hue,x,...arguments]);
    }
    function handleend(x){
        x = x<0? 0: (x>width?width:x);
        let hue = rainbow(x/width);
        listeners.apply("handleend", this, [hue,x,...arguments]);
    }
    function pickerclose(){
        
        picker.hide();
        listeners.apply("close", this, [...arguments]);
    }
    function updateHandle(x, xmax){
        x = x<0? 0: (x>width?width:x);
        let hue = rainbow(x/xmax);
        handleElm
            .style('display', null)
            .style('left', `${x}px`)
            .style('background-color', hue);
        blackElm.style('width', `${1.2*barHeight}px`)
            .style('height', `${1.2*barHeight}px`);
        return hue;
    }
    return picker;
}