import { parse, parseShortPNF, unparseToSPNF, unparseToPNML} from "./parsing.js";
import { vizPetriNet } from "./visulization.js";
import { Analysis } from "./analysis.js"
import { vizMarkingTable } from "./marking-table.js"



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
            var petriNetAr = parse(reader.result, filetype);
            loadConsole(petriNetAr.places, petriNetAr.trans)
            analyzeInput(petriNetAr);
            //if(filetype === "tpn") loadConsole(reader.result)
        })
    } else {
        alert("please upload file");
    }
  });

document.getElementById("console_go").onclick = function(){

    var place = document.getElementById("place_console").value;
    var trans = document.getElementById("transition_console").value;
    var edges = document.getElementById("edge_console").value;
    var petriNetAr = parseShortPNF(trans, place, edges);
    analyzeInput(petriNetAr)

}

document.getElementById("console_save").onclick = function(){

    var place = document.getElementById("place_console").value;
    var trans = document.getElementById("transition_console").value;
    var edges = document.getElementById("edge_console").value;
    var petriNetAr = parseShortPNF(trans, place, edges);

    const content = unparseToPNML(petriNetAr.trans, petriNetAr.places)

    const blob = new Blob([content], { type: 'text/plain' });
  
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'PNEd.pnml'; 
    a.click();
}

function analyzeInput(petriNetAr){
    var netType = document.getElementById('netType').checked;
    if(netType != petriNetAr.weights){
        switchToPTNet();
        netType = true;
    }
    var netType = document.getElementById('netType').checked;
    var places = petriNetAr.places;
    var transitions = petriNetAr.trans;
    var analysis = new Analysis(places, transitions, netType)

    var anaResult = analysis.analyse()
    var markings = anaResult.markings

    unparseToSPNF(places, transitions)
    vizMarkingTable(markings, places, transitions, anaResult.liveness, anaResult.loops)
    vizPetriNet(places.concat(transitions));
    vizTransitionLabels(transitions);
    vizProperties(anaResult.deadlocks, anaResult.boundedness, anaResult.soundness, anaResult.strSoundness)
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

function switchToPTNet(){
    var checkbox = document.getElementById("netType");
    checkbox.checked = true;
}