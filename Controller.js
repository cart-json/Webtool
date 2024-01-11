import { parse, unparseToPNML} from "./libraries/parsing.js";
import { vizPetriNet, updateTokens, highlightTransNode } from "./libraries/visulization.js";
import { Analysis } from "./libraries/analysis.js"
import { vizMarkingTable, highlightTransColumn } from "./marking-table.js"
import {vizProperties} from "./properties.js"
import {loadConsole, readConsole, clearConsole, highlightTransConsole, reloadConsole} from "./console.js"
import {vizTransitionLabels, highlightTransLabel} from "./labels.js"


let state = {}
state.uncoveredMarkingIDs = new Set()
state.isPTNet = false;
loadHelpContent();

document.getElementById("fileUpload").addEventListener("change", function() {

    let file = document.getElementById("fileUpload").files[0]
    
    if (file) {
        let reader = new FileReader();
        let filetype = file.name.split('.').pop(); 
        reader.readAsText(file, "UTF-8");
        reader.addEventListener('load', () => {
            tryParsing(reader.result, file.name);
        })
    } else {
        alert("please upload file");
    }
});

function tryParsing(text, fileName){
    let filetype = fileName.split('.').pop(); 
    if(!(filetype === "tpn" || filetype === "pnml")){
        alert("Please upload file in \".tpn\" or \".pnml\" format");
        return;
    }
    readNetType();
    let [petriNet, errorList] = parse(text, filetype, state.isPTNet);
    if(errorList.length > 0) alert(errorList.join('\n'));
    if(!petriNet) return;
    console.log(petriNet);
    updateFileName(fileName);
    if(!state.isPTNet && petriNet.isPTNet) updateNetType(true);
    loadConsole(petriNet.places, petriNet.transitions, state.isPTNet)
    analyzeInput(petriNet);
}

function updateFileName(fileName){
    let fileNameDisplay = document.getElementById('fileName');
    if(fileName.length > 15){
        fileName = fileName.slice(0, 12) + "...";
    }
    fileNameDisplay.textContent = fileName;
}

export function analyzeInput(petriNet){
    state.petriNet = petriNet;
    let places = petriNet.places;
    let transitions = petriNet.transitions;
    let analysis = new Analysis(petriNet)


    state.anaResult = analysis.analyse()
    if(state.anaResult.errors.length > 0) alert(state.anaResult.errors.join('\n'));
    let markings = state.anaResult.markings

    state.uncoveredMarkingIDs = new Set()

    loadPetriNet();
    vizProperties(state.anaResult, state.uncoveredMarkingIDs)
    vizMarkingTable(markings, places, transitions, state.anaResult.liveness, state.anaResult.loops)
    vizTransitionLabels(transitions);
}

function loadPetriNet(){
    const svg = vizPetriNet(state.anaResult.components, highlightTransition, state.isPTNet);
    //const svg = vizWFNet(state.anaResult, highlightTransition, state.isPTNet);
    if(!svg) return;
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


function createDivider() {
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

function createConsoleDivider(){
    const divider = document.createElement('div');
    divider.className = 'consoleDivider';

    const container = document.getElementById('NetAndConsole');
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
        let percentage = ((e.clientY - 45 + 3) / (container.clientHeight - 2)) * 100;
        if (percentage < 40) {
            percentage = 40;
        }
        if (percentage > 80){
            percentage = 80;
        }
        firstDiv.style.height = percentage + '%';
        const nextDiv = container.children[2];
        if (nextDiv) {
            let percentage2 = (1 - ((firstDiv.clientHeight + 3)) / (container.clientHeight - 2)) * 100;
            nextDiv.style.height = percentage2 + '%';
        }
    }
}

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


function loadHelpContent() {
    fetch('helpContent.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('helpContentContainer').innerHTML = data;
            attachPopupEventListeners(); // Attach event listeners after content is loaded
        })
        .catch(err => console.error('Failed to load help content:', err));
}

function attachPopupEventListeners() {
    var modal = document.getElementById("helpPopup");
    var btn = document.getElementById("helpButton");
    var span = document.getElementsByClassName("close")[0];

    btn.onclick = function() {
        modal.style.display = "block";
    };

    span.onclick = function() {
        modal.style.display = "none";
    };

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    };
}

window.onload = function() {
    createDivider();
    createConsoleDivider();
    let params = new URLSearchParams(window.location.search);
    let fileURL = params.get('file'); // Assuming the URL parameter is named 'file'

    if (fileURL && fileURL.match(/^http/)) {
        fetchPetriNetFromURL(fileURL)
            .then(petriNet => {
                // Process the fetched Petri net
                analyzeInput(petriNet);
            })
            .catch(error => {
                console.error(error);
            });
    }
};

function fetchPetriNetFromURL(levelurl) {
    return new Promise((resolve, reject) => {
        let encodedURL = encodeURLSegments(levelurl);
        $.ajax({
            type: "GET",
            url: "http://localhost/download.php?url=" + levelurl,
            error: () => { 
                alert('Error fetching the Petri net from the URL.');
                reject();
            }
        }).then(res => {
            let fileName = levelurl.split('/').pop();
            tryParsing(res, fileName);
        });
    });
}


function encodeURLSegments(url) {
    let parts = url.split('/');
    for (let i = 0; i < parts.length; i++) {
        // Only encode parts of the URL that can contain spaces or other characters needing encoding
        if (i > 2) { // Assuming the first three parts are the protocol and domain, which don't need encoding
            parts[i] = encodeURIComponent(parts[i]);
        }
    }
    return parts.join('/');
}