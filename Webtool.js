import { getPlacesAsString, getTransAsString, parse } from "./parsing.js";
import { vizPetriNet } from "./visulization.js";
import { Analysis } from "./analysis.js"

var petriNetAr = []

document.getElementById("fileUpload").addEventListener("change", function() {

    var file = document.getElementById("fileUpload").files[0]
    
    if (file) {
        var reader = new FileReader();
        var filename = file.name;
        var filetype = file.name.split('.').pop(); 
        if(!(filetype === "tpn" || filetype === "pnml")){
            alert("Please upload file in \".tpn\" or \".pnml\" format");
            return;
        }
        reader.readAsText(file, "UTF-8");
        reader.addEventListener('load', () => {
            analyzeInput(reader.result, filetype);
            if(filetype === "tpn") loadConsole(reader.result)
        })
    } else {
        alert("please upload file");
    }
  });

document.getElementById("console_go").onclick = function(){

    var place = document.getElementById("place_console").value;
    var trans = document.getElementById("transition_console").value;
    analyzeInput(place+ "\n" + trans, "tpn")

}

document.getElementById("console_save").onclick = function(){

    let place = document.getElementById("place_console").value;
    let trans = document.getElementById("transition_console").value;
    const content = place+ "\n" + trans;

    const blob = new Blob([content], { type: 'text/plain' });
  
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'PNEd.tpn'; 
    a.click();
}

function analyzeInput(input, filetype){
    var petriNetAr = parse(input, filetype);
    var places = petriNetAr.filter(item => item.type === "place");
    var transitions = petriNetAr.filter(item => item.type === "trans");
    var analysis = new Analysis(places, transitions, true)
    var anaResult = analysis.analyse()
    var markings = anaResult.markings

    loadConsole(input)
    vizMarkingTable(markings, places, transitions)
    vizPetriNet(petriNetAr);
    vizTransitionLabels(transitions);
    vizProperties(anaResult.deadlocks, anaResult.boundedness, anaResult.soundness, anaResult.strSoundness)
}
//doesnt work for .pnml
function loadConsole(input){
    document.getElementById("transition_console").value = getTransAsString(input)
    document.getElementById("place_console").value = getPlacesAsString(input)
}
function vizTransitionLabels(transitions){
    let labels = document.getElementById("labels");
    labels.innerHTML = "";

    transitions.forEach(trans => {
        labels.appendChild(document.createTextNode(trans.id + " ... " + trans.label))
        labels.appendChild(document.createElement("br"))
    })

}
function vizProperties(deadlockList, boundedness, soundness, strSoundness){
    let props = document.getElementById("props");
    props.innerHTML = "";
    props.appendChild(document.createTextNode("deadlocks: "))
    deadlockList.forEach(mark => props.appendChild(document.createTextNode(" " + mark.id)))
    props.appendChild(document.createElement("br"))
    props.appendChild(document.createTextNode("boundedness: " + boundedness))
    props.appendChild(document.createElement("br"))
    props.appendChild(document.createTextNode("soundness: " + soundness))
    props.appendChild(document.createElement("br"))
    props.appendChild(document.createTextNode("strSoundness: " + strSoundness))
    props.appendChild(document.createElement("br"))

}

function vizMarkingTable(markings, places, transitions){
    //document.getElementById("markingTable").appendChild(svg);
    document.getElementById("markingTable").innerHTML = "";

    const tblBody = document.createElement("tbody");

    const firstRow = document.createElement("tr")

    const firstCell = document.createElement("td")
    firstRow.appendChild(firstCell)
    places.forEach(place => {
        firstRow.appendChild(createTextCell(place.id))
    })
    transitions.forEach(trans => {
        firstRow.appendChild(createTextCell(trans.id))
    })
    for(let i = 0; i < 7-places.length-transitions.length;i++){
        firstRow.appendChild(createEmptyCell())
    }
    tblBody.appendChild(firstRow)
    markings.forEach(marking => {
        const row = document.createElement("tr")
        row.appendChild(createTextCell(marking.id))
        marking.markingArr.forEach(placeMark => row.appendChild(createTextCell(placeMark)))
        transitions.forEach(trans1 =>{
            let cell = createTextCell("")
            marking.nextMarks.forEach((follMarking, trans2) => {
                if(trans1.id === trans2.id) {cell = createTextCell(follMarking.id)}
            })
            row.appendChild(cell)
        })
        for(let i = 0; i < (7-places.length-transitions.length);i++){
            row.appendChild(createEmptyCell())
        }

        tblBody.appendChild(row)
    })
    for(let j = 0; j < 7-markings.length;j++){
        const row = document.createElement("tr")
        for(let i = 0; i < places.length+transitions.length+1;i++){
            row.appendChild(createEmptyCell())
        }
        for(let i = 0; i < 7-places.length-transitions.length;i++){
            row.appendChild(createEmptyCell())
        }
        tblBody.appendChild(row)
    }

    document.getElementById("markingTable").appendChild(tblBody);
}

function createTextCell(text){
    const cell = document.createElement("td")
    const cellText = document.createTextNode(text)
    cell.appendChild(cellText)
    return cell
}

function createEmptyCell(){
    const cell = document.createElement("td")
    cell.style.borderColor='gray';
    return cell
}