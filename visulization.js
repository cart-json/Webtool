let state = {}


export function vizPetriNet(petriNetAr) {
    if(petriNetAr.length == 0) return;

    let addedElems = new Set()
    let maxWidth = 0;
    let nodes = [];
    let queue = [];
    state.idNodeMap = new Map();
    let grid = [];

    function addNode(element, rowIndex){
        if(!grid[rowIndex]){
            grid[rowIndex] = []
        }
        let newNode = new Node(element, grid[rowIndex].length, rowIndex)
        grid[rowIndex].push(newNode)
        nodes.push(newNode)
        state.idNodeMap.set(element.id, newNode)
        if (grid[rowIndex].length > maxWidth){
            maxWidth = grid[rowIndex].length;
        }
        return newNode;
    }

    for (var n = 0; n < petriNetAr.length; n++) {
        if (petriNetAr[n].incoming.length == 0) {
            queue.push(addNode(petriNetAr[n], 0));
            addedElems.add(petriNetAr[n]);
        }
    };
    if(nodes.length == 0){
        queue.push(addNode(petriNetAr[0], 0));
        addedElems.add(petriNetAr[0]);
    }
    maxWidth = nodes.length;
    while (queue.length != 0) {
        let node = queue.shift()
        node.element.outgoing.forEach(out => {
            if (!addedElems.has(out)) {
                queue.push(addNode(out, node.row + 1));
                addedElems.add(out);
            }
        })
        node.element.incoming.forEach(inc => {
            if (!addedElems.has(inc)) {
                queue.push(addNode(inc, node.row + 1));
                addedElems.add(inc);
            }
        })
    }

    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    state.svg = svg;
    svg.setAttribute('width', maxWidth * 70 + 50)
    svg.setAttribute('height', grid.length *75)
    nodes.forEach(node => node.drawNode(svg));
    
    petriNetAr.forEach(elem => {
        elem.outgoing.forEach(follElem => {
            connect(state.idNodeMap.get(elem.id), state.idNodeMap.get(follElem.id), svg)
        })
    })
    document.getElementById("content").innerHTML = "";
    document.getElementById("content").appendChild(svg);
}

function connect(startNode, targetNode, svg) {
    let startCoord;
    let targetCoord;
    if(startNode.row >= targetNode.row){
        if(startNode.column == targetNode.column){
            startCoord = startNode.getBottomConnection();
            targetCoord = targetNode.getTopConnection();
        } else if (startNode.column >= targetNode.column){
            startCoord = startNode.getLeftConnection();
            targetCoord = targetNode.getTopConnection();
        } else {
            startCoord = startNode.getRightConnection();
            targetCoord = targetNode.getTopConnection();
        }
    } else {
        if(startNode.column == targetNode.column){
            startCoord = startNode.getTopConnection();
            targetCoord = targetNode.getBottomConnection();
        } else if (startNode.column >= targetNode.column){
            startCoord = startNode.getLeftConnection();
            targetCoord = targetNode.getBottomConnection();
        } else {
            startCoord = startNode.getRightConnection();
            targetCoord = targetNode.getBottomConnection();
        }
    }
    drawLine(startCoord.x, startCoord.y, targetCoord.x, targetCoord.y, svg)
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
  

function addRect(node, svg) {
    var rect = document.createElementNS(svg.namespaceURI, 'rect');
    const height = 34;
    const width = 18;
    rect.setAttribute('id', node.element.id);
    rect.setAttribute('x', node.xCoordinate - (width / 2));
    rect.setAttribute('y', node.yCoordinate - (height / 2));
    rect.setAttribute('width', width);
    rect.setAttribute('height', height);
    rect.setAttribute('fill', 'black');
    rect.setAttribute('stroke', 'black');
    rect.setAttribute('stroke-width', 2);
    svg.appendChild(rect)

    var label = document.createElementNS(svg.namespaceURI, 'text');
    label.textContent = node.element.id;
    label.setAttribute('x', node.xCoordinate + 20);
    label.setAttribute('y', node.yCoordinate - 20);
    label.setAttribute('fill', 'black'); // Text color
    label.setAttribute('font-family', 'Arial'); // Font family for the text
    label.setAttribute('font-size', '16'); // Font size for the text
    label.setAttribute('text-anchor', 'middle');
    svg.appendChild(label)

    return rect;
}


function addPlace(node, svg) {
    var circle = document.createElementNS(svg.namespaceURI, 'circle');
    circle.setAttribute('id', node.element.id);
    circle.setAttribute('r', 8);
    circle.setAttribute('cx', node.xCoordinate);
    circle.setAttribute('cy', node.yCoordinate);
    circle.setAttribute('fill', '#ffffff');
    circle.setAttribute('stroke', 'black');
    circle.setAttribute('stroke-width', 2);
    svg.appendChild(circle)

    var label = document.createElementNS(svg.namespaceURI, 'text');
    label.textContent = node.element.id;
    label.setAttribute('x', node.xCoordinate + 20);
    label.setAttribute('y', node.yCoordinate - 10);
    label.setAttribute('fill', 'black'); // Text color
    label.setAttribute('font-family', 'Arial'); // Font family for the text
    label.setAttribute('font-size', '16'); // Font size for the text
    label.setAttribute('text-anchor', 'middle');
    svg.appendChild(label)
    return circle;
}

class Node{
    constructor(element, column, row){
        const distance = 70;
        this.element = element;
        this.column = column;
        this.row = row;
        this.isPlace = element.type === "place";
        this.xCoordinate = (column + 1) * distance;
        this.yCoordinate = (row + 1) * distance;
    }

    drawNode(svg){
        this.vizNode = this.isPlace ? addPlace(this, svg) : addRect(this, svg)
    }

    getBottomConnection(){
        let x, y;
        if(this.isPlace){
            x = parseInt(this.vizNode.getAttribute('cx'));
            y = parseInt(this.vizNode.getAttribute('cy')) - 8;
        } else {
            x = parseInt(this.vizNode.getAttribute('x')) +9
            y = parseInt(this.vizNode.getAttribute('y'))
        }
        return {x: x, y: y};
    }

    getTopConnection(){
        let x, y;
        if(this.isPlace){
            x = parseInt(this.vizNode.getAttribute('cx'));
            y = parseInt(this.vizNode.getAttribute('cy')) +8;
        } else {
            x = parseInt(this.vizNode.getAttribute('x')) +9;
            y = parseInt(this.vizNode.getAttribute('y')) + 34;
        }
        return {x: x, y: y};
    }

    getRightConnection(){
        let x, y;
        if(this.isPlace){
            x = parseInt(this.vizNode.getAttribute('cx'))+8;
            y = parseInt(this.vizNode.getAttribute('cy'));
        } else {
            x = parseInt(this.vizNode.getAttribute('x'));
            y = parseInt(this.vizNode.getAttribute('y')) + 17;
        }
        return {x: x, y: y};
    }

    getLeftConnection(){
        let x, y;
        if(this.isPlace){
            x = parseInt(this.vizNode.getAttribute('cx')) - 8;
            y = parseInt(this.vizNode.getAttribute('cy'));
        } else {
            x = parseInt(this.vizNode.getAttribute('x')) + 18;
            y = parseInt(this.vizNode.getAttribute('y')) + 17;
        }
        return {x: x, y: y};
    }

    addTokens(numberOfTokens){
        let tokenCircle = state.svg.getElementById(this.element.id + "tkn");
        if(numberOfTokens == 0){
            if(tokenCircle){
                state.svg.removeChild(tokenCircle);
            }
        } else {
            if(!tokenCircle){
                let tokenCircle = document.createElementNS(state.svg.namespaceURI, 'circle');
                tokenCircle.setAttribute('id', this.element.id + "tkn");
                tokenCircle.setAttribute('r', 4);
                tokenCircle.setAttribute('cx', this.xCoordinate);
                tokenCircle.setAttribute('cy', this.yCoordinate);
                tokenCircle.setAttribute('fill', 'black');
                state.svg.appendChild(tokenCircle)
            }
        }
    }


}

export function updateTokens(places, markingArr){
    places.forEach(place => {
        let placeNode = state.idNodeMap.get(place.id);
        placeNode.addTokens(markingArr[place.index])
    })
}