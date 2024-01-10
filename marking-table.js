import  {uncoverMarking, vizMarkingInSVGNet, highlightTransition} from "./Controller.js"

const state = {};

export function vizMarkingTable(markings, places, transitions, liveness, loops){
    state.transitions = transitions;
    state.places = places;
    state.loops = loops;
    state.marking_rows = [];
    state.loaded_rows = [];
    state.tblBody = document.createElement("tbody");
    state.loopArrows = [];
    state.rowHeight = 21;

    markings.forEach(marking => state.marking_rows.push(new MarkingRow(marking)))

    const container = document.getElementById("markingTableContainer");
    container.innerHTML = "";

    container.style.display = 'flex'

    const tbl = document.createElement("table");
    tbl.style.borderCollapse = 'collapse';
    tbl.style.position = 'relative';

    const tblHead = document.createElement("thead");

    //creating first row (liveness)
    tblHead.appendChild(createFirstRow(places, liveness)),
    //creating second row (place and transition IDs)
    tblHead.appendChild(createSecondRow(places, transitions)),

    tbl.appendChild(tblHead);

    //creating table body
    tbl.appendChild(state.tblBody);
    state.marking_rows[0].load();

    const svgWrap = document.createElement("div");
    svgWrap.id = "loopSvgWrap";
    svgWrap.appendChild(setupLoopSVG(loops)),
    container.appendChild(svgWrap),
    vizMarkingInSVGNet(markings[0])
    container.appendChild(tbl),
    createLoopSVG();

}

function createFirstRow(places, liveness){
    const firstRow = document.createElement("tr")
    for(let i = 0; i < places.length + 1; i++){
        firstRow.appendChild(createWhiteCell())
    }
    for(let transLiveness of liveness){
        firstRow.appendChild(createTextCell("L" + transLiveness))
    }
    return firstRow;
}

function createSecondRow(places, transitions){
    const secondRow = document.createElement("tr")
    const firstCell = createTextCell("")
    secondRow.appendChild(firstCell)
    places.forEach(place => {
        secondRow.appendChild(createTextCell(place.id_text))
    })
    transitions.forEach(trans => {
        secondRow.appendChild(createTransitionCell(trans))
    })
    /*for(let i = 0; i < 7-places.length-transitions.length;i++){
        secondRow.appendChild(createEmptyCell())
    }*/
    return secondRow;
}

function unhideCell(element, marking) {
    if (element.classList.contains('hidden')) {
        element.classList.remove('hidden');
        let row = element.parentElement;
        let cells = Array.from(row.cells)
        //if all cells of a marking are not hidden, the marking will be uncovered
        //it will be visible at "deadlocks" in the properties section
        let uncovered = cells.map(cell => cell.classList.contains('hidden')).reduce((prev, cellIsHidden) => prev && !cellIsHidden, true);
        if(uncovered){
            uncoverMarking(row.id)
        }
    } else {
        if(marking){
            highlightLoopArrows(marking);
            vizMarkingInSVGNet(marking)
            state.marking_rows[marking.index].load();
            updateSVG();
            
        }
    }
}

function hideCell(element){
    element.classList.add('hidden')
}

document.getElementById("unhideButton").onclick = function() {
    if(!state.marking_rows) return;
    for (var i = 0; i < state.marking_rows.length; i++) {
        state.marking_rows[i].unhide();
    }
    updateSVG();
}

export function highlightRowByID(rowId){
    const row = document.getElementById(rowId);
    if(!row) return;
    if(!row.classList.contains("highlightedRow")){
        row.classList.add("highlightedRow");
    }
}

export function unhighlightRowByID(rowId){
    const row = document.getElementById(rowId);
    if(!row) return;
    if(row.classList.contains("highlightedRow")){
        row.classList.remove("highlightedRow");
    }
}

export function highlightTransColumn(id, prev_id){
}

export function highlightCellsWithValue(value){
    state.loaded_rows.forEach(row => row.highlightCellsWithValue(value));
    
}

export function unhighlightCellsWithValue(value){
    state.loaded_rows.forEach(row => row.unhighlightCellsWithValue(value));
}

class MarkingRow{
    constructor(marking){
        this.marking = marking;
        this.transCells = [];
        this.placeCells = [];
        this.uncovered = false;
        this.loaded = false;
        this.deleteButton = this.createDeleteButton();
        this.rowElement = this.createRow();
        this.addDeleteButton();
    }

    createRow(){
        const row = document.createElement("tr")
        row.appendChild(createMarkingCell(this.marking))
        row.id = this.marking.id;
        this.marking.markingArr.forEach(placeMark =>   {
            let cell = createTextCell(placeMark == Infinity?"ω" : placeMark)
            this.placeCells.push(cell);
            row.appendChild(cell);
        })
        state.transitions.forEach(trans1 =>{
            let cell = createInteractiveTextCell(null)
            this.marking.nextMarks.forEach((follMarking, trans2) => {
                if(trans1.id === trans2.id) {cell = createInteractiveTextCell(follMarking)}
            })
            this.transCells.push(cell);
            row.appendChild(cell)
        })
        row.appendChild(createWhiteCell())
        return row;
    }
    createDeleteableMarkingRow(){
        let new_row = this.createRow();
        let last_cell = new_row.cells[new_row.cells.length - 1]
        last_cell.style.backgroundColor = "white";
        last_cell.classList.add("stayWhite");
        last_cell.innerHTML = "";
        last_cell.appendChild(this.deleteButton);

        return new_row;
    }

    createDeleteButton(){
        let button = document.createElement("button");
        let text_field = document.createTextNode("X");
        const delete_function = () => {
            this.delete();
            updateSVG();
        }
        button.append(text_field);
        button.style.float = "right";
        button.onclick = delete_function;
        return button;
    }

    removeDeleteButton(){
        let last_cell = this.rowElement.cells[this.rowElement.cells.length - 1]
        last_cell.innerHTML = "";
    }

    addDeleteButton(){
        if(this.marking.index == 0){return;}
        let last_cell = this.rowElement.cells[this.rowElement.cells.length - 1]
        last_cell.innerHTML = "";
        last_cell.appendChild(this.deleteButton);
    }

    load(){
        if(!this.loaded){
            if(state.loaded_rows.length > 0) {
                state.loaded_rows[state.loaded_rows.length - 1].removeDeleteButton();
            }
            state.tblBody.appendChild(this.rowElement);
            state.loaded_rows.push(this);
            this.loaded = true;
        }
    }

    delete(){
        this.hide();
        this.rowElement.parentNode.removeChild(this.rowElement);
        state.loaded_rows.pop();
        this.loaded = false;
        state.loaded_rows[state.loaded_rows.length - 1].addDeleteButton();
    }

    hide(){
        for (var i = 0; i < this.transCells.length; i++) {
            let cell = this.transCells[i];
            hideCell(cell);
        }
    }

    unhide(){
        this.load();
        for (var i = 0; i < this.rowElement.cells.length; i++) {
            let cell = this.rowElement.cells[i];
            unhideCell(cell, null);
        }
    }
    highlightCellsWithValue(value){
        for(let i = 0; i < this.marking.markingArr.length; i++){
            if(this.marking.markingArr[i] == value){
                this.placeCells[i].style.backgroundColor = "red";
            }
        }
    }
    unhighlightCellsWithValue(value){
        for(let i = 0; i < this.marking.markingArr.length; i++){
            if(this.marking.markingArr[i] == value){
                this.placeCells[i].style.backgroundColor = "transparent";
            }
        }
    }
}



function createTextCell(text){
    const cell = document.createElement("td")
    const textWrapDiv = document.createElement("div")
    const textWrapSpan = document.createElement("p")
    const cellText = document.createTextNode(text)
    textWrapSpan.appendChild(cellText)
    textWrapDiv.appendChild(textWrapSpan)
    cell.appendChild(textWrapDiv)
    return cell
}

function createMarkingCell(marking){
    const cell = createTextCell(marking ? marking.id : "")
    cell.addEventListener('click', function() {
        vizMarkingInSVGNet(marking);
        highlightLoopArrows(marking);
    });
    cell.classList.add('pointer');
    return cell;
}


function createTransitionCell(transition){
    const cell = createTextCell(transition ? transition.id_text : "")
    cell.addEventListener('click', function() {
        highlightTransition(transition.id);
    });
    cell.classList.add('pointer');
    return cell;
}

function createInteractiveTextCell(marking){
    const cell = createTextCell(marking ? marking.id : "")
    cell.classList.add('hidden');
    cell.addEventListener('click', function() {
        unhideCell(this, marking);
    });
    cell.classList.add('pointer');
    return cell
}

function createWhiteCell(){
    const cell = document.createElement("td")
    const wrap = document.createElement("div")
    cell.appendChild(wrap)
    cell.style.backgroundColor = "white";
    cell.classList.add("stayWhite");
    cell.style.border='0px';
    return cell
}

function highlightLoopArrows(marking){
    state.loopArrows.forEach(loopArrow => {
        if(loopArrow.startMarkID == marking.id){
            loopArrow.highlightGreen();
        } else if(loopArrow.targetMarkID == marking.id){
            loopArrow.highlightRed();
        } else {
            loopArrow.unhighlight();
        }
    })
}

function setupLoopSVG(){
    const svgWidth = 20 + 5  * state.loops.filter(loop => loop[0].index != loop[1].index).length
    const svgHeight = state.rowHeight  * (state.marking_rows.length + 2)
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.width = svgWidth + 'px'; // Adjust based on your preference
    svg.style.height = '100%';
    svg.style.minHeight = svgHeight + 'px';
    svg.style.zIndex = "1";
    svg.style.position = 'relative';
    svg.style.flexShrink = '0';
    svg.id = "loopSVG"

    //the uncoveredLoops array is getting sorted: the shorter the loop the lower the index
    // This will result in a better visualisation of the loops
    // The path of the arrows for the smaller loops will be closer to the table
    state.loops = state.loops.sort((mark1, mark2) => {
        let lengthLoop1 = mark1[0].index - mark1[1].index;
        let lengthLoop2 = mark2[0].index - mark2[1].index;
        state.loopArrows
        if(Math.abs(lengthLoop1) < Math.abs(lengthLoop2)){
            return -1;
        }
        if(Math.abs(lengthLoop1) < Math.abs(lengthLoop2)){
            return 1;
        }
        if(lengthLoop1 < lengthLoop2){
            return -1;
        }
        if(lengthLoop1 > lengthLoop2){
            return 1;
        }
        return 0;
    });
    return svg;

}

function createLoopSVG(){
    state.loopArrows = [];
    const svg = document.getElementById("loopSVG");
    while (svg.firstChild){
        svg.removeChild(svg.firstChild)
    }

    const rowHeight = 21; // Height of a row
    const svgWidth = parseInt(svg.style.width);

    var counter = 1;
    state.loops.forEach((loop) => {
        let startMarkRow = state.marking_rows[loop[0].index];
        let targetMarkRow = state.marking_rows[loop[1].index];
        if(startMarkRow.loaded && targetMarkRow.loaded){
            let yDistance = 0;
            if(startMarkRow.rowElement.id != targetMarkRow.rowElement.id){
                yDistance = counter;
                counter ++;
            }
            let arrowElement = new LoopArrow(startMarkRow, targetMarkRow, yDistance, svg);
            state.loopArrows.push(arrowElement)

        }
    });
    return svg;
}

function updateSVG(){
    let svgWrap = document.getElementById("loopSvgWrap");
    let newSVG = createLoopSVG();
    svgWrap.innerHTML = "";
    svgWrap.appendChild(newSVG);
}

class LoopArrow{
    constructor(startRow, targetRow, yDistance, svg){
        this.startMarkID = startRow.marking.id;
        this.targetMarkID = targetRow.marking.id;
        this.svg = svg;
        let y = startRow.rowElement.offsetTop;
        let y2 = targetRow.rowElement.offsetTop;
        this.difY = 15 + yDistance * 5;
        this.fromY = y + (state.rowHeight * 2 / 3);
        this.toY = y2 + (state.rowHeight / 3);
        [this.path, this. polygon, this.marker] = this.draw(svg)
    }

    draw(svg) {
        const startX = parseInt(svg.style.width);
        const svgNS = "http://www.w3.org/2000/svg";
        const markerNS = "http://www.w3.org/1999/xlink";
    
        const leftX = startX - this.difY;
        const rightX = startX - 10;

        const id = "head" + this.fromY + "S" + this.toY;
    
        const path = document.createElementNS(svgNS, 'path');
        const d = `M${startX},${this.fromY} L${leftX},${this.fromY} L${leftX},${this.toY} L${rightX},${this.toY}`;
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'black');
        path.setAttribute('stroke-width', '2');
    
        const marker = document.createElementNS(svgNS, 'marker');
        marker.setAttribute('id', id);
        marker.setAttribute('markerWidth', '5');
        marker.setAttribute('markerHeight', '4');
        marker.setAttribute('refX', '0');
        marker.setAttribute('refY', '2');
        marker.setAttribute('orient', 'auto');
    
        const polygon = document.createElementNS(svgNS, 'polygon');
        polygon.setAttribute('points', '0 0, 5 2, 0 4');
        //polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
        polygon.setAttribute('fill', 'black');
        marker.appendChild(polygon);
    
        svg.appendChild(marker);
    
        path.style.markerEnd = 'url(#' + id + ')';
    
        svg.appendChild(path);

        return [path, polygon, marker]
    }

    highlightRed(){
        //change color of the error to red
        this.path.setAttribute('stroke', 'red');
        this.polygon.setAttribute('fill', 'red');
        //add the elements to the svg again, so they are on top of all elements
        this.svg.appendChild(this.marker);
        this.svg.appendChild(this.path);
        
    }

    highlightGreen(){
        //change color of the error to red
        this.path.setAttribute('stroke', 'green');
        this.polygon.setAttribute('fill', 'green');
        //add the elements to the svg again, so they are on top of all elements
        this.svg.appendChild(this.marker);
        this.svg.appendChild(this.path);
        
    }

    unhighlight(){
        this.path.setAttribute('stroke', 'black');
        this.polygon.setAttribute('fill', 'black');
        
    }
}