import { PetriNet } from "./PetriNet.js"

const placeRegex = /^place ([a-zA-Z]+(\d+)?)( init (\d+))?;$/;
const transRegex = /^trans ([a-zA-Z]+(\d+))(~(\w+))?( in (\w+(?:, \w+)*))?( out (\w+(?:, \w+)*))?;$/;
const placeListRegex = /"(\w+)"/g
const emptyLineRegex = /^[ ]*?$/g

export function parse(file, type, isPTNet){
    if(type === "tpn"){
        return parseTPN(file, isPTNet)
    } else {
        return parsePNML(file, isPTNet);
    }
}

function parseTPN(file, isPTNet){
    //split the file into lines
    let lines = file.split('\n')
    // "edges" array stores all the places connected to a transition in this format: {transID: , incoming: , outgoing:}
    //its later use to connect all the places and transitions with each other
    let edges = [];
    let petriNet = new PetriNet(isPTNet);

    lines.forEach(line => {
        let matchP = line.match(placeRegex)
        let matchT = line.match(transRegex)
        let emptyLine = line.match(emptyLineRegex)
        if(emptyLine){

        }else if(matchP){
            console.log(matchP);
            if(!matchP[2]){
            }
            if(petriNet.placeExists(matchP[2])){
                console.log("error: ID used twice: " + matchP[2])
            } else {
                let init_value = matchP[4] ? parseInt(matchP[4]) : 0;
                let capacity_value = isPTNet ? Infinity : 1;
                console.log(capacity_value);
                petriNet.addPlace(matchP[2], init_value, capacity_value)
                //if isPTNet is false, so its supposed to be an EC-Net, but the initial amount of token in one place is above 
                if(!isPTNet && (init_value != 1 && init_value != 0)){
                    return parseTPN(file, true);
                }
            }
        }else if(matchT){
            console.log(matchT);
            if(petriNet.transExists(matchT[2])){
                console.log("error: ID used twice: " + matchT[1])
            } else {
                petriNet.addTrans(matchT[2], matchT[4] ? matchT[4] : "");
                edges.push({transID: matchT[2], incoming: readPlaces(matchT[5]), outgoing:readPlaces(matchT[6])})
            }
        } else {
            console.log("error: sytax incorrect: " + line)
        }
    });
    edges.forEach(edge => {
        edge.incoming.forEach(placeID => petriNet.addEdge(placeID, edge.transID, 1, false))
        edge.outgoing.forEach(placeID => petriNet.addEdge(edge.transID, placeID, 1, true))

    })
    return petriNet;
}


function readPlaces(placeStr){
    var match;
    var placeArray = []
    do {
        match = placeListRegex.exec(placeStr)
        if(match){
            placeArray.push(match[1])
        }
    } while (match);
    return placeArray;
}

function parsePNML(pnmlString, isPTNet) {
    // Parse the PNML XML string
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(pnmlString, 'text/xml');

    // List for all occuring errors
    const errorList = [];

    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
        // Add error description to the error list and return it
        errorList.push("The file is not in valid PNML format.");
        return [null, errorList];
    }

    // Initialize the structure of the Petri net
    const petriNet = new PetriNet(isPTNet);

    // Helper function to extract text content from an element by tag name
    const getText = (element, tagName) => {
        const foundElement = element.getElementsByTagName(tagName)[0];
        return foundElement ? foundElement.textContent : null;
    };

    const extractID = (id_text) => {
        const id_match =  id_text.match(/\d+/);
        let id;
        id_match ? id = parseInt(id_match[0], 10) : errorList.push(
            "error: cant parse id: '" + id_text + "'");
        return id;
    }

    // Process places
    let placeCounter = 0;
    const placeElements = xmlDoc.getElementsByTagName('place');
    for (let place of placeElements) {
        const id = extractID(place.getAttribute('id'));
        if(petriNet.placeExists(id)){
            errorList.push("error: ID used twice: " + id);
            continue;
        }
        // Assumes missing initialMarking means 0
        const initialMarking = getText(place, 'initialMarking') || '0'; 
        const capacity = parseInt(getText(place, 'capacity') || '1'); 
        if(!isPTNet && ((initialMarking != 1 && initialMarking != 0) || capacity != 1)) 
            return parsePNML(pnmlString, true);
        petriNet.addPlace(id, initialMarking, capacity == -1 ? Infinity : capacity)
        placeCounter++;
    }

    // Process transitions
    const transitionElements = xmlDoc.getElementsByTagName('transition');
    let transCounter = 0;
    for (let trans of transitionElements) {
        const id = extractID(trans.getAttribute('id'));
        if(petriNet.transExists(id)){
            errorList.push("error: ID used twice: " + id);
            continue;
        }
        // Use the ID as a fallback label
        const label = getText(trans, 'name').trim() || id; 
        petriNet.addTrans(id, label);
        transCounter++;
    }

    // Process arcs and update places and transitions
    const arcElements = xmlDoc.getElementsByTagName('arc');
    for (let arc of arcElements) {
        const sourceId = extractID(arc.getAttribute('source'));
        const targetId = extractID(arc.getAttribute('target'));
        const inscription = getText(arc, 'inscription');
        // Assumes missing inscription means weight of 1
        const weight = inscription ? parseInt(inscription, 10) : 1; 
        if(!isPTNet && weight != 1) return parsePNML(pnmlString, true);
        const startIsTrans = arc.getAttribute('source')
            .toUpperCase().startsWith("T")
        petriNet.addEdge(sourceId, targetId, weight, startIsTrans);
    }

    // The petriNet object is now populated with the data from the PNML
    return [petriNet, errorList];
}

export function getTransAsString(file){
    var lines = file.split('\n')
    var result = ""
    lines.forEach(line => {
        var match = line.match(transRegex)
        if(match){
        result += line + "\n"
        }
    });
    return result
}
export function getPlacesAsString(file){
    var lines = file.split('\n')
    var result = ""
    lines.forEach(line => {
        var match = line.match(placeRegex)
        if(match){
        result += line + "\n"
        }
    });
    return result
}

export function unparseToPNML(trans, places) {
    let pnml = `<?xml version="1.0" encoding="UTF-8"?>
    <pnml>
        <net id="net1" type="http://www.pnml.org/version-2009/grammar/pnmlcoremodel">
    `;

    for(let place of places) {
        pnml += `
            <place id="${place.id_text}">
                <name>
                    <text>${place.id_text}</text>
                </name>
                <initialMarking>
                    <text>${place.init}</text>
                </initialMarking>
                <capacity>
                    <text>${place.capacity === Infinity ? -1 : place.capacity}</text>
                </capacity>
            </place>
        `;
    }

    for(let tran of trans) {
        pnml += `
            <transition id="${tran.id_text}">
                <name>
                    <text>${tran.label}</text>
                </name>
            </transition>
        `;
    }

    for(let tran of trans) {
        for(let outPlace of tran.outgoing) {
            let weight = tran.outgoingWeights.get(outPlace);
            pnml += `
                <arc id="a_${tran.id}_${outPlace.id}" source="${tran.id_text}" target="${outPlace.id_text}">
                    <inscription>
                        <text>${weight}</text>
                    </inscription>
                </arc>
            `;
        }
        for(let inPlace of tran.incoming) {
            let weight = tran.incomingWeights.get(inPlace);
            pnml += `
                <arc id="a_${inPlace.id}_${tran.id}" source="${inPlace.id_text}" target="${tran.id_text}">
                    <inscription>
                        <text>${weight}</text>
                    </inscription>
                </arc>
            `;
        }
    }

    pnml += `
        </net>
    </pnml>
    `;

    return pnml;
}

function logError(errorText){
    console.log(errorText);
}


function parsingError(text){
    console.log(text);
}