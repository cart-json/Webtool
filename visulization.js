export function vizPetriNet(petriNetAr) {
    if(petriNetAr.length == 0) return;
    var layers = []
    var addedElems = new Set()
    layers[0] = []
    for (var n = 0; n < petriNetAr.length; n++) {
        if (petriNetAr[n].incoming.length == 0) {
            layers[0].push(petriNetAr[n])
            addedElems.add(petriNetAr[n])
        }
    };
    if(layers[0].length == 0){
        layers[0].push(petriNetAr[0])
        addedElems.add(petriNetAr[0])
    }
    var index = 0
    let graph = []
    layers[0].forEach(elem => graph.push(elem))
    while (true) {
        layers[index + 1] = []
        layers[index].forEach(elem => {
            elem.outgoing.forEach(out => {
                if (!addedElems.has(out)) {
                    layers[index + 1].push(out);
                    addedElems.add(out);
                    /*var follows = out.incoming.map(inc => addedElems.has(inc))
                        .reduce(function (bool, isAdded) { return bool && isAdded }, true)
                    if (follows) {
                        layers[index + 1].push(out);
                        addedElems.add(out);
                    }*/
                }
            })
        })
        if (layers[index + 1].length == 0) {
            break;
        }
        index++;
    }



    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    var svgNS = svg.namespaceURI;
    const d = 70;
    svg.setAttribute('width', 500)
    svg.setAttribute('height', layers.length *75)

    for (var i = 0; i < layers.length; i++) {
        for (var j = 0; j < layers[i].length; j++) {
            var element = layers[i][j];
            if (element.type === "trans") {
                addRect((j + 1) * d, (i + 1) * d, svg, element.id)
            } else {
                addPlace((j + 1) * d, (i + 1) * d, svg, element.id)
            }
        }
    }
    petriNetAr.forEach(elem => {
        elem.outgoing.forEach(follElem => {
            connect(elem, follElem, svg)
        })
    })
    document.getElementById("content").innerHTML = "";
    document.getElementById("content").appendChild(svg);
}

function addLine(x1, y1, x2, y2, svgNS) {
    var line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('fill', '#ffffff');
    line.setAttribute('stroke', 'black');
    line.setAttribute('stroke-width', 2);
    return line;
}

function connect(startElem, targetElem, svg) {
    let startNode = svg.getElementById(startElem.id);
    let targetNode = svg.getElementById(targetElem.id);
    if(startNode && targetNode){
        let x = startNode.getAttribute('x')
        if(startElem.type === "place"){
            let x1 = parseInt(startNode.getAttribute('cx'))
            let y1 = parseInt(startNode.getAttribute('cy'))
            let x2 = parseInt(targetNode.getAttribute('x'))+9
            let y2 = parseInt(targetNode.getAttribute('y'))
            drawLine(x1, y1, x2, y2, svg)
        } else {
            let x1 = parseInt(startNode.getAttribute('x')) +9
            let y1 = parseInt(startNode.getAttribute('y')) +34
            let x2 = parseInt(targetNode.getAttribute('cx'))
            let y2 = parseInt(targetNode.getAttribute('cy'))
            drawLine(x1, y1, x2, y2, svg)
        }
    }
}
function drawLine(x1, y1, x2, y2, svg){
    // Horizontal line
    const hLine = document.createElementNS(svg.namespaceURI, 'line');
    hLine.setAttribute('x1', x1);
    hLine.setAttribute('y1', y1);
    hLine.setAttribute('x2', x2);
    hLine.setAttribute('y2', y1);
    hLine.setAttribute('stroke', 'black');
    hLine.setAttribute('stroke-width', 2);

    // Vertical line
    const vLine = document.createElementNS(svg.namespaceURI, 'line');
    vLine.setAttribute('x1', x2);
    vLine.setAttribute('y1', y1);
    vLine.setAttribute('x2', x2);
    vLine.setAttribute('y2', y2);
    vLine.setAttribute('stroke', 'black');
    vLine.setAttribute('stroke-width', 2);

    svg.appendChild(hLine);
    svg.appendChild(vLine);

    const arrowheadLength = 10;
    // Arrowhead direction calculation
    let angle;
    if (y2 > y1) {
        angle = Math.PI/2;  // pointing downwards
    } else if (y2 < y1) {
        angle = -Math.PI/2;  // pointing upwards
    } else if (x2 > x1) {
        angle = 0;  // pointing right
    } else {
        angle = Math.PI;  // pointing left
    }
    
    const arrowheadX1 = x2 - arrowheadLength * Math.cos(angle - Math.PI/6);  
    const arrowheadY1 = y2 - arrowheadLength * Math.sin(angle - Math.PI/6);

    const arrowheadX2 = x2 - arrowheadLength * Math.cos(angle + Math.PI/6);  
    const arrowheadY2 = y2 - arrowheadLength * Math.sin(angle + Math.PI/6);

    const arrowhead = document.createElementNS(svg.namespaceURI, 'polygon');
    arrowhead.setAttribute('points', `${x2},${y2} ${arrowheadX1},${arrowheadY1} ${arrowheadX2},${arrowheadY2}`);
    arrowhead.setAttribute('fill', 'black');
    
    svg.appendChild(arrowhead);
}
  

function addRect(x, y, svg, text) {
    var rect = document.createElementNS(svg.namespaceURI, 'rect');
    const height = 34;
    const width = 18;
    rect.setAttribute('id', text);
    rect.setAttribute('x', x - (width / 2));
    rect.setAttribute('y', y - (height / 2));
    rect.setAttribute('width', width);
    rect.setAttribute('height', height);
    rect.setAttribute('fill', 'black');
    rect.setAttribute('stroke', 'black');
    rect.setAttribute('stroke-width', 2);
    svg.appendChild(rect)

    var label = document.createElementNS(svg.namespaceURI, 'text');
    label.textContent = text;
    label.setAttribute('x', x + 20);
    label.setAttribute('y', y - 20);
    label.setAttribute('fill', 'black'); // Text color
    label.setAttribute('font-family', 'Arial'); // Font family for the text
    label.setAttribute('font-size', '16'); // Font size for the text
    label.setAttribute('text-anchor', 'middle');
    svg.appendChild(label)
}


function addPlace(x, y, svg, text) {
    var circle = document.createElementNS(svg.namespaceURI, 'circle');
    circle.setAttribute('id', text);
    circle.setAttribute('r', 8);
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('fill', '#ffffff');
    circle.setAttribute('stroke', 'black');
    circle.setAttribute('stroke-width', 2);
    svg.appendChild(circle)

    var label = document.createElementNS(svg.namespaceURI, 'text');
    label.textContent = text;
    label.setAttribute('x', x + 20);
    label.setAttribute('y', y - 10);
    label.setAttribute('fill', 'black'); // Text color
    label.setAttribute('font-family', 'Arial'); // Font family for the text
    label.setAttribute('font-size', '16'); // Font size for the text
    label.setAttribute('text-anchor', 'middle');
    svg.appendChild(label)
}