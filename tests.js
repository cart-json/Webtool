import { parse } from "./libraries/parsing.js";
import { Analysis } from "./libraries/analysis.js";

//testParserTpn1();
//testParserPnml1();
//testLiveness();
//testCoverability();
//testSoundness();

function testParserTpn1() {
    //Setup Parsing Input and expected Output
    const testInput = `place P0 init 1;\nplace P1;\nplace P2;\nplace P3 init 1;\ntrans T1 ~ l1 in P0, P3, P3 out P1, P3;\ntrans T2 ~ l2 in P0, P1 out P2;\ntrans TT ~ l3 in P1 out P2;\ntrans TR ~ l4 in P1 out P2;`;
    const resultingLabels = ["l3", "l1", "l2", "l4"];

    //parse input
    let [petriNet, errorList] = parse(testInput, "tpn", false);

    //check errors
    if(errorList.length != 0){
        console.log('Parsing Failed');
        return;
    }

    //check place ids
    for(let i = 0; i < petriNet.places.length; i++){
        if(petriNet.places[i].id !== i){
            console.log('Parsing Failed');
            return;
        }
    }
    //check transition ids and labels
    for(let i = 0; i < petriNet.transitions.length; i++){
        if(petriNet.transitions[i].id !== i || petriNet.transitions[i].label !== resultingLabels[i]){
            console.log('Parsing Failed');
            return;
        }
    }
    //check arc weight
    if(petriNet.transitions[1].incomingWeights.get(petriNet.places[3]) != 2){
        console.log('Parsing Failed');
        return;
    }

    let analysis = new Analysis(petriNet);
    let anaResults = analysis.analyse();
    //check analysis properties
    if(!anaResults.strSoundness || anaResults.soundness || anaResults.markings.length != 1){
        console.log('Analysis Failed');
    }
    console.log('TPN Test Passed');
}

function testParserPnml1(){
    //Setup Parsing Input and expected Output
    const testInput = '<?xml version="1.0" encoding="UTF-8"?>\n<pnml>\n<net id="net1" type="pnmlcoremodel">\n<place id="Start">\n<name>\n<text>Start</text>\n' +
        '</name>\n<initialMarking>\n<text>1</text>\n</initialMarking>\n<capacity>\n<text>-1</text>\n</capacity>\n</place>\n<place id="P0">\n<name>\n<text>Finish</text>\n</name>\n<capacity>\n<text>8</text>\n' +
        '</capacity>\n</place>\n<transition id="Task">\n<name>\n<text>Task1</text>\n</name>\n</transition>\n<arc id="a_0_1" source="Start" target="Task">\n<inscription>\n' +
        '<text>1</text>\n</inscription>\n</arc>\n<arc id="a_1_0" source="Task" target="P0">\n<inscription>\n<text>19</text>\n</inscription>\n</arc>\n</net>\n</pnml>';
    const resultingLabels = ["Task1"];

    //parse input
    let [petriNet, errorList] = parse(testInput, "pnml", false);
    //check different parsing properties
    if(errorList.length != 0){
        console.log('Parsing Failed1');
        return;
    }
    for(let i = 0; i < petriNet.places.length; i++){
        if(petriNet.places[i].id !== i){
            console.log('Parsing Failed2');
            return;
        }
    }
    for(let i = 0; i < petriNet.transitions.length; i++){
        if(petriNet.transitions[i].id !== i || petriNet.transitions[i].label !== resultingLabels[i]){
            console.log('Parsing Failed3');
            return;
        }
    }
    if(petriNet.transitions[0].outgoingWeights.get(petriNet.places[0]) != 9){
        console.log('Parsing Failed4');
        return;
    }
    if(petriNet.places[1].capacity != Infinity){
        console.log('Parsing Failed5');
        return;
    }

    let analysis = new Analysis(petriNet);
    let anaResults = analysis.analyse();

    if(!anaResults.strSoundness || anaResults.soundness || anaResults.markings.length != 1){
        console.log('Analysis Failed');
        return;
    }
    console.log('PNML Test Passed');
}

function testLiveness(){
    //Setup Parsing Input and expected Output
    const testInput = '<?xml version="1.0" encoding="UTF-8"?>\n<pnml>\n<net id="net1" type="http://www.pnml.org/version-2009/grammar/pnmlcoremodel">\n' +
        '<place id="P0">\n<name>\n<text>P0</text>\n</name>\n<initialMarking>\n<text>1</text>\n</initialMarking>\n<capacity>\n<text>-1</text>\n</capacity>' +
        '\n</place>\n<place id="P1">\n<name>\n<text>P1</text>\n</name>\n<initialMarking>\n<text>0</text>\n</initialMarking>\n<capacity>\n<text>-1</text>\n' + 
        '</capacity>\n</place>\n<place id="P2">\n<name>\n<text>P2</text>\n</name>\n<initialMarking>\n<text>0</text>\n</initialMarking>\n<capacity>\n<text>-1' +
        '</text>\n</capacity>\n</place>\n<transition id="T0">\n<name>\n<text></text>\n</name>\n</transition>\n<transition id="T1">\n<name>\n<text></text>\n' +
        '</name>\n</transition>\n<transition id="T2">\n<name>\n<text></text>\n</name>\n</transition>\n<arc id="a_0_0" source="T0" target="P0">\n<inscription>' + 
        '\n<text>1</text>\n</inscription>\n</arc>\n<arc id="a_0_1" source="T0" target="P1">\n<inscription>\n<text>1</text>\n</inscription>\n</arc>\n<arc ' + 
        'id="a_0_0" source="P0" target="T0">\n<inscription>\n<text>1</text>\n</inscription>\n</arc>\n<arc id="a_1_2" source="T1" target="P2">\n<inscription>\n' + 
        '<text>1</text>\n</inscription>\n</arc>\n<arc id="a_0_1" source="P0" target="T1">\n<inscription>\n<text>1</text>\n</inscription>\n</arc>\n<arc id="a_2_2" ' + 
        'source="T2" target="P2">\n<inscription>\n<text>1</text>\n</inscription>\n</arc>\n<arc id="a_1_2" source="P1" target="T2">\n<inscription>\n<text>1</text>' +
        '\n</inscription>\n</arc>\n<arc id="a_2_2" source="P2" target="T2">\n<inscription>\n<text>1</text>\n</inscription>\n</arc>\n</net>\n</pnml>'

    const resultingLiveness = [3, 1, 2];

    //parse input
    let [petriNet, errorList] = parse(testInput, "pnml", false);
    //check different parsing properties
    if(errorList.length != 0){
        console.log('Parsing Failed1');
        return;
    }

    let analysis = new Analysis(petriNet);
    let anaResults = analysis.analyse();

    for(let i = 0; i < anaResults.liveness.length; i++){
        if(anaResults.liveness[i] !== resultingLiveness[i]){
            console.log('Liveness Failed3');
            return;
        }
    }
    console.log('Liveness Test Passed');
}

function testCoverability(){
    //Setup Parsing Input and expected Output
    const testInput = 'place P0 init 1;\nplace P1;\nplace P2;\nplace P3;\nplace P4;\n\ntrans T1 in P0 out P1;\ntrans T2 in P0 out P2;\ntrans T3 in P1 out P1, P3;\ntrans T4 in P2 out P2, P4;';

    const expectedMarking = [0, 0, 1, 0, Infinity];

    //parse input
    let [petriNet, errorList] = parse(testInput, "tpn", true);
    //check different parsing properties
    if(errorList.length != 0){
        console.log('Parsing Failed');
        return;
    }

    let analysis = new Analysis(petriNet);
    let anaResults = analysis.analyse();

    let coveringMarking = anaResults.markings[6];

    for(let i = 0; i < coveringMarking.length; i++){
        if(coveringMarking[i] !== expectedMarking[i]){
            console.log('Coverability Test Failed');
            return;
        }
    }
    console.log('Coverability Test Passed');
}

function testSoundness(){
    //Setup Parsing Input and expected Output
    const testInput = 'place P0 init 1;\nplace P1;\nplace P2;\n\ntrans T1~T in P0 out P1, P2;\ntrans T2~T in P0, P2 out P1;';

    //parse input
    let [petriNet, errorList] = parse(testInput, "tpn", false);
    //check different parsing properties
    if(errorList.length != 0){
        console.log('Parsing Failed');
        return;
    }

    let analysis = new Analysis(petriNet);
    let anaResults = analysis.analyse();

    if(!anaResults.strSoundness || anaResults.soundness){
        console.log('Coverability Test Failed');
        return;

    }
    console.log('Soundness Test Passed');
}