import { parse, unparseToPNML} from "./parsing.js";
import { vizPetriNet, updateTokens } from "./visulization.js";
import { Analysis } from "./analysis.js"
import { vizMarkingTable } from "./marking-table.js"
import {vizProperties} from "./properties.js"
import {loadConsole, readConsole, addTrans, addPlace, addEdge} from "./console.js"


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
}

document.getElementById("console_save").onclick = function(){

    let petriNet = readConsole;

    const content = unparseToPNML(petriNet.transitions, petriNet.places)

    const blob = new Blob([content], { type: 'text/plain' });
  
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'PNEd.pnml'; 
    a.click();
}

function analyzeInput(petriNet){
    let netType = document.getElementById('netType').checked;
    if(netType != petriNet.weights){
        switchToPTNet();
        netType = true;
    }
    netType = document.getElementById('netType').checked;
    state.petriNet = petriNet;
    let places = petriNet.places;
    let transitions = petriNet.transitions;
    let analysis = new Analysis(places, transitions, netType)

    state.anaResult = analysis.analyse()
    let markings = state.anaResult.markings

    state.uncoveredMarkingIDs = new Set()
    vizPetriNet(places.concat(transitions));

    if(state.anaResult.fullyConnected){
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

function vizTransitionLabels(transitions){
    let labels = document.getElementById("labels");
    labels.innerHTML = "";
    transitions.forEach(trans => {
        labels.appendChild(document.createTextNode(trans.id + " ... " + trans.label))
        labels.appendChild(document.createElement("br"))
    })

}

function switchToPTNet(){
    var checkbox = document.getElementById("netType");
    checkbox.checked = true;
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
