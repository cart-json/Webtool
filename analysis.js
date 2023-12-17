export class Analysis {
    constructor(petriNet){
        this.places = petriNet.places;
        this.transitions = petriNet.transitions;
        this.isPTNet = petriNet.isPTNet;
        this.coverabilityGraph = this.coverabilityAna(this.places, this.transitions)
        this.loops = [];
    }
    analyse(){
        let markings = this.reachabilityAna(this.places,this.transitions)
        this.analyseLoops(markings)
        return {markings: markings,
            deadlocks: this.deadlocks(markings),
            boundedness: this.analyzeBoundedness(markings),
            soundness: this.analyzeSoundness(this.places,this.transitions),
            strSoundness: this.analyzeStrSoundness([...this.places, ...this.transitions]),
            liveness: this.analyseLiveness(this.transitions, markings),
            loops: this.loops,
            fullyConnected: this.isFullyConnected(this.places, this.transitions)}
    }

    reachabilityAna(places, transitions){
        let markings = []
        let toExplore = []
        let initialMarking = this.setupInitialMarking(places)
        toExplore.push(initialMarking)
        markings[0] = initialMarking
        let counter = 1;
        let depth = this.coverabilityGraph.length;
        while(toExplore.length > 0 && (counter < depth || !this.isPTNet)){
            let currentMarking = toExplore.shift();
            this.getActiveTransitions(transitions, currentMarking.markingArr).forEach(trans => {
                let newMarkingArr = this.fireTransition(trans, currentMarking.markingArr)
                let knownEqualMarking = markings.find(marking => marking.markingArr.every((elem, index) => elem == newMarkingArr[index]))
                if(knownEqualMarking){
                    currentMarking.nextMarks.set(trans,knownEqualMarking)
                    knownEqualMarking.previous.push(currentMarking)
                } else {
                    var newMarking = {id: "M" + counter, markingArr:newMarkingArr, nextMarks:new Map(), index: counter, previous:[currentMarking]}
                    currentMarking.nextMarks.set(trans,newMarking)
                    toExplore.push(newMarking)
                    markings[counter] = newMarking
                    counter++;
                }
            })
        }
        while(toExplore.length > 0 && this.isPTNet){
            let currentMarking = toExplore.shift();
            this.getActiveTransitions(transitions, currentMarking.markingArr).forEach(trans => {
                let newMarkingArr = this.fireTransition(trans, currentMarking.markingArr)
                let knownCoverMarking = this.findKnownCoverMarking(newMarkingArr, currentMarking)
                let knownEqualMarking = markings.find(marking => marking.markingArr.every((elem, index) => elem == newMarkingArr[index]))
                if(knownCoverMarking){
                    for (let i = 0; i < knownCoverMarking.markingArr.length; i++) {
                        if (knownCoverMarking.markingArr[i] < newMarkingArr[i]) {
                            newMarkingArr[i] = Infinity;
                        }
                    }
                    knownEqualMarking = markings.find(marking => marking.markingArr.every((elem, index) => elem == newMarkingArr[index]))
                    if(knownEqualMarking){
                        currentMarking.nextMarks.set(trans,knownEqualMarking)
                        knownEqualMarking.previous.push(currentMarking)
                    } else {
                        var newMarking = {id: "M" + counter, markingArr:newMarkingArr, nextMarks:new Map(), index: counter, previous:[currentMarking]}
                        currentMarking.nextMarks.set(trans,newMarking)
                        toExplore.push(newMarking)
                        markings[counter] = newMarking
                        counter++;
                    }
                } else if(knownEqualMarking){
                    currentMarking.nextMarks.set(trans,knownEqualMarking)
                    knownEqualMarking.previous.push(currentMarking)
                } else {
                    var newMarking = {id: "M" + counter, markingArr:newMarkingArr, nextMarks:new Map(), index: counter, previous:[currentMarking]}
                    currentMarking.nextMarks.set(trans,newMarking)
                    toExplore.push(newMarking)
                    markings[counter] = newMarking
                    counter++;
                }
            })

        }
        return markings;
    }

    findKnownCoverMarking(newMarkingArr, currentMarking){
        let explored = new Set();
        let toExplore = [currentMarking];
        while(toExplore.length > 0){
            let marking = toExplore.pop();
            if(explored.has(marking)){
                continue;
            }
            explored.add(marking)
            let markCoversNew = newMarkingArr.every((placeTokens,index) => placeTokens >= marking.markingArr[index])
            
            if(markCoversNew){
                return marking;
            }
            marking.previous.forEach(prevMark => toExplore.push(prevMark))
        }
        return null;
    }
    

    reachabilityAna2(places, transitions){
        let markings = []
        let toExplore = []
        let initialMarking = this.setupInitialMarking(places)
        toExplore.push(initialMarking)
        markings[0] = initialMarking
        let counter = 1;
        let depth = this.coverabilityGraph.length;
        while(toExplore.length > 0){
            let currentMarking = toExplore.shift();
            this.getActiveTransitions(transitions, currentMarking.markingArr).forEach(trans => {
                let newMarkingArr = this.fireTransition(trans, currentMarking.markingArr)
                let knownEqualMarking = markings.find(marking => marking.markingArr.every((elem, index) => elem == newMarkingArr[index]))
                if(knownEqualMarking){
                    currentMarking.nextMarks.set(trans,knownEqualMarking)
                    knownEqualMarking.previous.push(currentMarking)
                } else if(counter > depth){
                    let knownCoverMarking = markings.find(marking => marking.markingArr.every((elem, index) => elem <= newMarkingArr[index]))
                    if(knownCoverMarking){
                        for (let i = 0; i < knownCoverMarking.markingArr.length; i++) {
                            if (knownCoverMarking.markingArr[i] < newMarkingArr[i]) {
                                newMarkingArr[i] = Infinity;
                            }
                        }
                    }
                    knownEqualMarking = markings.find(marking => marking.markingArr.every((elem, index) => elem == newMarkingArr[index]))
                    if(knownEqualMarking){
                        currentMarking.nextMarks.set(trans,knownEqualMarking)
                        knownEqualMarking.previous.push(currentMarking)
                    } else {
                        var newMarking = {id: "M" + counter, markingArr:newMarkingArr, nextMarks:new Map(), index: counter, previous:[currentMarking]}
                        currentMarking.nextMarks.set(trans,newMarking)
                        toExplore.push(newMarking)
                        markings[counter] = newMarking
                        counter++;
                    }
                }  else {
                    var newMarking = {id: "M" + counter, markingArr:newMarkingArr, nextMarks:new Map(), index: counter, previous:[currentMarking]}
                    currentMarking.nextMarks.set(trans,newMarking)
                    toExplore.push(newMarking)
                    markings[counter] = newMarking
                    counter++;
                }
            })
        }
        return markings;
    }
    
    coverabilityAna(places, transitions){
        let markings = []
        let toExplore = []
        let initialMarking = this.setupInitialMarking(places)
        toExplore.push(initialMarking)
        markings[0] = initialMarking
        let counter = 1;
        while(toExplore.length > 0){
            let currentMarking = toExplore.shift();
            this.getActiveTransitions(transitions, currentMarking.markingArr).forEach(trans => {
                let newMarkingArr = this.fireTransition(trans, currentMarking.markingArr)
                let knownCoverMarking = markings.find(marking => marking.markingArr.every((elem, index) => elem <= newMarkingArr[index]))
                if(knownCoverMarking){
                    for (let i = 0; i < knownCoverMarking.markingArr.length; i++) {
                        if (knownCoverMarking.markingArr[i] < newMarkingArr[i]) {
                            newMarkingArr[i] = Infinity;
                        }
                    }
                }
                let knownEqualMarking = markings.find(marking => marking.markingArr.every((elem, index) => elem == newMarkingArr[index]))
                if(knownEqualMarking){
                    currentMarking.nextMarks.set(trans,knownEqualMarking)
                    knownEqualMarking.previous.push(currentMarking)
                } else {
                    var newMarking = {id: "M" + counter, markingArr:newMarkingArr, nextMarks:new Map(), index: counter, previous:[currentMarking]}
                    currentMarking.nextMarks.set(trans,newMarking)
                    toExplore.push(newMarking)
                    markings[counter] = newMarking
                    counter++;
                }
            })
        }
        return markings;
    }

    setupInitialMarking(places){
        let initialMarkingArr = []
        for(let n = 0; n < places.length; n++){
            initialMarkingArr[n] = places[n].init;
        };
        return {id: "M0", markingArr:initialMarkingArr, nextMarks:new Map(), previous:[], index: 0}

    }

    //returning all active transition for a specific marking
    getActiveTransitions(transitions,markingArr){
        let result;
        if(this.isPTNet){
            //in a PT net: all incoming places have to have more tokens than the edge weight
            result = transitions.filter(trans => 
                (trans.incoming.reduce((active, place)=>
                    active && markingArr[place.index] >= trans.incomingWeights.get(place),true)))
                
        } else {
            //in an EC net: all incoming places have a token, no outgoing places (that are not incoming) have a token
            result = transitions.filter(trans => (trans.incoming
                .reduce((active, place)=>active && markingArr[place.index] != 0,true) && trans.outgoing
                .reduce((active,place)=> active && (markingArr[place.index] == 0 || place.outgoing.includes(trans)), true)))
        }
        return result 
    }
    //transition is fired: remove tokens from the incoming places and put tokens on the outgoing place,
        //according to the edge weight
    fireTransition(transition, markingArr) {
        let newMarking = markingArr.slice();
    
        for (let place of transition.incoming) {
            newMarking[place.index]=newMarking[place.index]-transition.incomingWeights.get(place);
        }
        for (let place of transition.outgoing) {
            newMarking[place.index]=newMarking[place.index]+transition.outgoingWeights.get(place);
        }
    
        return newMarking;
    }

    deadlocks(markings){
        return markings.filter(marking => marking.nextMarks.size == 0);;
    }

    analyzeBoundedness(markings){
        return markings.reduce((currentMax, marking) => {
            let markingMax = marking.markingArr.reduce((markingMax,markingVal) => markingVal > markingMax ? markingVal: markingMax, 0)
            return markingMax > currentMax ? markingMax : currentMax
        },0)
    }
    analyzeSoundness(places, transitions){
        let soundness = true;
        //1. do one inital and one final place exist?
        let initPlace;
        let finalPlace;
        places.every(place => {
            if(place.incoming.length == 0){
                if(initPlace != null){
                    soundness = false;
                    return false;
                }
                initPlace = place;
            } 
            if(place.outgoing.length == 0){
                if(finalPlace != null){
                    soundness = false;
                    return false;
                }
                finalPlace = place;
            }
            return true;
        })
        if(!soundness || initPlace == null || finalPlace == null) return false;

        //2. reachability analysis with inital marking
        places.forEach(place => place.init = 0);
        initPlace.init = 1;
        let markings = this.reachabilityAna(places,transitions);

        //find inital and final marking
        let deadlockList = this.deadlocks(markings)
        if(deadlockList.length != 1) return false
        const initialMarking = markings[0];
        const finalMarking = deadlockList[0];
        let finalMarkArr = finalMarking.markingArr
        //checking if the final marking has only one token in the final place an no tokens in the other places
        for(var index = 0; index < finalMarkArr.length; index++){
            if(index == finalPlace.index){
                if(finalMarkArr[index] != 1){
                    return false;
                }
            } else {
                if(finalMarkArr[index] != 0){
                    return false;
                }
            }
        }
        //checking if any other marking covers the final marking
        if(!markings.reduce((prev, mark) => (mark == finalMarking ? true : (mark.markingArr[finalPlace.index] == 0)) && prev, true )){
            return false;
        }



        //3. do all markings lead to final marking (Mf)?
        let markQueueMf = [finalMarking];
        let prevMarkSet = new Set();
        while(markQueueMf.length != 0){
            let currMark = markQueueMf.shift(); 
            currMark.previous.forEach(prevMark => {
                if(!prevMarkSet.has(prevMark)){
                    prevMarkSet.add(prevMark)
                    markQueueMf.push(prevMark)
                }
            })
        }
        if(prevMarkSet.size != markings.length - 1){
            return false;
        }
        //5. are there any dead transitions
        let checkedTrans = new Set()
        markings.forEach(mark => mark.nextMarks.forEach((nextMark, trans) => checkedTrans.add(trans)))
        if(checkedTrans.size != transitions.length) return false;
        return true;
    }

    analyzeStrSoundness(petriNetAr){
        //1. there is one initial node
        //2. there is one final node
        let initialNode;
        let finalNode;
        let strSound = true;
        petriNetAr.forEach(node => {
            if(node.incoming.length == 0){
                if(initialNode != null){
                    strSound = false;
                } 
                initialNode = node;
            }
            if(node.outgoing.length == 0){
                if(finalNode != null){
                    strSound = false;
                }
                finalNode = node;
            }
        })
        if(!strSound || initialNode == null || finalNode == null) return false;
        //3. each node is on a path from inital node to final node
        let initFoll = new Set();
        initFoll.add(initialNode);
        let finalPrev = new Set();
        finalPrev.add(finalNode);
        let nodeQueue = [initialNode];
        while(nodeQueue.length != 0){
            let currNode = nodeQueue.shift(); 
            currNode.outgoing.forEach(follNode => {
                if(!initFoll.has(follNode)){
                    initFoll.add(follNode)
                    nodeQueue.push(follNode)
                }
            })
        }
        nodeQueue = [finalNode];
        while(nodeQueue.length != 0){
            let currNode = nodeQueue.shift(); 
            currNode.incoming.forEach(prevNode => {
                if(!finalPrev.has(prevNode)){
                    finalPrev.add(prevNode)
                    nodeQueue.push(prevNode)
                }
            })
        }
        return initFoll.length == finalPrev.length && [...initFoll].every(node => finalPrev.has(node));
    }
    

    analyseLiveness(transitions, markings){
        return transitions.map(trans => this.analyseTransLiveness(trans,markings));
    }

    analyseTransLiveness(trans, markings){
        //L0: T never fires
        let activatingMarks = markings.filter(mark => mark.nextMarks.get(trans) != null)
        if(activatingMarks.length == 0){
            return 0;
        } else {
            //L4: for all M there is a path t1,...,tn, so that M--t1,...,tn-->M' with M'' activating T
            let marksLeadingToTrans = this.getMarksLeadingToTrans(trans, activatingMarks);
            if (this.deadlocks(markings).length == 0 && marksLeadingToTrans.size == markings.length ){
                return 4;
            //L3 for all M activating T with M--T-->M', there is a path t1,...,tn, so that M'--t1,...,tn-->M'' and M'' activates T
            } else if(activatingMarks.reduce((prev,mark) => marksLeadingToTrans.has(mark.nextMarks.get(trans)) && prev, true)){
                return 3;
            //L2: there is a marking M with M--T-->M
            }else if(activatingMarks.find(mark => trans.incoming.filter(place => !trans.outgoing.includes(place))
                .reduce((prev, place) => mark.markingArr[place.index] == Infinity && prev, true))){
                return 2;
            } else {
            //L1: there is an M with M--T-->M' with no path t1,...,tn, so that M'--t1,...,tn-->M'' with M'' activating T
            //or if none of the other cases is correct
                return 1;
            }
        }

    }
    getMarksLeadingToTrans(trans, activatingMarks){
        let visited = new Set();
        let toVisit = activatingMarks.slice();
        while(toVisit.length != 0){
            let curMark = toVisit.pop();
            visited.add(curMark);
            curMark.previous.forEach(prevMark => {
                if(!visited.has(prevMark) && !toVisit.includes(prevMark)){
                    toVisit.push(prevMark);
                }
            })
        }
        return visited;
    }

    loopExists(newLoop){
        for(let loop of this.loops){
            if(loop[0].index == newLoop[0].index && loop[1].index == newLoop[1].index) return true;
        }
        return false;
    }

    checkForLoops(marking, explored) {
    
    
        if (marking.nextMarks.size === 0) {
            return;
        }
    
        for (let nextMarking of marking.nextMarks.values()) {
            if (explored.includes(nextMarking.id)) {
                let newLoop = [marking, nextMarking]
                //console.log(!this.loopExists(newLoop))
                if(!this.loopExists(newLoop)){
                    this.loops.push(newLoop);
                }
            } else {
                this.checkForLoops(nextMarking, [...explored, marking.id]);
            }
        }
    }
    
    analyseLoops(markings) {
        let initialMarking = markings[0];
    
        this.checkForLoops(initialMarking, []);
    }

    depthFirstSearch(node, visited = new Set()) {
        visited.add(node);
    
        node.getConnectedNodes().forEach(connectedNode => {
            if (!visited.has(connectedNode)) {
                this.depthFirstSearch(connectedNode, visited);
            }
        });
    
        return visited;
    }
    
    isFullyConnected(places, transitions) {
        let allNodes = [...places, ...transitions];
    
        for (let startNode of allNodes) {
            let visited = this.depthFirstSearch(startNode);
    
            if (visited.size < allNodes.length) {
                return false;
            }
        }
    
        return true;
    }
}