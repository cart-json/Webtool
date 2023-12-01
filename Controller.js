import { parse, parseShortPNF, unparseToSPNF, unparseToPNML} from "./parsing.js";
import { vizPetriNet, updateTokens } from "./visulization.js";
import { Analysis } from "./analysis.js"
import { vizMarkingTable } from "./marking-table.js"
import {vizProperties} from "./properties.js"


let state = {}
state.uncoveredMarkingIDs = new Set()

document.getElementById("fileUpload").addEventListener("change", function() {

    let file = document.getElementById("fileUpload").files[0]
    var fileInput = document.getElementById('fileUpload');
    var fileNameDisplay = document.getElementById('fileName');

    if (fileInput.files.length > 0) {
        fileNameDisplay.textContent = fileInput.files[0].name;
    } else {
        fileNameDisplay.textContent = 'No file chosen';
    }
    
    if (file) {
        let reader = new FileReader();
        let filename = file.name;
        let filetype = file.name.split('.').pop(); 
        if(!(filetype === "tpn" || filetype === "pnml")){
            alert("Please upload file in \".tpn\" or \".pnml\" format");
            return;
        }
        reader.readAsText(file, "UTF-8");
        reader.addEventListener('load', () => {
            let petriNetAr = parse(reader.result, filetype);
            loadConsole(petriNetAr.places, petriNetAr.trans)
            analyzeInput(petriNetAr);
            //if(filetype === "tpn") loadConsole(reader.result)
        })
    } else {
        alert("please upload file");
    }
});

document.getElementById("console_body")
    .querySelectorAll('textarea')
    .forEach(function(textarea){
        textarea.addEventListener("blur", reloadIfInputInactive)
    })

function reloadIfInputInactive(){
    let transInput = document.getElementById("transition_console");
    let placeInput = document.getElementById("place_console");
    let edgeInput = document.getElementById("edge_console");

    let activeElement = document.activeElement;

    if(transInput !== activeElement &&
        placeInput !== activeElement && 
        edgeInput !== activeElement){

        analyzeConsoleInput();
    }
}

function analyzeConsoleInput(){

    let place = document.getElementById("place_console").value;
    let trans = document.getElementById("transition_console").value;
    let edges = document.getElementById("edge_console").value;
    let petriNetAr = parseShortPNF(trans, place, edges);
    if(petriNetAr.errors.length != 0){
        console.log(petriNetAr.errors)
        showErrors(petriNetAr.errors)
    } else if(edges !== ""){
        analyzeInput(petriNetAr)
    }

}

document.getElementById("console_go").onclick = function(){
    analyzeConsoleInput();
}

document.getElementById("console_save").onclick = function(){

    let place = document.getElementById("place_console").value;
    let trans = document.getElementById("transition_console").value;
    let edges = document.getElementById("edge_console").value;
    let petriNetAr = parseShortPNF(trans, place, edges);

    const content = unparseToPNML(petriNetAr.trans, petriNetAr.places)

    const blob = new Blob([content], { type: 'text/plain' });
  
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'PNEd.pnml'; 
    a.click();
}

function analyzeInput(petriNetAr){
    let netType = document.getElementById('netType').checked;
    if(netType != petriNetAr.weights){
        switchToPTNet();
        netType = true;
    }
    netType = document.getElementById('netType').checked;
    state.petriNetAr = petriNetAr;
    let places = petriNetAr.places;
    let transitions = petriNetAr.trans;
    let analysis = new Analysis(places, transitions, netType)

    state.anaResult = analysis.analyse()
    let markings = state.anaResult.markings

    state.uncoveredMarkingIDs = new Set()

    console.log(petriNetAr);
    unparseToSPNF(places, transitions)
    if(state.anaResult.fullyConnected){
        vizPetriNet(places.concat(transitions));
    }
    vizProperties(state.anaResult, state.uncoveredMarkingIDs)
    vizMarkingTable(markings, places, transitions, state.anaResult.liveness, state.anaResult.loops)
    
    vizTransitionLabels(transitions);
}

export function uncoverMarking(markingID){
    if(!state.uncoveredMarkingIDs.has(markingID)){
        state.uncoveredMarkingIDs.add(markingID)
        vizProperties(state.anaResult, state.uncoveredMarkingIDs)
    }
}

export function vizMarkingInSVGNet(marking){
    if(state.anaResult.fullyConnected){
        updateTokens(state.petriNetAr.places, marking.markingArr)
    }
}

function loadConsole(places, transitions){
    let netSPNF = unparseToSPNF(places, transitions)
    document.getElementById("transition_console").value = netSPNF.transSPNF
    document.getElementById("place_console").value = netSPNF.placesSPNF
    document.getElementById("edge_console").value = netSPNF.edgeSPNF
}
function vizTransitionLabels(transitions){
    let labels = document.getElementById("labels");
    labels.innerHTML = "";

    transitions.forEach(trans => {
        //if(trans.label != ""){
            labels.appendChild(document.createTextNode(trans.id + " ... " + trans.label))
            labels.appendChild(document.createElement("br"))
        //}
    })

}

function switchToPTNet(){
    var checkbox = document.getElementById("netType");
    checkbox.checked = true;
}


function showErrors(errors){
    let errorConatiner = document.createElement("div");
    errors.forEach(error => errorConatiner.appendChild(
        document.createTextNode("error in " + error.console + " line " + error.line + ": " + error.errorMessage)))
    document.getElementById("content").innerHTML = "";
    document.getElementById("content").appendChild(errorConatiner);
}