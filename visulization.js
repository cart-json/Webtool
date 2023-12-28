let state = {}


export function vizPetriNet(petriNet, highlightTrasition) {
    state.idNodeMap = new Map();
    state.grid = [];
    let nodes = [];
    
    state.transOnclickFunction = highlightTrasition;
    state.highlightedNode = -1;
    let tree = createTree(petriNet);

    function addTreeNode(element, rowIndex, width){
        if(!state.grid[rowIndex]){
            state.grid[rowIndex] = [];
        }
        let column = state.grid[rowIndex].length;
        let newNode = new Node(element, column, rowIndex)
        state.grid[rowIndex][column] = newNode;
        for(let i = column + 1; i < column + width; i++){
            state.grid[rowIndex][i] = "";
        }
        nodes.push(newNode)
        state.idNodeMap.set(element.id_text, newNode)
        return newNode;
    }

    tree.forEach(treeNode => addTreeNode(treeNode.element, treeNode.depth, treeNode.width))
    const gridWidth = state.grid.reduce((prev, row) => prev < row.length ? row.length : prev, 0)
    state.grid.forEach(row => {
        while(row.length < gridWidth){
            row.push("");
        }
    })
    let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    state.svg = svg;

    svg.setAttribute('width', state.grid[0].length * 80 + 50)
    svg.setAttribute('height', state.grid.length *90)

    nodes.forEach(node => node.drawNode(svg));

    petriNet.forEach(elem => {
        elem.outgoing.forEach(follElem => {
            new Arrow(state.idNodeMap.get(elem.id_text), state.idNodeMap.get(follElem.id_text), elem.outgoingWeights.get(follElem), svg)
        })
    })
    document.getElementById("content").innerHTML = "";
    document.getElementById("content").appendChild(svg);
    return;
}

function createTree(petriNet) {
    let addedElems = new Set()
    let tree = [];
    let queue = [];

    function addNode(element, depth){
        const node = {
            element: element,
            children: [],
            width: 1,
            depth: depth
        };
        tree.push(node);
        return node;
    }

    for (var n = 0; n < petriNet.length; n++) {
        if (petriNet[n].incoming.length == 0) {
            queue.push(addNode(petriNet[n], 0));
            addedElems.add(petriNet[n]);
        }
    };
    if(tree.length == 0){
        queue.push(addNode(petriNet[0], 0));
        addedElems.add(petriNet[0]);
    }
    while (queue.length != 0) {
        let node = queue.shift()
        node.element.outgoing.forEach(out => {
            if (!addedElems.has(out)) {
                let newNode = addNode(out, node.depth + 1)
                queue.push(newNode);
                node.children.push(newNode);
                addedElems.add(out);
            }
        })
        node.element.incoming.forEach(inc => {
            if (!addedElems.has(inc)) {
                let newNode = addNode(inc, node.depth + 1)
                queue.push(newNode);
                node.children.push(newNode);
                addedElems.add(inc);
            }
        })
    }

    function calcWidth(node){
        let result;

        if(node.children.length == 0){
            result = 1;
        } else {
            result = node.children.reduce((a,childNode) => a + calcWidth(childNode), 0)
        }
        node.width = result;
        return result;
    }
    calcWidth(tree[0]);

    tree.forEach(node => {
        if(node.parent === null){
            calcWidth(node);
        }
    })

    return tree;
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
    label.setAttribute('x', node.xCoordinate + 18);
    label.setAttribute('y', node.yCoordinate - 20);
    label.setAttribute('fill', 'black');
    label.setAttribute('font-family', 'Arial');
    label.setAttribute('font-size', '12');
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
    label.setAttribute('x', node.xCoordinate + 18);
    label.setAttribute('y', node.yCoordinate - 8);
    label.setAttribute('fill', 'black');
    label.setAttribute('font-family', 'Arial');
    label.setAttribute('font-size', '12');
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
        this.width = 1;
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
        state.svg.appendChild(this.vizNode);
    }


    unhighlight(){
        this.vizNode.setAttribute('fill', 'black')
        this.outgoingArrows.forEach(arrow => arrow.unhighlight());
        this.incomingArrows.forEach(arrow => arrow.unhighlight());
    }

    getBottomConnection(diff){
        let x, y;
        if(this.isPlace){
            x = parseInt(this.vizNode.getAttribute('cx'));
            y = parseInt(this.vizNode.getAttribute('cy')) + 8;
        } else {
            x = parseInt(this.vizNode.getAttribute('x')) +9
            y = parseInt(this.vizNode.getAttribute('y')) +34
        }
        return {x: x + diff, y: y};
    }

    getTopConnection(diff){
        let x, y;
        if(this.isPlace){
            x = parseInt(this.vizNode.getAttribute('cx'));
            y = parseInt(this.vizNode.getAttribute('cy')) - 8;
        } else {
            x = parseInt(this.vizNode.getAttribute('x')) +9;
            y = parseInt(this.vizNode.getAttribute('y'));
        }
        return {x: x + diff, y: y};
    }

    getRightConnection(diff){
        let x, y;
        if(this.isPlace){
            x = parseInt(this.vizNode.getAttribute('cx'))+8;
            y = parseInt(this.vizNode.getAttribute('cy'));
        } else {
            x = parseInt(this.vizNode.getAttribute('x')) + 18;
            y = parseInt(this.vizNode.getAttribute('y')) + 17;
        }
        return {x: x, y: y + diff};
    }

    getLeftConnection(diff){
        let x, y;
        if(this.isPlace){
            x = parseInt(this.vizNode.getAttribute('cx')) - 8;
            y = parseInt(this.vizNode.getAttribute('cy'));
        } else {
            x = parseInt(this.vizNode.getAttribute('x'));
            y = parseInt(this.vizNode.getAttribute('y')) + 17;
        }
        return {x: x, y: y + diff};
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
//horizontalLineIsFree checks if there are now elements in a specific grid row intervall
//"y" indicates which row, "from" and "to" indicate the intervall
//"offset" defines if if the first cell or the last cell should in the given intevall should be ignored
//this is neccessary, because the first or last element is either the start or the target
//the offset is either 0 or 1, depending if the last or the first element should be ignored
function horizontalLineIsFree(y,from, to, offset){
    if (from > to) {
        [from, to] = [to, from];
        offset = (offset + 1) % 2;
    }
    if(state.grid.length <= y || state.grid[y].length <= to)
        return false;
    for(let i = from + offset; i < to + offset; i++){
        if(state.grid[y][i] !== "") return false
    }
    return true;
}

function verticalLineIsFree(x,from, to, offset){
    if (from > to) {
        [from, to] = [to, from];
        offset = (offset + 1) % 2;
    }
    if(state.grid.length <= to)
        return false;
    for(let i = from + offset; i < to + offset; i++){
        if(state.grid[i].length < x && state.grid[i][x] !== "") 
            return false;
    }
    return true;
}

class Arrow {
    constructor(startNode, targetNode, weight, svg){
        this.startNode = startNode;
        this.targetNode = targetNode;
        this.weight = weight;
        this.svg = svg;
        targetNode.addIncomingArrow(this);
        startNode.addOutgoingArrow(this);
        
        this.arrowViz = Arrow.drawArrow(startNode, targetNode, weight, svg);
    }

    highlight(color){
        this.arrowViz.querySelectorAll('line, polygon, text').forEach(elem => {
            elem.setAttribute('stroke', color);
            elem.setAttribute('fill', color);
        });
        this.svg.appendChild(this.arrowViz);
    }
    unhighlight(){
        this.arrowViz.querySelectorAll('line, polygon, text').forEach(elem => {
            elem.setAttribute('stroke', 'black');
            elem.setAttribute('fill', 'black');
        });
    }

    static drawArrow(startNode, targetNode, weight, svg){
        let startCoord;
        let targetCoord;
        let angle;
        //is <0 if goes down, >0 if goes up
        let verticalDiff = startNode.row - targetNode.row;
        //is <0 if goes left, >0 if goes right
        let horizontalDiff = targetNode.column - startNode.column;

        const group = document.createElementNS(svg.namespaceURI, 'g')

        //check if horizontal-vertical is free
        if(horizontalLineIsFree(startNode.row, startNode.column, targetNode.column, 1) &&
            verticalLineIsFree(targetNode.column, startNode.row, targetNode.row, 0)){
                //draw path
                if(verticalDiff >= 0){
                    targetCoord = targetNode.getBottomConnection(-3);
                    angle = -Math.PI/2;  // pointing upwards
                    if(horizontalDiff == 0){
                        startCoord = startNode.getTopConnection(-3);
                    } else if(horizontalDiff < 0){
                        startCoord = startNode.getLeftConnection(3);
                    } else {
                        startCoord = startNode.getRightConnection(-3);
                    }
                } else {
                    targetCoord = targetNode.getTopConnection(3);
                    angle = Math.PI/2;  // pointing downwards
                    if(horizontalDiff == 0){
                        startCoord = startNode.getBottomConnection(3);
                    } else if(horizontalDiff < 0){
                        startCoord = startNode.getLeftConnection(3);
                    } else {
                        startCoord = startNode.getRightConnection(-3);
                    }
                }

                group.appendChild(this.drawLine(startCoord.x, startCoord.y, targetCoord.x, startCoord.y));
                group.appendChild(this.drawLine(targetCoord.x, startCoord.y, targetCoord.x, targetCoord.y));
                if(weight != 1) group.appendChild(this.addWeight(targetCoord.x, (startCoord.y + targetCoord.y) /2 + 7 * Math.sign(horizontalDiff), weight));
                
        } else if (verticalLineIsFree(startNode.column, startNode.row, targetNode.row, 1) &&
        horizontalLineIsFree(targetNode.row, startNode.column, targetNode.column, 0)){
            if(verticalDiff >= 0){
                startCoord = startNode.getTopConnection(-3);
                if(horizontalDiff == 0){
                    targetCoord = targetNode.getBottomConnection(-3);
                    angle = -Math.PI/2;  // pointing upwards
                } else if(horizontalDiff < 0){
                    targetCoord = targetNode.getRightConnection(3);
                    angle = Math.PI;  // pointing left
                } else {
                    targetCoord = targetNode.getLeftConnection(-3);
                    angle = 0;  // pointing right
                }
            } else {
                startCoord = startNode.getBottomConnection(3);
                if(horizontalDiff == 0){
                    targetCoord = targetNode.getTopConnection(3);
                    angle = -Math.PI/2;  // pointing upwards
                } else if(horizontalDiff < 0){
                    targetCoord = targetNode.getRightConnection(3);
                    angle = Math.PI;  // pointing left
                } else {
                    targetCoord = targetNode.getLeftConnection(-3);
                    angle = 0;  // pointing right
                }
            }
            group.appendChild(this.drawLine(startCoord.x, startCoord.y, startCoord.x, targetCoord.y));
            group.appendChild(this.drawLine(startCoord.x, targetCoord.y, targetCoord.x, targetCoord.y));
            if(weight != 1) group.appendChild(this.addWeight(startCoord.x, (startCoord.y + targetCoord.y)/2 + 7 * Math.sign(horizontalDiff), weight));
        
            
        } else {
            if(verticalDiff >= 0){
                startCoord = startNode.getTopConnection(-3);
                if(horizontalDiff == 0){
                    targetCoord = targetNode.getBottomConnection(-3);
                } else if(horizontalDiff < 0){
                    targetCoord = targetNode.getRightConnection(3);
                } else {
                    targetCoord = targetNode.getLeftConnection(-3);
                }
            } else {
                startCoord = startNode.getBottomConnection(3);
                if(horizontalDiff == 0){
                    targetCoord = targetNode.getTopConnection(3);
                } else if(horizontalDiff < 0){
                    targetCoord = targetNode.getRightConnection(3);
                } else {
                    targetCoord = targetNode.getLeftConnection(-3);
                }
            }
            angle = Math.atan2(targetCoord.y - startCoord.y, targetCoord.x - startCoord.x);
            group.appendChild(this.drawLine(startCoord.x, startCoord.y, targetCoord.x, targetCoord.y));
            if(weight != 1){
                let weight_x = startCoord.x + 1/3 * (targetCoord.x - startCoord.x) - 5;
                let weight_y = startCoord.y + 1/3 * (targetCoord.y - startCoord.y) - 5;
                group.appendChild(this.addWeight(weight_x, weight_y, weight));
            }
        }

        group.appendChild(this.drawArrowHead(targetCoord, angle));

        svg.appendChild(group);

        return group;
    }

    static drawLine(x1, y1, x2, y2){
        const line = document.createElementNS(state.svg.namespaceURI, 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', 'black');
        line.setAttribute('stroke-width', 2);
        return line;
    }

    static drawArrowHead(coords, angle){
        const arrowheadLength = 10;
        
        const arrowheadX1 = coords.x - arrowheadLength * Math.cos(angle - Math.PI/6);  
        const arrowheadY1 = coords.y - arrowheadLength * Math.sin(angle - Math.PI/6);

        const arrowheadX2 = coords.x - arrowheadLength * Math.cos(angle + Math.PI/6);  
        const arrowheadY2 = coords.y - arrowheadLength * Math.sin(angle + Math.PI/6);

        const arrowhead = document.createElementNS(state.svg.namespaceURI, 'polygon');
        arrowhead.setAttribute('points', `${coords.x},${coords.y} ${arrowheadX1},${arrowheadY1} ${arrowheadX2},${arrowheadY2}`);
        arrowhead.setAttribute('fill', 'black');
        return arrowhead;

    }

    static addWeight(x, y, weight){
        let weightText = document.createElementNS(state.svg.namespaceURI, 'text');
        weightText.textContent = weight;
        weightText.setAttribute('x', x + 5);
        weightText.setAttribute('y', y);
        weightText.setAttribute('fill', 'black');
        weightText.setAttribute('font-family', 'Arial');
        weightText.setAttribute('font-size', '10');
        weightText.setAttribute('stroke', 'black');
        weightText.setAttribute('text-anchor', 'middle');
        return weightText;
    }
} 

export function updateTokens(places, markingArr){
    if(state.idNodeMap){
        places.forEach(place => {
            let placeNode = state.idNodeMap.get(place.id_text);
            if(placeNode) placeNode.addTokens(markingArr[place.index])
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