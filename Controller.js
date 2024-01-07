import { parse, unparseToPNML} from "./parsing.js";
import { vizPetriNet, updateTokens, highlightTransNode } from "./visulization.js";
import { Analysis } from "./analysis.js"
import { vizMarkingTable, highlightTransColumn } from "./marking-table.js"
import {vizProperties} from "./properties.js"
import {loadConsole, readConsole, clearConsole, highlightTransConsole, reloadConsole} from "./console.js"
import {vizTransitionLabels, highlightTransLabel} from "./labels.js"


let state = {}
state.uncoveredMarkingIDs = new Set()
state.isPTNet = false;

document.getElementById("fileUpload").addEventListener("change", function() {

    let file = document.getElementById("fileUpload").files[0]
    let fileInput = document.getElementById('fileUpload');
    let fileNameDisplay = document.getElementById('fileName');

    if (fileInput.files.length > 0) {
        fileNameDisplay.textContent = fileInput.files[0].name;
    } else {
        fileNameDisplay.textContent = 'No file chosen';
    }
    
    if (file) {
        let reader = new FileReader();
        let filetype = file.name.split('.').pop(); 
        if(!(filetype === "tpn" || filetype === "pnml")){
            alert("Please upload file in \".tpn\" or \".pnml\" format");
            return;
        }
        reader.readAsText(file, "UTF-8");
        reader.addEventListener('load', () => {
            readNetType();
            let [petriNet, errorList] = parse(reader.result, filetype, state.isPTNet);
            if(errorList.length > 0) alert(errorList.join('\n'));
            if(!petriNet) return;
            if(!state.isPTNet && petriNet.isPTNet) updateNetType(true);
            loadConsole(petriNet.places, petriNet.transitions, state.isPTNet)
            analyzeInput(petriNet);
        })
    } else {
        alert("please upload file");
    }
});

export function analyzeInput(petriNet){
    state.petriNet = petriNet;
    let places = petriNet.places;
    let transitions = petriNet.transitions;
    let analysis = new Analysis(petriNet)


    state.anaResult = analysis.analyse()
    if(state.anaResult.errors.length > 0) alert(state.anaResult.errors.join('\n'));
    console.log(state.anaResult);
    let markings = state.anaResult.markings

    state.uncoveredMarkingIDs = new Set()

    loadPetriNet();
    vizProperties(state.anaResult, state.uncoveredMarkingIDs)
    vizMarkingTable(markings, places, transitions, state.anaResult.liveness, state.anaResult.loops)
    vizTransitionLabels(transitions);
}

function loadPetriNet(){
    const svg = vizPetriNet(state.anaResult.components, highlightTransition, state.isPTNet);
    document.getElementById("content").innerHTML = "";
    document.getElementById("content").appendChild(svg);
}

export function uncoverMarking(markingID){
    if(!state.uncoveredMarkingIDs.has(markingID)){
        state.uncoveredMarkingIDs.add(markingID)
        vizProperties(state.anaResult, state.uncoveredMarkingIDs)
    }
}

export function vizMarkingInSVGNet(marking){
    updateTokens(state.petriNet.places, marking.markingArr)
}



export function highlightTransition(id){
    let prev_id = state.highlighted_trans
    state.highlighted_trans = id
    highlightTransNode(id);
    highlightTransLabel(id, prev_id);
    highlightTransColumn(id, prev_id);
    highlightTransConsole(id);
}


window.onload = function() {
    const divider = document.createElement('div');
    divider.className = 'divider';

    const container = document.querySelector('.grid-container');
    const firstDiv = container.children[0];

    // Insert the divider
    container.insertBefore(divider, firstDiv.nextSibling);

    let isDragging = false;

    divider.addEventListener('mousedown', function(e) {
        isDragging = true;
        document.addEventListener('mousemove', onDrag);
    });

    document.addEventListener('mouseup', function(e) {
        isDragging = false;
        document.removeEventListener('mousemove', onDrag);
    });

    function onDrag(e) {
        if (!isDragging) return;
        let percentage = (e.clientX / window.innerWidth) * 100;
        if (percentage < 20) percentage = 20; // Minimum width limit
        if (percentage > 80) percentage = 80; // Maximum width limit
        firstDiv.style.width = percentage + '%';
        const nextDiv = container.children[2];
        if (nextDiv) {
            nextDiv.style.width = (100 - percentage) + '%';
        }
    }
};

document.getElementById("netType").addEventListener("change", function(){
    readNetType();
    reloadConsole(state.isPTNet);
})

function readNetType(){
    state.isPTNet = document.getElementById("netType").checked;
}

function updateNetType(isPTNet){
    state.isPTNet = isPTNet;
    document.getElementById("netType").checked = isPTNet;
}

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