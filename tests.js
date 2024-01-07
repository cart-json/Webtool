import { parse, unparseToPNML} from "./parsing.js";
import { Analysis } from "./analysis.js";

function testParser() {
    const testInput = `place P0 init 1;\nplace P1;\nplace P2;\nplace P3 init 1;\ntrans T1 ~ l1 in P0, P3, P3 out P1, P3;\ntrans T2 ~ l2 in P0, P1 out P2;\ntrans TT ~ l3 in P1 out P2;\ntrans TR ~ l4 in P1 out P2;`;
    const resultingLabels = ["l3", "l1", "l2", "l4"];
    let [petriNet, errorList] = parse(testInput, "tpn", false);

    if(errorList.length != 0){
        console.log('Parsing Failed');
        return;
    }

    for(let i = 0; i < petriNet.places.length; i++){
        if(petriNet.places[i].id !== i){
            console.log('Parsing Failed');
            return;
        }
    }
    for(let i = 0; i < petriNet.transitions.length; i++){
        if(petriNet.transitions[i].id !== i || petriNet.transitions[i].label !== resultingLabels[i]){
            console.log('Parsing Failed');
            return;
        }
    }
    if(petriNet.transitions[1].incomingWeights.get(petriNet.places[3]) != 2){
        console.log('Parsing Failed');
        return;
    }


    let analysis = new Analysis(petriNet);
    console.log(analysis);
    console.log('Test Passed');
}

testParser();