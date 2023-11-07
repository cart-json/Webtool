import { Place, Transition } from "./PetriNet.js"

const placeRegex = /^place "(P\d+)"( init (\d+))?;$/;
const transRegex = /^trans "(T\d+)"~"([\w ]+)"( in ("P\d+"(?:, "P\d+")*))?( out ("P\d+"(?:, "P\d+")*))?;$/
const placeListRegex = /"(P\d+)"/g
const emptyLineRegex = /^[ ]*?$/g

const transRegexSPNF = /^([Tt]\d+)[ ]*?~[ ]*?([\w ]+)$/; //T3 ~ Label
const placeRegexSPNF = /^([Pp]\d+)[ ]*?(~[ ]*?(\d+))?$/;    //P3 ~ 1  //P4
const incEdgeRegexSPNF = /^([Pp]\d+)[ ]*?->[ ]*?([Tt]\d+)([ ]*?~[ ]*?(\d+))?$/; //P3 -> T3
const outEdgeRegexSPNF = /^([Tt]\d+)[ ]*?->[ ]*?([Pp]\d+)([ ]*?~[ ]*?(\d+))?$/; //T3 -> P4 ~ 3

export function parse(file, type){
    if(type === "tpn"){
        return parseTPN(file)
    } else {
        return parsePNML(file);
    }
}

function parseTPN(file){
    let lines = file.split('\n')
    let places = []
    let trans = []
    let edges = []
    let placeIndex = 0;
    let transIndex = 0;
    let placeIdMap = new Map();
    let transIdMap = new Map();

    lines.forEach(line => {
        let matchP = line.match(placeRegex)
        let matchT = line.match(transRegex)
        let emptyLine = line.match(emptyLineRegex)
        if(emptyLine){

        }else if(matchP){
            if(placeIdMap.has(matchP[1])){
                console.log("error: ID used twice: " + matchP[1])
            } else {
                let place = new Place(matchP[1], (matchP[3] ? parseInt(matchP[3]) : 0), placeIndex)
                places.push(place)
                placeIdMap.set(place.id,place)
                placeIndex++;
            }
        }else if(matchT){
            if(transIdMap.has(matchT[1])){
                console.log("error: ID used twice: " + matchT[1])
            } else {
                let transition = new Transition(matchT[1], matchT[2], transIndex)
                trans.push(transition)
                transIdMap.set(transition.id,transition)
                edges.push({transId: matchT[1], incoming: readPlaces(matchT[4]), outgoing:readPlaces(matchT[6])})
                transIndex++;
            }
        } else {
            console.log("error: sytax incorrect: " + line)
        }
    });
    edges.forEach(edge => {
        let transition = transIdMap.get(edge.transId)
        edge.incoming.forEach(placeName => {
            if(placeIdMap.has(placeName)){
                let place = placeIdMap.get(placeName)
                transition.addIncoming(place, 1)
                place.addOutgoing(transition, 1)
            } else {
                console.log("error: undeclared node used: " + placeName)
            }
        })
        edge.outgoing.forEach(placeName => {
            if(placeIdMap.has(placeName)){
                let place = placeIdMap.get(placeName)
                transition.addOutgoing(place, 1)
                place.addIncoming(transition, 1)
            } else {
                console.log("error: undeclared node used: " + placeName)
            }
        })

    })
    return {trans: trans, places: places, weights: false}
}

function parsePNML(pnmlString) {
    // Parse the PNML XML string
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(pnmlString, 'text/xml');

    // Initialize the structure of the Petri net
    const petriNet = {
        places: [],
        trans: [],
        weights: false,
    };

    // Helper function to extract text content from an element by tag name
    const getText = (element, tagName) => {
        const foundElement = element.getElementsByTagName(tagName)[0];
        return foundElement ? foundElement.textContent : null;
    };

    // Process places
    let placeCounter = 0;
    const placeElements = xmlDoc.getElementsByTagName('place');
    for (let place of placeElements) {
        const id = place.getAttribute('id');
        const initialMarking = getText(place, 'initialMarking') || '0'; // Assumes missing initialMarking means 0
        petriNet.places.push(new Place(id, parseInt(initialMarking, 10), placeCounter));
        placeCounter++;
    }

    // Process transitions
    const transitionElements = xmlDoc.getElementsByTagName('transition');
    let transCounter = 0;
    for (let trans of transitionElements) {
        const id = trans.getAttribute('id');
        const label = getText(trans, 'name') || id; // Use the ID as a fallback label
        petriNet.trans.push(new Transition(id, label,transCounter));
        transCounter++;
    }

    // Process arcs and update places and transitions
    const arcElements = xmlDoc.getElementsByTagName('arc');
    for (let arc of arcElements) {
        const sourceId = arc.getAttribute('source');
        const targetId = arc.getAttribute('target');
        const inscription = getText(arc, 'inscription');
        const weight = inscription ? parseInt(inscription, 10) : 1; // Assumes missing inscription means weight of 1
        if(!petriNet.weights && weight > 1) petriNet.weights = true;
        // Find source and target in places and transitions
        let source = petriNet.places.find(p => p.id === sourceId) || petriNet.trans.find(t => t.id === sourceId);
        let target = petriNet.places.find(p => p.id === targetId) || petriNet.trans.find(t => t.id === targetId);

        if (!source || !target) {
            console.error(`Invalid arc: missing source or target for arc from ${sourceId} to ${targetId}`);
            continue;
        }

        // Update source and target structures
        source.outgoing.push(target);
        source.outgoingWeights.set(target, weight);
        target.incoming.push(source);
        target.incomingWeights.set(source, weight);
    }

    // The petriNet object is now populated with the data from the PNML
    return petriNet;
}

export function parseShortPNF(transLines, placesLines, edgesLines){
    //errors:
    //declaring anything twice
    //using IDs that are not declared
    //syntax error

    let linesT = transLines.split('\n')
    let linesP = placesLines.split('\n')
    let linesE = edgesLines.split('\n')
    let hasWeights = false;

    let places = [];
    let placeIndex = 0;
    let placeIdMap = new Map();

    linesP.forEach(line => {
        let match = line.match(placeRegexSPNF);
        var emptyLine = line.match(emptyLineRegex)
        if(emptyLine){

        }else if(match){
            if(placeIdMap.has(match[1])){
                console.log("error: ID used twice: " + match[1])
            } else {
                let place = new Place(match[1], (match[3] ? parseInt(match[3]) : 0), placeIndex)
                places.push(place)
                placeIdMap.set(place.id,place)
                placeIndex++;
            }
        } else {
            console.log("error: sytax incorrect: " + line)
        }
    })

    let trans = [];
    let transIndex = 0;
    let transIdMap = new Map();

    linesT.forEach(line => {
        let match = line.match(transRegexSPNF);
        var emptyLine = line.match(emptyLineRegex)
        if(emptyLine){

        }else if(match){
            if(transIdMap.has(match[1])){
                console.log("error: ID used twice: " + match[1])
            } else {
                let transition = new Transition(match[1], match[2], transIndex)
                trans.push(transition)
                transIdMap.set(transition.id,transition)
                transIndex++;
            }
        } else {
            console.log("error: sytax incorrect: " + line)
        }
    })

    linesE.forEach(line => {
        let matchInc = line.match(incEdgeRegexSPNF);
        let matchOut = line.match(outEdgeRegexSPNF);
        let emptyLine = line.match(emptyLineRegex)
        if(emptyLine){

        }else if(matchInc){
            let transition =  transIdMap.get(matchInc[2])
            let place =  placeIdMap.get(matchInc[1])
            if(place == null){
                place = new Place(matchInc[1], 0, placeIndex);
                places.push(place)
                placeIdMap.set(place.id,place)
                placeIndex++;
            }
            if(transition == null){
                transition = new Transition(matchInc[2], "", transIndex)
                trans.push(transition)
                transIdMap.set(transition.id,transition)
                transIndex++;
            }
            let weight = matchInc[4] == undefined ? 1 : parseInt(matchInc[4]);
            transition.addIncoming(place, weight)
            place.addOutgoing(transition, weight)
            if(weight > 1) hasWeights = true
        } else if (matchOut){
            let transition =  transIdMap.get(matchOut[1])
            let place =  placeIdMap.get(matchOut[2])
            if(place == null){
                place = new Place(matchOut[2], 0, placeIndex);
                places.push(place)
                placeIdMap.set(place.id,place)
                placeIndex++;
            }
            if(transition == null){
                transition = new Transition(matchOut[1], "", transIndex)
                trans.push(transition)
                transIdMap.set(transition.id,transition)
                transIndex++;
            }
            let weight = matchOut[4] == undefined ? 1 : parseInt(matchOut[4]);
            transition.addOutgoing(place, weight)
            place.addIncoming(transition, weight)
            if(weight > 1) hasWeights = true
        } else {
            console.log("error: sytax incorrect: " + line)
        }
    })
    return {trans: trans, places: places, weights: hasWeights}

}

function find(elemAr, elemId){
    var result = []
    elemAr.forEach(elem => {
        if(elem.id === elemId) result.push(elem)
    })
    return result
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

export function unparseToSPNF(places, transitions) {
    let placeResult = '';
    let transResult = '';
    let edgeResult = '';

    places.forEach(place => {
        let placeString = place.init > 0 ? `${place.id} ~ ${place.init}` : `${place.id}`;
        placeResult += placeString + '\n';
    });

    transitions.forEach(transition => {
        let transitionString = `${transition.id} ~ ${transition.label.trim()}`;
        transResult += transitionString + '\n';

        transition.incoming.forEach(incoming => {
            let weight = transition.incomingWeights.get(incoming);
            let edgeString = weight && weight > 1 ? `${incoming.id} -> ${transition.id} ~ ${weight}` : `${incoming.id} -> ${transition.id}`;
            edgeResult += edgeString + '\n';
        });

        transition.outgoing.forEach(outgoing => {
            let weight = transition.outgoingWeights.get(outgoing);
            let edgeString = weight && weight > 1 ? `${transition.id} -> ${outgoing.id} ~ ${weight}` : `${transition.id} -> ${outgoing.id}`;
            edgeResult += edgeString + '\n';
        });
    });

    return {placesSPNF: placeResult, transSPNF: transResult, edgeSPNF: edgeResult}
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

const data = {
    places: [/* your places data */],
    transitions: [/* your transitions data */],
};

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