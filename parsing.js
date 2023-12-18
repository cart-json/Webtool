import { PetriNet } from "./PetriNet.js"

const placeRegex = /^place "P(\d+)"( init (\d+))?;$/;
const transRegex = /^trans "T(\d+)"~"([\w ]+)"( in ("P\d+"(?:, "P\d+")*))?( out ("P\d+"(?:, "P\d+")*))?;$/
const placeListRegex = /"P(\d+)"/g
const emptyLineRegex = /^[ ]*?$/g

export function parse(file, type){
    if(type === "tpn"){
        return parseTPN(file)
    } else {
        return parsePNML(file);
    }
}

function parseTPN(file){
    let lines = file.split('\n')
    let edges = [];
    let petriNet = new PetriNet();

    lines.forEach(line => {
        let matchP = line.match(placeRegex)
        let matchT = line.match(transRegex)
        let emptyLine = line.match(emptyLineRegex)
        if(emptyLine){

        }else if(matchP){
            if(petriNet.placeExists(matchP[1])){
                console.log("error: ID used twice: " + matchP[1])
            } else {
                petriNet.addPlace(matchP[1], (matchP[3] ? parseInt(matchP[3]) : 0), 1)
            }
        }else if(matchT){
            if(petriNet.transExists(matchT[1])){
                console.log("error: ID used twice: " + matchT[1])
            } else {
                petriNet.addTrans(matchT[1], matchT[2])
                edges.push({transID: matchT[1], incoming: readPlaces(matchT[4]), outgoing:readPlaces(matchT[6])})
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

function parsePNML(pnmlString) {
    // Parse the PNML XML string
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(pnmlString, 'text/xml');

    // Initialize the structure of the Petri net
    const petriNet = new PetriNet();

    // Helper function to extract text content from an element by tag name
    const getText = (element, tagName) => {
        const foundElement = element.getElementsByTagName(tagName)[0];
        return foundElement ? foundElement.textContent : null;
    };

    const extractID = (id_text) => {
        const id_match =  id_text.match(/\d+/);
        let id;
        id_match ? id = parseInt(id_match[0], 10) : parsingError("id issue");
        return id;
    }

    // Process places
    let placeCounter = 0;
    const placeElements = xmlDoc.getElementsByTagName('place');
    for (let place of placeElements) {
        const id = extractID(place.getAttribute('id'));
        const initialMarking = getText(place, 'initialMarking') || '0'; // Assumes missing initialMarking means 0
        petriNet.addPlace(id, initialMarking, 1)
        placeCounter++;
    }

    // Process transitions
    const transitionElements = xmlDoc.getElementsByTagName('transition');
    let transCounter = 0;
    for (let trans of transitionElements) {
        const id = extractID(trans.getAttribute('id'));
        const label = getText(trans, 'name') || id; // Use the ID as a fallback label
        petriNet.addTrans(id, label);
        transCounter++;
    }

    // Process arcs and update places and transitions
    const arcElements = xmlDoc.getElementsByTagName('arc');
    for (let arc of arcElements) {
        const sourceId = extractID(arc.getAttribute('source'));
        const targetId = extractID(arc.getAttribute('target'));
        const inscription = getText(arc, 'inscription');
        const weight = inscription ? parseInt(inscription, 10) : 1; // Assumes missing inscription means weight of 1
        if(!petriNet.weights && weight > 1) petriNet.weights = true;

        const startIsTrans = arc.getAttribute('source').toUpperCase().startsWith("T")
        
        petriNet.addEdge(sourceId, targetId, weight, startIsTrans);
    }

    // The petriNet object is now populated with the data from the PNML
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


function unparseToTPN(places, transitions) {
    let placeResult = '';
    let transResult = '';
    let edgeResult = '';

    places.forEach(place => {
        let placeStr = `place "${place.id}"`;
        if (place.init > 0) {
            placeStr += ` init ${place.init}`;
        }
        placeStr += ';\n';
        placeResult += placeStr;
    })

    for (const trans of transitions) {
        let transStr = `trans "${trans.id}"~"${trans.label.trim()}"`;

        let incomingEdges = [];
        if (trans.incoming && trans.incoming.length > 0) {
            for (const place of trans.incoming) {
                const weight = trans.incomingWeights.get(place);
                if (weight && weight > 0) {
                    incomingEdges.push(`"${place.id}"`);
                    edgeResult += `in "${trans.id}" "${place.id}" ${weight};\n`; // Add to edgeResult
                }
            }
        }

        if (incomingEdges.length > 0) {
            transStr += ` in (${incomingEdges.join(', ')})`;
        }

        let outgoingEdges = [];
        if (trans.outgoing && trans.outgoing.length > 0) {
            for (const place of trans.outgoing) {
                const weight = trans.outgoingWeights.get(place);
                if (weight && weight > 0) {
                    outgoingEdges.push(`"${place.id}"`);
                    edgeResult += `out "${trans.id}" "${place.id}" ${weight};\n`; // Add to edgeResult
                }
            }
        }

        if (outgoingEdges.length > 0) {
            transStr += ` out (${outgoingEdges.join(', ')})`;
        }

        transStr += ';\n';
        transResult += transStr;
    }

    return { placesSPNF: placeResult, transSPNF: transResult, edgeSPNF: edgeResult };
}

export function unparseToPNML(trans, places) {
    let pnml = `<?xml version="1.0" encoding="UTF-8"?>
    <pnml>
        <net id="net1" type="http://www.pnml.org/version-2009/grammar/pnmlcoremodel">
    `;

    for(let place of places) {
        pnml += `
            <place id="${place.id}">
                <name>
                    <text>${place.id}</text>
                </name>
                <initialMarking>
                    <text>${place.init}</text>
                </initialMarking>
            </place>
        `;
    }

    for(let tran of trans) {
        pnml += `
            <transition id="${tran.id}">
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
                <arc id="a_${tran.id}_${outPlace.id}" source="${tran.id}" target="${outPlace.id}">
                    <inscription>
                        <text>${weight}</text>
                    </inscription>
                </arc>
            `;
        }
        for(let inPlace of tran.incoming) {
            let weight = tran.incomingWeights.get(inPlace);
            pnml += `
                <arc id="a_${inPlace.id}_${tran.id}" source="${inPlace.id}" target="${tran.id}">
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



function parsingError(text){
    console.log(text);
}