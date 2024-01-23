import { parse, unparseToPNML} from "./libraries/parsing.js";
import { vizPetriNet, updateTokens, highlightTransNode } from "./libraries/visulization.js";
import { Analysis } from "./libraries/analysis.js"
import { vizMarkingTable, highlightTransColumn } from "./marking-table.js"
import {vizProperties} from "./properties.js"
import {loadConsole, readConsole, clearConsole, highlightTransConsole, reloadConsole} from "./console.js"
import {vizTransitionLabels, highlightTransLabel} from "./labels.js"

//the 'state' varaible contains the state of the website
let state = {}
state.uncoveredMarkingIDs = new Set()
state.isPTNet = false;

//when a file is added, it is read as text and then it is parsed
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

// the file is parsed and passed to the analysis
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

//the file name is shown on the website 
function updateFileName(fileName){
    let fileNameDisplay = document.getElementById('fileName');
    if(fileName.length > 15){
        fileName = fileName.slice(0, 12) + "...";
    }
    fileNameDisplay.textContent = fileName;
}

// the petri net is analysed and the results are shown
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

//the petri net visualization is calculated and added to the website
function loadPetriNet(){
    const svg = vizPetriNet(state.anaResult.components, highlightTransition, state.isPTNet);
    //const svg = vizWFNet(state.anaResult, highlightTransition, state.isPTNet);
    if(!svg) return;
    document.getElementById("content").innerHTML = "";
    document.getElementById("content").appendChild(svg);
}

//if a marking in the table us uncovered, it can be shown in the properties section
export function uncoverMarking(markingID){
    if(!state.uncoveredMarkingIDs.has(markingID)){
        state.uncoveredMarkingIDs.add(markingID)
        vizProperties(state.anaResult, state.uncoveredMarkingIDs)
    }
}

//visualized a marking in the petri net
export function vizMarkingInSVGNet(marking){
    updateTokens(state.petriNet.places, marking.markingArr)
}


//highlights a transitions in different sections
export function highlightTransition(id){
    let prev_id = state.highlighted_trans
    state.highlighted_trans = id
    highlightTransNode(id);
    highlightTransLabel(id, prev_id);
    highlightTransColumn(id, prev_id);
    highlightTransConsole(id);
}

//divides website into right and left side and enables user to change the sizes of the sections
function createDivider() {
    const divider = document.createElement('div');
    divider.className = 'divider';

    const container = document.querySelector('.grid-container');
    const firstDiv = container.children[0];

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

//enables user to change the size of console and petri net
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

//changes the net type and reloads console of user switches between EC and PT net
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

// the console is read and analysed
document.getElementById("console_go").onclick = function(){
    analyzeInput(readConsole());
    if(state.highlighted_trans !== undefined){
        highlightTransition(state.highlighted_trans);
    }
}

document.getElementById("console_clear").onclick = function(){
    clearConsole();
}

// the console is read, transformed into pnml and downloaded as file
document.getElementById("console_save").onclick = function(){

    let petriNet = readConsole();

    const content = unparseToPNML(petriNet.transitions, petriNet.places)

    const blob = new Blob([content], { type: 'text/plain' });
  
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'PNEd.pnml'; 
    a.click();
}

// opens the help window
document.getElementById('helpButton').addEventListener('click', function() {
    window.open('helpContent.html', '_blank');
});

//the URL given in the 'file' Parameter is loaded
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

// trying to fetch the file from the given URL
function fetchPetriNetFromURL(levelurl) {
    return new Promise((resolve, reject) => {
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