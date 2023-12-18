import { parse, unparseToPNML} from "./parsing.js";
import { vizPetriNet, updateTokens, highlightTransNode } from "./visulization.js";
import { Analysis } from "./analysis.js"
import { vizMarkingTable, highlightTransColumn } from "./marking-table.js"
import {vizProperties} from "./properties.js"
import {loadConsole, readConsole, addTrans, addPlace, addEdge, clearConsole, highlightTransConsole} from "./console.js"
import {vizTransitionLabels, highlightTransLabel} from "./labels.js"


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
            let petriNet = parse(reader.result, filetype);
            loadConsole(petriNet.places, petriNet.transitions)
            analyzeInput(petriNet);
        })
    } else {
        alert("please upload file");
    }
});

document.getElementById("console_go").onclick = function(){
    analyzeInput(readConsole());
    if(state.highlighted_trans !== undefined){
        highlightTransition(state.highlighted_trans);
    }
}

document.getElementById("console_clear").onclick = function(){
    clearConsole();
}

document.getElementById("console_save").onclick = function(){

    let petriNet = readConsole();

    const content = unparseToPNML(petriNet.transitions, petriNet.places)

    const blob = new Blob([content], { type: 'text/plain' });
  
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'PNEd.pnml'; 
    a.click();
}

export function analyzeInput(petriNet){
    state.petriNet = petriNet;
    let places = petriNet.places;
    let transitions = petriNet.transitions;
    let analysis = new Analysis(petriNet)

    state.anaResult = analysis.analyse()
    let markings = state.anaResult.markings

    state.uncoveredMarkingIDs = new Set()

    if(state.anaResult.fullyConnected){
        vizPetriNet(places.concat(transitions), highlightTransition);
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
        updateTokens(state.petriNet.places, marking.markingArr)
    }
}


document.getElementById("add_trans").onclick = function(){
    addTrans();
}

document.getElementById("add_place").onclick = function(){
    addPlace();
}

document.getElementById("add_edgeT").onclick = function(){
    addEdge(true);
}
document.getElementById("add_edgeP").onclick = function(){
    addEdge(false);
}

export function highlightTransition(id){
    let prev_id = state.highlighted_trans
    state.highlighted_trans = id
    highlightTransNode(id);
    highlightTransLabel(id, prev_id);
    highlightTransColumn(id, prev_id);
    highlightTransConsole(id);
}
