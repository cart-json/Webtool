let state = {}


export function vizPetriNet(petriNet, highlightTrasition) {
    state.transOnclickFunction = highlightTrasition;
    state.highlightedNode = -1;
    if(petriNet.length == 0) return;

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
        state.idNodeMap.set(element.id_text, newNode)
        if (grid[rowIndex].length > maxWidth){
            maxWidth = grid[rowIndex].length;
        }
        return newNode;
    }

    for (var n = 0; n < petriNet.length; n++) {
        if (petriNet[n].incoming.length == 0) {
            queue.push(addNode(petriNet[n], 0));
            addedElems.add(petriNet[n]);
        }
    };
    if(nodes.length == 0){
        queue.push(addNode(petriNet[0], 0));
        addedElems.add(petriNet[0]);
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
    svg.setAttribute('width', maxWidth * 80 + 50)
    svg.setAttribute('height', grid.length *90)
    nodes.forEach(node => node.drawNode(svg));
    
    petriNet.forEach(elem => {
        elem.outgoing.forEach(follElem => {
            connect(state.idNodeMap.get(elem.id_text), state.idNodeMap.get(follElem.id_text), svg)
        })
    })
    document.getElementById("content").innerHTML = "";
    document.getElementById("content").appendChild(svg);
}

function connect(startNode, targetNode, svg) {
    new Arrow(startNode, targetNode, svg);
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
    rect.setAttribute('id', node.element.id_text);
    rect.setAttribute('x', node.xCoordinate - (width / 2));
    rect.setAttribute('y', node.yCoordinate - (height / 2));
    rect.setAttribute('width', width);
    rect.setAttribute('height', height);
    rect.setAttribute('fill', 'black');
    rect.setAttribute('stroke', 'black');
    rect.setAttribute('stroke-width', 2);
    rect.onclick = function(){state.transOnclickFunction(node.element.id);};
    svg.appendChild(rect)

    var label = document.createElementNS(svg.namespaceURI, 'text');
    label.textContent = node.element.id_text;
    label.setAttribute('x', node.xCoordinate + 20);
    label.setAttribute('y', node.yCoordinate - 20);
    label.setAttribute('fill', 'black');
    label.setAttribute('font-family', 'Arial');
    label.setAttribute('font-size', '16');
    label.setAttribute('text-anchor', 'middle');
    svg.appendChild(label)

    return rect;
}


function addPlace(node, svg) {
    var circle = document.createElementNS(svg.namespaceURI, 'circle');
    circle.setAttribute('id', node.element.id_text);
    circle.setAttribute('r', 8);
    circle.setAttribute('cx', node.xCoordinate);
    circle.setAttribute('cy', node.yCoordinate);
    circle.setAttribute('fill', '#ffffff');
    circle.setAttribute('stroke', 'black');
    circle.setAttribute('stroke-width', 2);
    svg.appendChild(circle)

    var label = document.createElementNS(svg.namespaceURI, 'text');
    label.textContent = node.element.id_text;
    label.setAttribute('x', node.xCoordinate + 20);
    label.setAttribute('y', node.yCoordinate - 10);
    label.setAttribute('fill', 'black');
    label.setAttribute('font-family', 'Arial');
    label.setAttribute('font-size', '16');
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
        this.isPlace = !element.isTrans;
        this.xCoordinate = (column + 1) * distance;
        this.yCoordinate = (row + 1) * distance;
        this.outgoingArrows = [];
        this.incomingArrows = [];
    }

    drawNode(svg){
        this.vizNode = this.isPlace ? addPlace(this, svg) : addRect(this, svg)
    }

    addOutgoingArrow(arrow){
        this.outgoingArrows.push(arrow);
    }

    addIncomingArrow(arrow){
        this.incomingArrows.push(arrow);
    }

    highlight(){
        this.vizNode.setAttribute('fill', 'red')
        this.outgoingArrows.forEach(arrow => arrow.highlight("green"));
        this.incomingArrows.forEach(arrow => arrow.highlight("red"));
        state.svg.appendChild(this.element);
    }


    unhighlight(){
        this.vizNode.setAttribute('fill', 'black')
        this.outgoingArrows.forEach(arrow => arrow.unhighlight());
        this.incomingArrows.forEach(arrow => arrow.unhighlight());
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
            x = parseInt(this.vizNode.getAttribute('x')) + 18;
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
            x = parseInt(this.vizNode.getAttribute('x'));
            y = parseInt(this.vizNode.getAttribute('y')) + 17;
        }
        return {x: x, y: y};
    }

    addTokens(numberOfTokens){
        let tokenCircle = state.svg.getElementById(this.element.id + "tkn");
        if(tokenCircle){
            state.svg.removeChild(tokenCircle);
        }
        if(numberOfTokens > 1){
            let newText = document.createElementNS(state.svg.namespaceURI, "text");
            newText.setAttribute('id', this.element.id + "tkn");
            newText.setAttribute("x", this.xCoordinate - 4);      // Set the x position
            newText.setAttribute("y", this.yCoordinate + 4);      // Set the y position
            newText.setAttribute("fill", "black"); // Set the fill color
            newText.textContent = numberOfTokens;    
            newText.style.fontSize = '12px';    // Set the text content
            state.svg.appendChild(newText); 

        } else if(numberOfTokens == 1){
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

class Arrow {
    constructor(startNode, targetNode, svg){
        this.startNode = startNode;
        this.targetNode = targetNode;
        this.svg = svg;
        targetNode.addIncomingArrow(this);
        startNode.addOutgoingArrow(this);
        
        this. arrowViz = Arrow.drawArrow(startNode, targetNode, svg);
    }

    highlight(color){
        this.arrowViz.querySelectorAll('line, polygon').forEach(elem => {
            elem.setAttribute('stroke', color);
            elem.setAttribute('fill', color);
        });
        this.svg.appendChild(this.arrowViz);
    }
    unhighlight(){
        this.arrowViz.querySelectorAll('line, polygon').forEach(elem => {
            elem.setAttribute('stroke', 'black');
            elem.setAttribute('fill', 'black');
        });
    }

    static drawArrow(startNode, targetNode,svg){
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

        let x1 = startCoord.x; 
        let y1 = startCoord.y; 
        let x2 = targetCoord.x;
        let y2 = targetCoord.y;


        // Horizontal line
        const group = document.createElementNS(svg.namespaceURI, 'g')
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

        group.appendChild(hLine);
        group.appendChild(vLine);

        const arrowheadLength = 10;
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
        
        group.appendChild(arrowhead);

        svg.appendChild(group);

        return group;
    }


} 

export function updateTokens(places, markingArr){
    if(state.idNodeMap){
        places.forEach(place => {
            let placeNode = state.idNodeMap.get(place.id_text);
            placeNode.addTokens(markingArr[place.index])
        })
    }
}

export function highlightTransNode(id){
    if(state.highlightedNode != -1){
        let prevNode = state.idNodeMap.get("T" + state.highlightedNode);
        if(prevNode){
            prevNode.unhighlight();
        }
    }
    state.highlightedNode = id;
    let transNode = state.idNodeMap.get("T" + id);
    if(transNode){
        transNode.highlight();
    }
}