let state = {}

// Main function to visualize the Petri Net
export function vizPetriNet(components, highlightTrasition, isPTNet) {
    // Return if there are no components to visualize
    if(components.length == 0) return;

    // Initialize the state of the visualization
    state.idNodeMap = new Map();
    state.grid = [];
    state.isPTNet = isPTNet;
    state.transOnclickFunction = highlightTrasition;
    state.highlightedNode = -1;

    let nodes = []; // Stores all nodes for drawing
    let gridWidth = 0; // Tracks the width of the grid for layout

    // Function to add nodes to the tree to the grid
    function addTreeNode(element, rowIndex, width, column, treeWidth){
        // Initialize row in grid if not existing
        if(!state.grid[rowIndex]) state.grid[rowIndex] = new Array(treeWidth).fill("");

        // Create and add the new node
        let newNode = new Node(element, column, rowIndex)
        state.grid[rowIndex][column] = newNode;
        nodes.push(newNode)
        state.idNodeMap.set(element.id_text, newNode)

        return newNode;
    }

    // Process each component to create visualization trees
    for(let component of components){
        let [tree, treeWidth] = createTree(component);
        let startRow = state.grid.length;
        if(gridWidth < treeWidth) gridWidth = treeWidth;
        // Add all tree nodes to the grid
        tree.forEach(treeNode => addTreeNode(treeNode.element, treeNode.row 
            + startRow, treeNode.width, treeNode.column, gridWidth))
    }

    // Initialize the SVG element for the visualization
    let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    state.svg = svg;

    // Set the dimensions of the SVG based on the grid
    svg.setAttribute('width', gridWidth * 70 + 50)
    svg.setAttribute('height', state.grid.length *70 + 70)

    // Draw nodes and edges on the SVG
    nodes.forEach(node => node.drawNode());
    nodes.forEach(node => {
        node.element.outgoing.forEach(follElem => {
            new Arrow(node, state.idNodeMap.get(follElem.id_text), 
                node.element.outgoingWeights.get(follElem))
        })
    })
    return svg;
}

function createTree(component) {
    // Initialize variables for building the tree
    let addedElems = new Set()
    let tree = [];
    let queue = [];
    let firstRow = [];

    // Function to add a treeNode to the tree at a specified row
    function addNode(element, row){
        const treeNode = {
            element: element,
            children: [],
            width: 1,
            depth: 0,
            row: row,
            column: 0
        };
        tree.push(treeNode);
        return treeNode;
    }

    // Process initial treeNode (with no incoming edges) and add to tree
    for (var n = 0; n < component.length; n++) {
        if (component[n].incoming.length == 0) {
            let treeNode = addNode(component[n], 0);
            firstRow.push(treeNode);
            queue.push(treeNode);
            addedElems.add(component[n]);
        }
    };
    // In case no initial tree nodes were found, start with the first node in the component
    if(tree.length == 0){
        let treeNode = addNode(component[0], 0);
        firstRow.push(treeNode);
        queue.push(treeNode);
        addedElems.add(component[0]);
    }
    // BFS to build tree, adding children to each treeNode
    while (queue.length != 0) {
        let treeNode = queue.shift()
        treeNode.element.outgoing.forEach(out => {
            if (!addedElems.has(out)) {
                let newNode = addNode(out, treeNode.row + 1)
                queue.push(newNode);
                treeNode.children.push(newNode);
                addedElems.add(out);
            }
        })
        treeNode.element.incoming.forEach(inc => {
            if (!addedElems.has(inc)) {
                let newNode = addNode(inc, treeNode.row + 1)
                queue.push(newNode);
                treeNode.children.push(newNode);
                addedElems.add(inc);
            }
        })
    }
    // Calculate recursively the width of the tree and each sub-tree 
    // and sort the subtrees according to their depth
    function calcDepth(treeNode){
        let result;
        if(treeNode.children.length == 0){
            result = 0;
        } else {
            result = treeNode.children.reduce((a,childNode) => {
                    let childDepth = calcDepth(childNode);
                    return a < childDepth ? childDepth : a;
                }, 0) + 1;
        }
        treeNode.children.sort((childA, childB) => {
            if(childA.depth < childB.depth){
                return 1;
            } else if (childA.depth > childB.depth){
                return -1;
            } else {
                return 0;
            } 
        })
        treeNode.depth = result;
        return result;
    }
    // Calculate recursively the width of the tree and each sub-tree
    function calcWidth(treeNode){
        let result = 0;
        let children = treeNode.children;
        if(treeNode.children.length == 0){
            result = 1;
        } else {
            for(let i = 0; i < children.length; i++){
                if(i == 0){
                    calcWidth(children[i]);
                } else {
                    // Calculate the width iof the children[i-1] at the specified depth
                    let depth = children[i].depth;
                    children[i-1].width = calcWidthAtDepth(children[i-1], depth + 1)
                }
            }
            result = children.reduce((a,childNode) => a + childNode.width, 0);
        }
        treeNode.width = result;
        return result;
    }
    // Calculate recursively the width of the tree and each sub-tree at 
        //a specific depth
    function calcWidthAtDepth(treeNode, depth){
        let result = 0;
        let children = treeNode.children;
        if(treeNode.children.length == 0 || depth == 0){
            result = 1;
        } else {
            result = children.reduce((a,childNode) => 
                a + calcWidthAtDepth(childNode, depth - 1), 0);
        }
        treeNode.width = result;
        return result;
    }

    // Calculate recursively the column positions of each treeNode
    function calcColumn(treeNode){
        for(let i = 0; i < treeNode.children.length; i++){
            if(i == 0){
                treeNode.children[i].column = treeNode.column;
            } else {
                treeNode.children[i].column = treeNode.children[i-1].width 
                    + treeNode.children[i-1].column;
            }
            calcColumn(treeNode.children[i]);
        }
    }
    // Calculate columns for the whole tree
    for(let i = 0; i < firstRow.length; i++){
        calcDepth(firstRow[i]);
        calcWidth(firstRow[i]);
        if(i > 0)
            firstRow[i].column = firstRow[i - 1].width + firstRow[i - 1].column;
        calcColumn(firstRow[i]);
    }

    // Calculate the total width required for the tree
    let treeWidth = tree.reduce((prevMax, treeNode) => 
        prevMax < treeNode.column ? treeNode.column : prevMax, 0) + 1;

    // Return the constructed tree and its required width
    return [tree, treeWidth];
}

function createTree2(component) {
    // Initialize variables for building the tree
    let addedElems = new Set()
    let tree = [];
    let queue = [];
    let firstRow = [];

    // Function to add a treeNode to the tree at a specified depth
    function addNode(element, depth){
        const treeNode = {
            element: element,
            children: [],
            width: 1,
            depth: depth,
            column: 0
        };
        tree.push(treeNode);
        return treeNode;
    }

    // Process initial treeNode (with no incoming edges) and add to tree
    for (var n = 0; n < component.length; n++) {
        if (component[n].incoming.length == 0) {
            let treeNode = addNode(component[n], 0);
            firstRow.push(treeNode);
            queue.push(treeNode);
            addedElems.add(component[n]);
        }
    };
    // In case no initial tree nodes were found, start with the first node in the component
    if(tree.length == 0){
        let treeNode = addNode(component[0], 0);
        firstRow.push(treeNode);
        queue.push(treeNode);
        addedElems.add(component[0]);
    }
    // BFS to build tree, adding children to each treeNode
    while (queue.length != 0) {
        let treeNode = queue.shift()
        treeNode.element.outgoing.forEach(out => {
            if (!addedElems.has(out)) {
                let newNode = addNode(out, treeNode.depth + 1)
                queue.push(newNode);
                treeNode.children.push(newNode);
                addedElems.add(out);
            }
        })
        treeNode.element.incoming.forEach(inc => {
            if (!addedElems.has(inc)) {
                let newNode = addNode(inc, treeNode.depth + 1)
                queue.push(newNode);
                treeNode.children.push(newNode);
                addedElems.add(inc);
            }
        })
    }
    // Calculate recursively the width of the tree and each sub-tree
    function calcWidth(treeNode){
        let result;
        if(treeNode.children.length == 0){
            result = 1;
        } else {
            result = treeNode.children.reduce((a,childNode) => a + calcWidth(childNode), 0);
        }
        treeNode.width = result;
        return result;
    }

    // Calculate recursively the column positions of each treeNode
    function calcColumn(treeNode){
        for(let i = 0; i < treeNode.children.length; i++){
            if(i == 0){
                treeNode.children[i].column = treeNode.column;
            } else {
                treeNode.children[i].column = treeNode.children[i-1].width 
                    + treeNode.children[i-1].column;
            }
            calcColumn(treeNode.children[i]);
        }
    }
    // Calculate columns for the whole tree
    for(let i = 0; i < firstRow.length; i++){
        calcWidth(firstRow[i]);
        if(i > 0)
            firstRow[i].column = firstRow[i - 1].width + firstRow[i - 1].column;
        calcColumn(firstRow[i]);
    }

    // Calculate the total width required for the tree
    let treeWidth = firstRow.reduce((sum, treeNode) => sum + treeNode.width, 0)

    // Return the constructed tree and its required width
    return [tree, treeWidth];
}

// Function to add a rectangle (representing a transition) to the SVG
function addRect(node) {
    // Add rectangle
    var rect = document.createElementNS(state.svg.namespaceURI, 'rect');
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
    state.svg.appendChild(rect)

    // Add label
    addText(node.element.id_text, node.xCoordinate + 18, node.yCoordinate - 20)

    return rect;
}

// Function to add a circle (representing a place) to the SVG
function addPlace(node) {

    // Add circle
    var circle = document.createElementNS(state.svg.namespaceURI, 'circle');
    circle.setAttribute('id', node.element.id_text);
    circle.setAttribute('r', 8);
    circle.setAttribute('cx', node.xCoordinate);
    circle.setAttribute('cy', node.yCoordinate);
    circle.setAttribute('fill', '#ffffff');
    circle.setAttribute('stroke', 'black');
    circle.setAttribute('stroke-width', 2);
    state.svg.appendChild(circle)

    // Add label for the place
    addText(node.element.id_text, node.xCoordinate + 18, node.yCoordinate - 8)

    return circle;
}

// Function to add text to the svg at a specific position (x, y)
function addText(text, x, y){
    var label = document.createElementNS(state.svg.namespaceURI, 'text');
    label.textContent = text;
    label.setAttribute('x', x);
    label.setAttribute('y', y);
    label.setAttribute('fill', 'black');
    label.setAttribute('font-family', 'Arial');
    label.setAttribute('font-size', '12');
    label.setAttribute('text-anchor', 'middle');
    state.svg.appendChild(label);
}

// Class definition for Node
class Node{
    // Initialize necessary attributes
    constructor(element, column, row){
        const distance = 70;
        this.element = element;
        this.column = column;
        this.row = row;
        this.isPlace = !element.isTrans;
        //calculate Position
        this.xCoordinate = (column + 1) * distance;
        this.yCoordinate = (row + 1) * distance;
        this.outgoingArrows = [];
        this.incomingArrows = [];
        this.width = 1;
    }

    // Function to draw the node on the SVG
    drawNode(){
        this.vizNode = this.isPlace ? addPlace(this) : addRect(this)

        // Add token count if the node is a place and has a finite capacity
            // and the net is an P/T net
        if(this.isPlace && state.isPTNet && this.element.capacity != Infinity){
            let capaText = document.createElementNS(state.svg.namespaceURI, "text");
            capaText.setAttribute('id', this.element.id + "capa");
            capaText.setAttribute("x", this.xCoordinate - 8);
            capaText.setAttribute("y", this.yCoordinate - 8);
            capaText.setAttribute("fill", "black");
            capaText.textContent = this.element.capacity;    
            capaText.setAttribute('text-anchor', 'end');
            capaText.style.fontSize = '13px';
            state.svg.appendChild(capaText); 
        }
    }

    addOutgoingArrow(arrow){
        this.outgoingArrows.push(arrow);
    }

    addIncomingArrow(arrow){
        this.incomingArrows.push(arrow);
    }

    // Function that changes the color of the node and the connected arrows
    highlight(){
        if(this.isPlace){
            this.vizNode.setAttribute('stroke', 'red');
        } else  {
            this.vizNode.setAttribute('fill', 'red')
            this.outgoingArrows.forEach(arrow => arrow.highlight("green"));
            this.incomingArrows.forEach(arrow => arrow.highlight("red"));
        }
        state.svg.appendChild(this.vizNode);
    }

    // Function that turns the node and the connected arrows to the initial color
    unhighlight(){
        if(this.isPlace){
            this.vizNode.setAttribute('stroke', 'black');
        } else  {
            this.vizNode.setAttribute('fill', 'black')
            this.outgoingArrows.forEach(arrow => arrow.unhighlight());
            this.incomingArrows.forEach(arrow => arrow.unhighlight());
        }
    }

    // Function return the coordinates of the nodes connection Points
    // An arrow can connect to the right, left, bottom or top of the node
    // 'diff' is a value dependent if the arrow is incoming or outgoing
        //this makes it easier to visualise the arrows
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

    // Function that adds or removes tokens from a place
    addTokens(numberOfTokens){
        let tokenCircle = state.svg.getElementById(this.element.id + "tkn");
        let tokenText = state.svg.getElementById(this.element.id + "txt");
        if(tokenCircle){
            state.svg.removeChild(tokenCircle);
        }
        if(tokenText){
            state.svg.removeChild(tokenText);
        }
        const createToken = () => {
            let tokenCircle = document.createElementNS(state.svg.namespaceURI, 'circle');
            tokenCircle.setAttribute('id', this.element.id + "tkn");
            tokenCircle.setAttribute('r', 4);
            tokenCircle.setAttribute('cx', this.xCoordinate);
            tokenCircle.setAttribute('cy', this.yCoordinate);
            tokenCircle.setAttribute('fill', 'black');
            return tokenCircle;
        }
        // How the number of Tokens is visualized depends on how many tokens should be added
        if(numberOfTokens > 9){
            state.svg.appendChild(createToken());
            let newText = document.createElementNS(state.svg.namespaceURI, "text");
            newText.setAttribute('id', this.element.id + "txt");
            newText.setAttribute("x", this.xCoordinate + 8); 
            newText.setAttribute("y", this.yCoordinate + 18);
            newText.setAttribute("fill", "black");
            newText.textContent = numberOfTokens == Infinity ? "ω" : numberOfTokens;    
            newText.style.fontSize = '13px';
            state.svg.appendChild(newText); 

        } else if(numberOfTokens > 1){
            let newText = document.createElementNS(state.svg.namespaceURI, "text");
            newText.setAttribute('id', this.element.id + "txt");
            newText.setAttribute("x", this.xCoordinate - 4);
            newText.setAttribute("y", this.yCoordinate + 5);
            newText.setAttribute("fill", "black");
            newText.textContent = numberOfTokens;    
            newText.style.fontSize = '13px';
            state.svg.appendChild(newText); 
        } else if(numberOfTokens == 1){
            state.svg.appendChild(createToken());
        }
        
    }


}

// Function to check if a horizontal line segment in the grid is free
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

// Function to check if a vertical line segment in the grid is free
function verticalLineIsFree(x,from, to, offset){
    if (from > to) {
        [from, to] = [to, from];
        offset = (offset + 1) % 2;
    }
    if(state.grid.length <= to)
        return false;
    for(let i = from + offset; i < to + offset; i++){
        if(state.grid[i].length < x || state.grid[i][x] !== "") 
            return false;
    }
    return true;
}

// Class definition for Arrow
class Arrow {
    // Initialize necessary attributes
    constructor(startNode, targetNode, weight){
        this.startNode = startNode;
        this.targetNode = targetNode;
        this.weight = weight;
        // Add arrow to the respective lists of the connected nodes
        targetNode.addIncomingArrow(this);
        startNode.addOutgoingArrow(this);
        // Draw the arrow and store its visualization
        this.arrowViz = Arrow.drawArrow(startNode, targetNode, weight);
    }

    // Function that changes the color of the arrow
    highlight(color){
        this.arrowViz.querySelectorAll('line, polygon, text').forEach(elem => {
            elem.setAttribute('stroke', color);
            elem.setAttribute('fill', color);
        });
        state.svg.appendChild(this.arrowViz);
    }

    // Function that turns the node and the connected arrows to the initial color
    unhighlight(){
        this.arrowViz.querySelectorAll('line, polygon, text').forEach(elem => {
            elem.setAttribute('stroke', 'black');
            elem.setAttribute('fill', 'black');
        });
    }

    // Static method to draw an arrow between two nodes
    static drawArrow(startNode, targetNode, weight){
        let coord1;
        let coord2;
        let angle;
        //is <0 if goes down, >0 if goes up
        let vertDiff = startNode.row - targetNode.row;
        //is <0 if goes left, >0 if goes right
        let horiDiff = targetNode.column - startNode.column;

        const group = document.createElementNS(state.svg.namespaceURI, 'g')

        //check if the horizontal-vertical path is free
        if(horizontalLineIsFree(startNode.row, startNode.column, targetNode.column, 1) &&
            verticalLineIsFree(targetNode.column, startNode.row, targetNode.row, 0)){
                // The connection points to the nodes are calculated
                if(vertDiff >= 0){
                    coord2 = targetNode.getBottomConnection(-3);
                    angle = -Math.PI/2;  // pointing upwards
                    if(horiDiff == 0){
                        coord1 = startNode.getTopConnection(-3);
                    } else if(horiDiff < 0){
                        coord1 = startNode.getLeftConnection(3);
                    } else {
                        coord1 = startNode.getRightConnection(-3);
                    }
                } else {
                    coord2 = targetNode.getTopConnection(3);
                    angle = Math.PI/2;  // pointing downwards
                    if(horiDiff == 0){
                        coord1 = startNode.getBottomConnection(3);
                    } else if(horiDiff < 0){
                        coord1 = startNode.getLeftConnection(3);
                    } else {
                        coord1 = startNode.getRightConnection(-3);
                    }
                }

                // Horizontal and vertical line are drawn 
                group.appendChild(this.drawLine(coord1.x, coord1.y, coord2.x, coord1.y));
                group.appendChild(this.drawLine(coord2.x, coord1.y, coord2.x, coord2.y));
                // The weight is visualized if its above 1
                if(weight != 1) group.appendChild(this.addWeight(coord2.x - 5 * Math.sign(vertDiff), (coord1.y + coord2.y) /2 + 7 * Math.sign(horiDiff), weight, vertDiff>0));

        //check if the vertical-horizontal path is free
        } else if (verticalLineIsFree(startNode.column, startNode.row, targetNode.row, 1) &&
        horizontalLineIsFree(targetNode.row, startNode.column, targetNode.column, 0)){
            // The connection points to the nodes are calculated
            if(vertDiff >= 0){
                coord1 = startNode.getTopConnection(-3);
                if(horiDiff == 0){
                    coord2 = targetNode.getBottomConnection(-3);
                    angle = -Math.PI/2;  // pointing upwards
                } else if(horiDiff < 0){
                    coord2 = targetNode.getRightConnection(3);
                    angle = Math.PI;  // pointing left
                } else {
                    coord2 = targetNode.getLeftConnection(-3);
                    angle = 0;  // pointing right
                }
            } else {
                coord1 = startNode.getBottomConnection(3);
                if(horiDiff == 0){
                    coord2 = targetNode.getTopConnection(3);
                    angle = -Math.PI/2;  // pointing upwards
                } else if(horiDiff < 0){
                    coord2 = targetNode.getRightConnection(3);
                    angle = Math.PI;  // pointing left
                } else {
                    coord2 = targetNode.getLeftConnection(-3);
                    angle = 0;  // pointing right
                }
            }
            // Horizontal and vertical line are drawn 
            group.appendChild(this.drawLine(coord1.x, coord1.y, coord1.x, coord2.y));
            group.appendChild(this.drawLine(coord1.x, coord2.y, coord2.x, coord2.y));
            // The weight is visualized if its above 1
            if(weight != 1) group.appendChild(this.addWeight(coord1.x - 5 * Math.sign(vertDiff), (coord1.y + coord2.y)/2 + 7 * Math.sign(horiDiff), weight, vertDiff>0));
        
        } else {
            // The connection points to the nodes are calculated
            if(vertDiff >= 0){
                coord1 = startNode.getTopConnection(-3);
                if(horiDiff == 0){
                    coord2 = targetNode.getBottomConnection(-3);
                } else if(horiDiff < 0){
                    coord1 = startNode.getLeftConnection(3);
                    coord2 = targetNode.getRightConnection(3);
                } else {
                    coord1 = startNode.getRightConnection(-3);
                    coord2 = targetNode.getLeftConnection(-3);
                }
            } else {
                coord1 = startNode.getBottomConnection(3);
                if(horiDiff == 0){
                    coord2 = targetNode.getTopConnection(3);
                } else if(horiDiff < 0){
                    coord1 = startNode.getLeftConnection(3);
                    coord2 = targetNode.getRightConnection(3);
                } else {
                    coord1 = startNode.getRightConnection(-3);
                    coord2 = targetNode.getLeftConnection(-3);
                }
            }
            angle = Math.atan2(coord2.y - coord1.y, coord2.x - coord1.x);
            // Diagonal line is drawn 
            group.appendChild(this.drawLine(coord1.x, coord1.y, coord2.x, coord2.y));
            // The weight is visualized if its above 1
            if(weight != 1){
                let weight_x = coord1.x + 2/5 * (coord2.x - coord1.x) - 4 * Math.sign(vertDiff);
                let weight_y = coord1.y + 2/5 * (coord2.y - coord1.y) - 10 * Math.sign(vertDiff);
                group.appendChild(this.addWeight(weight_x, weight_y, weight, vertDiff>0));
            }
        }

        group.appendChild(this.drawArrowHead(coord2, angle));
        state.svg.appendChild(group);
        return group;
    }

    // Static method to draw a line as part of an arrow
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
    // Static method to draw the arrowhead
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

    static addWeight(x, y, weight, goingUp){
        let weightText = document.createElementNS(state.svg.namespaceURI, 'text');
        if(goingUp){
            weightText.setAttribute('text-anchor', 'end');
        } else {
            weightText.setAttribute('text-anchor', 'start');
        }
        weightText.textContent = weight;
        weightText.setAttribute('x', x);
        weightText.setAttribute('y', y);
        weightText.setAttribute('fill', 'black');
        weightText.setAttribute('font-family', 'Arial');
        weightText.setAttribute('font-size', '10');
        weightText.setAttribute('stroke', 'black');
        return weightText;
    }
} 
// Function visualizes the tokens described in "markingArr" in the svg
export function updateTokens(places, markingArr){
    if(state.idNodeMap){
        places.forEach(place => {
            let placeNode = state.idNodeMap.get(place.id_text);
            if(placeNode) placeNode.addTokens(markingArr[place.index])
        })
    }
}

export function highlightNode(id){
    let node = state.idNodeMap.get(id);
    if(node) node.highlight();
    
}

export function unhighlightNode(id){
    let node = state.idNodeMap.get(id);
    if(node) node.unhighlight();
    highlightTransNode(state.highlightedNode);
}

// Function highlights a transition in the svg and unhighlights the previous one
export function highlightTransNode(id){
    // If a node is highlighted it gets unhighlighted
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