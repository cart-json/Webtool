const placeRegex = /^place "(P\d+)"( init (\d+))?;$/;
const transRegex = /^trans "(T\d+)"~"([\w ]+)"( in ("P\d+"(?:, "P\d+")*))?( out ("P\d+"(?:, "P\d+")*))?;$/
const placeListRegex = /"(P\d+)"/g

export function parse(file, type){
    if(type === "tpn"){
        return parseTPN(file)
    } else {
        return parsePNML(file);
    }
}

function parseTPN(file){
    var lines = file.split('\n')
    let elems = []
    let placeIndex = 0;
    let transIndex = 0;

    lines.forEach(line => {
        var matchP = line.match(placeRegex)
        if(matchP){
            elems.push({type:"place", id:matchP[1], init:(matchP[3] ? parseInt(matchP[3]) : 0), incoming:[], outgoing:[], index: placeIndex})
            placeIndex++;
        }
        var matchT = line.match(transRegex)
        if(matchT){
            elems.push({type:"trans", id:matchT[1], label:matchT[2], incoming:readPlaces(matchT[4]),outgoing:readPlaces(matchT[6]), index: transIndex})
            transIndex++;
        }
        //include parsing error
    });
    connectElems(elems);
    console
    return elems
}

function connectElems(elemAr){
    elemAr.forEach(elem => {
        if(elem.type === "trans"){
            var inPlaceNames = elem.incoming
            elem.incoming = []
            for(var n = 0; n <= inPlaceNames.length; n++){
                var placeObjAr = find(elemAr,inPlaceNames[n])
                if(placeObjAr.length == 1){
                    elem.incoming.push(placeObjAr[0])
                    placeObjAr[0].outgoing.push(elem)
                }
                //ToDo error for ID used twice
                //ToDo error for ID not found
            }
            var outPlaceNames = elem.outgoing
            elem.outgoing = []
            for(var n = 0; n <= outPlaceNames.length; n++){
                var placeObjAr = find(elemAr,outPlaceNames[n])
                if(placeObjAr.length == 1){
                    elem.outgoing.push(placeObjAr[0])
                    placeObjAr[0].incoming.push(elem)
                }
                //ToDo error for ID used twice
                //ToDo error for ID not found
            }
        }
    })
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

function parsePNML(file){
    //ToDo
}