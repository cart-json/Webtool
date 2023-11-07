import  {uncoverMarking, vizMarkingInSVGNet} from "./Controller.js"

const state = {};

export function vizMarkingTable(markings, places, transitions, liveness, loops){
    state.markings = markings;
    state.transitions = transitions;
    state.places = places;
    state.loops = loops;
    state.loadedMarkingIdices = new Set();

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
    tbl.appendChild(createTableBody());

    const svgWrap = document.createElement("div");
    svgWrap.id = "loopSvgWrap";
    svgWrap.appendChild(setupLoopSVG(loops)),
    container.appendChild(svgWrap),
    vizMarkingInSVGNet(markings[0])
    container.appendChild(tbl),
    createLoopSVG();

}

function setupLoopSVG(){
    const rowHeight = 21; // Height of a row

    const svgWidth = 20 + 5  * state.loops.filter(loop => loop[0].index != loop[1].index).length
    const svgHeight = rowHeight  * (state.markings.length + 2)
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.width = svgWidth + 'px'; // Adjust based on your preference
    svg.style.height = '100%';
    svg.style.minHeight = svgHeight + 'px';
    svg.style.zIndex = "1";
    svg.style.position = 'relative';
    svg.style.flexShrink = '0';
    svg.id = "loopSVG"

    return svg;

}

function createLoopSVG(){
    const svg = document.getElementById("loopSVG");
    while (svg.firstChild){
        svg.removeChild(svg.firstChild)
    }

    let uncoveredLoops = state.loops.filter(loop => state.loadedMarkingIdices.has(loop[0].index) &&
        state.loadedMarkingIdices.has(loop[1].index))

    //the uncoveredLoops array is getting sorted: the shorter the loop the lower the index
    // This will result in a better visualisation of the loops
    // The path of the arrows for the smaller loops will be closer to the table
    uncoveredLoops = uncoveredLoops.sort((loop1, loop2) => {
        let lengthLoop1 = loop1[0].index - loop1[1].index;
        let lengthLoop2 = loop2[0].index - loop2[1].index;

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

    const rowHeight = 21; // Height of a row
    const svgWidth = parseInt(svg.style.width);

    var counter = 0;
    uncoveredLoops.forEach((loop) => {
        const startRow = document.getElementById(loop[0].id);
        let y = startRow.offsetTop;
        const targetRow = document.getElementById(loop[1].id);
        let y2 = targetRow.offsetTop;
        const startIndex = loop[0].index + 2
        const targetIndex = loop[1].index + 2
        var difY = 15;
        if(startIndex != targetIndex){
            counter++;
            difY = difY + 5*counter;
        }

        const fromY = y + (rowHeight *2 / 3);
        const toY = y2 + (rowHeight / 3);

        //creating arrows for the loops
        drawArrow(svgWidth, fromY, toY, difY, svg);
    });
    return svg;
}

function updateSVG(){
    let svgWrap = document.getElementById("loopSvgWrap");
    let newSVG = createLoopSVG();
    svgWrap.innerHTML = "";
    svgWrap.appendChild(newSVG);


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
        secondRow.appendChild(createTextCell(place.id))
    })
    transitions.forEach(trans => {
        secondRow.appendChild(createTextCell(trans.id))
    })
    /*for(let i = 0; i < 7-places.length-transitions.length;i++){
        secondRow.appendChild(createEmptyCell())
    }*/
    return secondRow;
}

function createTableBody(){
    const tblBody = document.createElement("tbody");
    tblBody.appendChild(createMarkingRow(state.markings[0]))
    tblBody.id = "tblBody"
    return tblBody;
}

function createMarkingRow(marking){
    const row = document.createElement("tr")
    row.appendChild(createTextCell(marking.id))
    row.id = marking.id;
    marking.markingArr.forEach(placeMark => 
        row.appendChild(createTextCell(placeMark == Infinity?"ω" : placeMark)))
    state.transitions.forEach(trans1 =>{
        let cell = createInteractiveTextCell(null)
        marking.nextMarks.forEach((follMarking, trans2) => {
            if(trans1.id === trans2.id) {cell = createInteractiveTextCell(follMarking)}
        })
        row.appendChild(cell)
    })
    state.loadedMarkingIdices.add(marking.index);
    return row;
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

function createInteractiveTextCell(marking){
    const cell = createTextCell(marking ? marking.id : "")
    cell.classList.add('hidden');
    cell.addEventListener('click', function() {
        unhide(this, marking);
    });
    cell.classList.add('pointer');
    return cell

}

function unhide(element, marking) {
    if (element.classList.contains('hidden')) {
        element.classList.remove('hidden');
        let row = element.parentElement;
        let cells = Array.from(row.cells)
        let uncovered = cells.map(cell => cell.classList.contains('hidden')).reduce((prev, cellIsHidden) => prev && !cellIsHidden, true);
        if(uncovered){
            uncoverMarking(marking)
        }
    } else {
        if(marking){
            vizMarkingInSVGNet(marking)
            if(!state.loadedMarkingIdices.has(marking.index)){
                const tblBody = document.getElementById("tblBody");
                tblBody.appendChild(createMarkingRow(marking));
                updateSVG();
            }
        }
    }
}

function unhideRow(row){
    for (var i = 0; i < row.cells.length; i++) {
        let cell = row.cells[i];
        unhide(cell, null);
    }
}


document.getElementById("unhideButton").onclick = function() {
    const tblBody = document.getElementById("tblBody");
    if(tblBody){
        for (var i = 0; i < tblBody.rows.length; i++) {
            let row = tblBody.rows[i];
            unhideRow(row);
        }
        for (var i = 0; i < state.markings.length; i++) {
            if(!state.loadedMarkingIdices.has(i)){
                const row = createMarkingRow(state.markings[i]);
                tblBody.appendChild(row);
                unhideRow(row);
            }
        }

        updateSVG();
    }
}

export function highlightRowByID(rowId){
    const row = document.getElementById(rowId);
    if(!row.classList.contains("highlightedRow")){
        row.classList.add("highlightedRow");
    }
}

export function unhighlightRowByID(rowId){

    const row = document.getElementById(rowId);
    if(row.classList.contains("highlightedRow")){
        row.classList.remove("highlightedRow");
    }
}

function createEmptyCell(){
    const cell = document.createElement("td")
    const wrap = document.createElement("div")
    cell.appendChild(wrap)
    cell.style.borderColor='lightgray';
    return cell
}

function createWhiteCell(){
    const cell = document.createElement("td")
    const wrap = document.createElement("div")
    cell.appendChild(wrap)
    cell.style.border='0px';
    return cell
}
function drawArrow(startX, startY, endY, difY, svg) {
    const svgNS = "http://www.w3.org/2000/svg";
    const markerNS = "http://www.w3.org/1999/xlink";

    const leftX = startX - difY;
    const rightX = startX - 10;

    const path = document.createElementNS(svgNS, 'path');
    const d = `M${startX},${startY} L${leftX},${startY} L${leftX},${endY} L${rightX},${endY}`;
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'black');
    path.setAttribute('stroke-width', '2');

    const marker = document.createElementNS(svgNS, 'marker');
    marker.setAttribute('id', 'arrowhead');
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

    path.style.markerEnd = 'url(#arrowhead)';

    svg.appendChild(path);
}