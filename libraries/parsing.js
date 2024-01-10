import { PetriNet } from "../PetriNet.js"


export function parse(file, type, isPTNet){
    let transList, placeList, edgeList, errorList;
    // Parse the file and extract transitions, places, edges, and errors
    [transList, placeList, edgeList, errorList, isPTNet] = type === "tpn" ? 
        parseTPN(file, isPTNet) : parsePNML(file, isPTNet)

    // If the parsing the file was not possible, just the error list is returned
    if(!transList) return [null, errorList];

    // Initialize the structure of the Petri net
    const petriNet = new PetriNet(isPTNet);
    // Maps to store the correspondence between string IDs and numeric IDs
    const transStringIDMap = new Map();
    const placeStringIDMap = new Map();

    // Process transitions with defined IDs and sort them
    transList.filter(trans => typeof trans.id !== "undefined")
        .sort((trans1, trans2) => trans1.id > trans2.id)
        .forEach(trans => {
             // Reset ID if it already exists or exceeds the limit
            if(petriNet.transExists(trans.id) || trans.id > 99){
                trans.id = undefined;
            }
            // Map the original string ID to the new numeric ID
            transStringIDMap.set(trans.id_string, trans.id)
            // Add the transition to the Petri net
            petriNet.addTrans(trans.id, trans.label);
        });
    // Process transitions without defined IDs
    transList.filter(trans => typeof trans.id === "undefined")
        .forEach(trans => {
            // Assign a new ID
            trans.id = petriNet.getUnusedTransID()
            transStringIDMap.set(trans.id_string, trans.id)
            petriNet.addTrans(trans.id, trans.label)
        })

    // Similar processing for places
    placeList.filter(place => typeof place.id !== "undefined")
        .sort((place1, place2) => place1.id > place2.id)
        .forEach(place => {
            if(petriNet.placeExists(place.id) || place.id > 99){
                place.id = undefined;
            }
            placeStringIDMap.set(place.id_string, place.id)
            petriNet.addPlace(place.id, place.init, place.capacity);
        });
    placeList.filter(place => typeof place.id  === "undefined")
        .forEach(place => {
            place.id = petriNet.getUnusedPlaceID();
            placeStringIDMap.set(place.id_string, place.id)
            petriNet.addPlace(place.id, place.init, place.capacity);
        })
        
    // Process edges
    edgeList.forEach(edge => {
        // Add edges based on the source and target ID mapping
        if(transStringIDMap.has(edge.sourceId_string) &&
        placeStringIDMap.has(edge.targetId_string)){
            petriNet.addEdge(transStringIDMap.get(edge.sourceId_string),
                placeStringIDMap.get(edge.targetId_string),
                edge.weight, true)
        } else if (placeStringIDMap.has(edge.sourceId_string) &&
        transStringIDMap.has(edge.targetId_string)){
            petriNet.addEdge(placeStringIDMap.get(edge.sourceId_string),
                transStringIDMap.get(edge.targetId_string),
                edge.weight, false)
        } else {
            // Log an error if edge IDs are undefined
            errorList.push("error: edge contains undefined IDs: " + 
            edge.sourceId_string + " -> "+ edge.targetId_string);
        }
    })
    // Sort elements in the Petri net for organized structure
    petriNet.sortElements();
    // Return the constructed Petri net and any errors
    return [petriNet, errorList]
}

// Regular expressions for parsing places and transitions in TPN files
const placeRegex = /^place (\w+)( init (\d+))?;$/;
const transRegex = /^trans (\w+) ?(~ ?([\w ]+))? in (\w+(?:, ?\w+)*) out (\w+(?:, ?\w+)*);$/;
const placeListRegex = /(\w+)/g
const emptyLineRegex = /^[ ]*?$/g
function parseTPN(file, isPTNet){
    // Split file into lines for parsing
    let lines = file.split('\n')
    
    // List for all occuring errors
    const errorList = [];

    // Error list and lists for parsed data
    const placeList = [];
    const transList = [];
    const edgeList = [];

    for(const line of lines){
        // Match lines with regex for places, transitions, or empty lines
        let matchP = line.match(placeRegex)
        let matchT = line.match(transRegex)
        let emptyLine = line.match(emptyLineRegex)
        // Process matches for place, transition, or handle syntax errors
        if(emptyLine){
            // Skip empty lines
        } else if (matchP) {
            // Process place line and update placeList
            const id_string = matchP[1];
            const id = extractNumber(id_string);
            const init_value = matchP[3] ? parseInt(matchP[3]) : 0;
            const capacity_value = isPTNet ? Infinity : 1;
            placeList.push({"id":id, "id_string": id_string, 
                "init": init_value, "capacity": capacity_value})
            if(!isPTNet && (init_value != 1 && init_value != 0)){
                return parseTPN(file, true);
            }
        } else if(matchT){
            // Process transition line and update transList and edgeList
            const id_string = matchT[1];
            const id = extractNumber(id_string);
            const label = matchT[3] ? matchT[3] : id_string;
            transList.push({"id":id, "id_string": id_string, "label": label});
            let incomingFreqMap = readPlaces(matchT[4]).reduce((acc, place_id_string) => {
                acc[place_id_string] = (acc[place_id_string] || 0) + 1;
                return acc;}, {})
            for(const [str, weight] of Object.entries(incomingFreqMap)){
                if(weight != 1 && !isPTNet) return parseTPN(file, true);
                edgeList.push({"sourceId_string":str, "targetId_string":id_string, "weight": weight});
            }
            readPlaces(matchT[5]).forEach(place_id_string => edgeList.push(
                {"sourceId_string":id_string, "targetId_string":place_id_string, "weight": 1}));
        } else {
            // Add syntax error to errorList for lines not matching regex patterns
            errorList.push("error: sytax incorrect: " + line);
        }
    }
    // Return parsed data and any errors encountered
    return [transList, placeList, edgeList, errorList, isPTNet];
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

// Function to extract a number from a String
function extractNumber(number_text){
    const number_match = number_text.match(/\d+/);
    if(number_match) return parseInt(number_match[0], 10);
}


function parsePNML(pnmlString, isPTNet) {
    // Parse the PNML XML string
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(pnmlString, 'text/xml');

    // List for all occuring errors
    const errorList = [];

    // Lists to save the parsed elements
    const placeList = [];
    const transList = [];
    const edgeList = [];

    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
        // Add error description to the error list and return it
        errorList.push("The file is not in valid PNML format.");
        return [null, null, null, errorList];
    }

    // Helper function to extract text content from an element by tag name
    const getText = (element, tagName) => {
        const foundElement = element.getElementsByTagName(tagName)[0];
        return foundElement ? foundElement.textContent : null;
    };
    // Process places
    let placeCounter = 0;
    const placeElements = xmlDoc.getElementsByTagName('place');
    for (let place of placeElements) {
        if(placeCounter > 100) {
            errorList.push("error: You can't exceed the limit of 100 places");
            break;
        }
        const id_string = place.getAttribute('id');
        const id = extractNumber(id_string);
        // Assumes missing initialMarking means 0
        const initialMarking = extractNumber(getText(place, 'initialMarking') || '0'); 
        const capacity = parseInt(getText(place, 'capacity') || '1'); 
        if(!isPTNet && ((initialMarking != 1 && initialMarking != 0) || capacity != 1)) 
            return parsePNML(pnmlString, true);
        placeList.push({"id":id, "id_string": id_string, "init": initialMarking, 
            "capacity": capacity == -1 ? Infinity : capacity})
        placeCounter++;
    }

    // Process transitions
    const transitionElements = xmlDoc.getElementsByTagName('transition');
    let transCounter = 0;
    for (let trans of transitionElements) {
        if(transCounter > 100) {
            errorList.push("error: You can't exceed the limit of 100 transitions");
            break;
        }
        const id_string = trans.getAttribute('id');
        const id = extractNumber(id_string);
        // Use the ID as a fallback label
        const label = getText(trans, 'name').trim() || trans.getAttribute('id'); 
        transList.push({"id":id, "id_string": id_string, "label": label})
        transCounter++;
    }

    // Process arcs and update plces and transitions
    const arcElements = xmlDoc.getElementsByTagName('arc');
    for (let arc of arcElements) {
        const sourceId_string = arc.getAttribute('source');
        const targetId_string = arc.getAttribute('target');
        const inscription = getText(arc, 'inscription');
        // Assumes missing inscription means weight of 1
        const weight = inscription ? parseInt(inscription, 10) : 1; 
        if(!isPTNet && weight != 1) return parsePNML(pnmlString, true);
        edgeList.push({"sourceId_string":sourceId_string,
            "targetId_string":targetId_string, "weight": weight})
    }

    // The petriNet object is now populated with the data from the PNML
    return [transList, placeList, edgeList, errorList, isPTNet];
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
                <arc id="a_${tran.id_text}_${outPlace.id_text}" source="${tran.id_text}" target="${outPlace.id_text}">
                    <inscription>
                        <text>${weight}</text>
                    </inscription>
                </arc>
            `;
        }
        for(let inPlace of tran.incoming) {
            let weight = tran.incomingWeights.get(inPlace);
            pnml += `
                <arc id="a_${inPlace.id_text}_${tran.id_text}" source="${inPlace.id_text}" target="${tran.id_text}">
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