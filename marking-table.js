import  {uncoverMarking} from "./Controller.js"



export function vizMarkingTable(markings, places, transitions, liveness, loops){

    const container = document.getElementById("markingTableContainer");
    container.innerHTML = "";

    container.style.display = 'flex'




    const tbl = document.createElement("table");
    tbl.style.borderCollapse = 'collapse';
    tbl.style.position = 'relative';

    const tblHead = document.createElement("thead");

    //creating first row (liveness)
    tblHead.appendChild(createFirstRow(places, liveness))
    //creating second row (place and transition IDs)
    tblHead.appendChild(createSecondRow(places, transitions))

    tbl.appendChild(tblHead);

    //creating table body
    tbl.appendChild(createTableBody(markings, places, transitions));

    //creating arrows for the loops
    const rowHeight = 21; // Height of a row

    const svgWidth = 20 + 5  * loops.filter(loop => loop[0].index != loop[1].index).length
    const svgHeight = rowHeight  * (markings.length + 2)

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.width = svgWidth + 'px'; // Adjust based on your preference
    svg.style.height = '100%';
    svg.style.minHeight = svgHeight + 'px';
    svg.style.zIndex = "1";
    svg.style.position = 'relative';
    svg.style.flexShrink = '0';

    var counter = 0;
    loops.forEach((loop) => {
        const startIndex = loop[0].index + 2
        const targetIndex = loop[1].index + 2
        var difY = 15;
        if(startIndex != targetIndex){
            counter++;
            difY = difY + 5*counter;
        }

        const fromY = (startIndex * rowHeight) + (rowHeight *2 / 3);
        const toY = (targetIndex * rowHeight) + (rowHeight / 3);

        drawArrow(svgWidth, fromY, toY, difY, svg); // Adjust 25 if you change the SVG width
    });
    container.appendChild(svg)
    container.appendChild(tbl)
    unhideRowById("M0")

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

function createTableBody(markings, places, transitions){
    const tblBody = document.createElement("tbody");
    markings.forEach(marking => {
        const row = document.createElement("tr")
        row.appendChild(createTextCell(marking.id))
        row.id = marking.id;
        marking.markingArr.forEach(placeMark => row.appendChild(createTextCell(placeMark == Infinity?"ω" : placeMark)))
        transitions.forEach(trans1 =>{
            let cell = createInteractiveTextCell("")
            marking.nextMarks.forEach((follMarking, trans2) => {
                if(trans1.id === trans2.id) {cell = createInteractiveTextCell(follMarking.id)}
            })
            row.appendChild(cell)
        })
        /*for(let i = 0; i < (7-places.length-transitions.length);i++){
            row.appendChild(createEmptyCell())
        }*/
        row.classList.add("locked")
        tblBody.appendChild(row)
    })
    /*for(let j = 0; j < 7-markings.length;j++){
        const row = document.createElement("tr")
        for(let i = 0; i < places.length+transitions.length+1;i++){
            row.appendChild(createEmptyCell())
        }
        for(let i = 0; i < 7-places.length-transitions.length;i++){
            row.appendChild(createEmptyCell())
        }
        tblBody.appendChild(row)
    }*/
    tblBody.id = "tblBody"
    return tblBody;
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

function createHiddenTextCell(text){
    const cell = createTextCell(text)
    cell.classList.add('hidden');
    return cell

}

function createInteractiveTextCell(text){
    const cell = createHiddenTextCell(text)
    cell.addEventListener('click', function() {
        unhide(this, text);
    });
    cell.classList.add('pointer');
    return cell

}

function unhideRowById(rowId) {
    const row = document.getElementById(rowId);
    if (row && row.classList.contains("locked")) {
        row.classList.remove("locked")
    }
}

function unhide(element, markID) {
    if (element.classList.contains('hidden')) {
        element.classList.remove('hidden');
        let row = element.parentElement;
        let cells = Array.from(row.cells)
        let uncovered = cells.map(cell => cell.classList.contains('hidden')).reduce((prev, cellIsHidden) => prev && !cellIsHidden, true);
        if(uncovered){
            uncoverMarking(row.id)
        }
    } else {
        if(markID != ""){
            unhideRowById(markID)
        }
    }
}

function uncoverRow(row){
    unhideRowById(row.id);
    for (var i = 0; i < row.cells.length; i++) {
        let cell = row.cells[i];
        unhide(cell, "");
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


document.getElementById("unhideButton").onclick = function() {
    const tblBody = document.getElementById("tblBody");
    if(tblBody){
        for (var i = 0; i < tblBody.rows.length; i++) {
            let row = tblBody.rows[i];
            uncoverRow(row);
        }
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