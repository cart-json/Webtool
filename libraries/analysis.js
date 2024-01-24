export class Analysis {
    // Creating necessary attributes and doing the coverability analysis
    constructor(petriNet){
        this.places = petriNet.places;
        this.transitions = petriNet.transitions;
        this.isPTNet = petriNet.isPTNet;
        this.coverabilityGraph = this.coverabilityAna(this.places, this.transitions)
        this.loops = [];
        this.errors = [];
        this.unsoundMarkings = [];
        this.unsoundNodes = [];
    }

    // Analyses all properties and retruns the reesults
    analyse(){
        let [markings, newErrors] = this.reachabilityAna(this.places,this.transitions)
        this.markings = markings;
        this.errors = newErrors;
        this.analyseLoops(markings);
        return {markings: markings,
            deadlocks: this.deadlocks(markings),
            boundedness: this.analyzeBoundedness(markings),
            soundness: this.analyzeSoundness(this.places,this.transitions),
            unsoundMarkings: this.unsoundMarkings,
            strSoundness: this.analyzeStrSoundness([...this.places, ...this.transitions]),
            unsoundNodes: this.unsoundNodes,
            liveness: this.analyseLiveness(this.transitions, markings),
            loops: this.loops,
            components: this.analyseComponents(this.places, this.transitions),
            errors: this.errors}
    }

    // The reachability analysis method for a given Petri net
    reachabilityAna(places, transitions){
        // Sets up the initial marking
        let initialMarking = this.setupInitialMarking(places)
        let toExplore = [initialMarking] // Queue of markings to explore
        let markings = [initialMarking] // Stores all the discovered markings
        let counter = 1; // Counter for new markings
        let errors = [] // Stores all occuring errors
        // Length of the coverability graph
        let cover_depth = this.coverabilityGraph.length;
        let max_depth = 300; // Maximum depth for exploration
        let overflow = false; // Flag to indicate if maximum depth is exceeded

        // Processes an unexplored marking 
        // 'markingArr' is an array, describing how many tokens each place has
        function processMarking(trans, currentMarking, newMarkingArr){
            // Checks if the new marking already exists in the markings list
            let knownEqualMarking = markings.find(marking => marking.markingArr
                .every((elem, index) => elem == newMarkingArr[index]));
            if(knownEqualMarking){
                // If exists, links current and known markings
                currentMarking.nextMarks.set(trans,knownEqualMarking)
                knownEqualMarking.previous.push(currentMarking)
            } else if(counter < max_depth) {
                // If not, and within depth limit, creates a new marking
                var newMarking = {id: "M" + counter, markingArr:newMarkingArr, 
                    nextMarks:new Map(), index: counter, previous:[currentMarking]}
                currentMarking.nextMarks.set(trans,newMarking)
                toExplore.push(newMarking)
                markings[counter] = newMarking
                counter++;
            } else {
                // Sets overflow flag if maximum depth is exceeded
                overflow = true;
            }
        }
        // Explores all reachable markings
        // PT nets change to the coverabilty analysis, ones the depth of the coverbility graph is exeeded
        while(toExplore.length > 0 && (counter < cover_depth || !this.isPTNet)){
            let currentMarking = toExplore.shift();
            let activeTransitions = this.getActiveTransitions(transitions, currentMarking.markingArr);
            // Process the new marking for each active transition
            for(let i = 0; i < activeTransitions.length; i++){
                let trans = activeTransitions[i];
                // 'fireTransition' calculates the resulting 'markingArr'
                let newMarkingArr = this.fireTransition(trans, currentMarking.markingArr);
                processMarking(trans, currentMarking, newMarkingArr);
            }
        }
        // Continues exploration for coverability for PT Nets
        while(toExplore.length > 0){
            // Removes the first marking from the queue and find all active transitions
            let currentMarking = toExplore.shift();
            let activeTransitions = this.getActiveTransitions(transitions, currentMarking.markingArr);
            // Process the new marking for each active transition
            for(let i = 0; i < activeTransitions.length; i++){
                // Similar process to 'processMarking'
                let trans = activeTransitions[i];
                let newMarkingArr = this.fireTransition(trans, currentMarking.markingArr)
                let knownCoverMarking = this.findKnownCoverMarking(newMarkingArr, currentMarking)
                let knownEqualMarking = markings.find(marking => marking.markingArr
                    .every((elem, index) => elem == newMarkingArr[index]))
                // If a covering marking is found, the respective tokens are set to 'Infinity'
                if(knownCoverMarking){
                    for (let i = 0; i < knownCoverMarking.markingArr.length; i++) {
                        if (knownCoverMarking.markingArr[i] < newMarkingArr[i]) {
                            newMarkingArr[i] = Infinity;
                        }
                    }
                    // Then the 'markingArr' is processed 
                    processMarking(trans, currentMarking, newMarkingArr);
                // otherwise the process continues as in 'processMarking'
                } else if(knownEqualMarking){
                    currentMarking.nextMarks.set(trans,knownEqualMarking)
                    knownEqualMarking.previous.push(currentMarking)
                } else if(counter < max_depth){
                    var newMarking = {id: "M" + counter, markingArr:newMarkingArr, 
                    nextMarks:new Map(), index: counter, previous:[currentMarking]}
                    currentMarking.nextMarks.set(trans,newMarking)
                    toExplore.push(newMarking)
                    markings[counter] = newMarking
                    counter++;
                } else {
                    overflow = true;
                }
            }
        }
        //if the limit is exceeded, an error message is added
        if(overflow){
            errors.push("Warning: Marking limit of 300 exceeded. The resulting " +
            "marking table is not complete and the listed properties might not be correct.");
        }
        return [markings, errors];
    }

    // the pure coverabiltiy analysis, similar to the coverability analysis in 'reachabilityAna'
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
                let newMarkingArr = this.fireTransition(trans, currentMarking.markingArr);
                let knownCoverMarking = this.findKnownCoverMarking(newMarkingArr, currentMarking);
                if(knownCoverMarking){
                    for (let i = 0; i < knownCoverMarking.markingArr.length; i++) {
                        if (knownCoverMarking.markingArr[i] < newMarkingArr[i] && places[i].capacity == Infinity) {
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
    
    // Explores all previous markings form a marking to find one that covers it.
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

    // Creates an marking object based on the 'init' value of all places
    setupInitialMarking(places){
        let initialMarkingArr = []
        for(let n = 0; n < places.length; n++){
            initialMarkingArr[n] = places[n].init;
        };
        return {id: "M0", markingArr:initialMarkingArr, nextMarks:new Map(), previous:[], index: 0}

    }

    //returning all active transition for a specific marking
    getActiveTransitions(transitions,markingArr){
        return transitions.filter(trans => {
            // checks if there are enough tokens in the incoming places
            let incHaveTokens = trans.incoming.reduce((active, place) =>
                active && markingArr[place.index] >= trans.incomingWeights.get(place),true);
            // checks if there are not too many tokens in the outgoing places
            let outAreNotFull = trans.outgoing.reduce((active, place) => {
                let tokensAfterFiring = markingArr[place.index] + trans.outgoingWeights.get(place);
                if(place.outgoing.includes(trans)){
                    tokensAfterFiring -= trans.incomingWeights.get(place);
                }
                return active && tokensAfterFiring <= place.capacity;
            }, true);
            return incHaveTokens && outAreNotFull;
        });
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
    // Looks for deadlocks
    deadlocks(markings){
        return markings.filter(marking => marking.nextMarks.size == 0);;
    }

    // Checks the boundedness by iterating through every marking
    analyzeBoundedness(markings){
        return markings.reduce((currentMax, marking) => {
            let markingMax = marking.markingArr.reduce((markingMax,markingVal) => markingVal > markingMax ? markingVal: markingMax, 0)
            return markingMax > currentMax ? markingMax : currentMax
        },0)
    }

    analyzeSoundness(places, transitions){
        // Initialize variables for the initial and final places
        let initPlace;
        let finalPlace;
        // Iterate over places to find the initial and final places
        for(let place of places){
            if(place.incoming.length == 0){
                if(initPlace != null){
                    return false;
                }
                initPlace = place;
            } 
            if(place.outgoing.length == 0){
                if(finalPlace != null){
                    return false;
                }
                finalPlace = place;
            }
        }
        // Return false if initial or final places are not valid or not found
        if(initPlace == null || finalPlace == null) return false;

        // Set initial marking for reachability analysis
        places.forEach(place => place.init = 0);
        initPlace.init = 1;

        // Perform reachability analysis
        let  [markings, newErrors] = this.reachabilityAna(places,transitions);
        if(newErrors.length != 0){
            this.errors.push("Warning: Marking limit of 300 exceeded in soundness analysis. The resulting " +
            "soundness property might not be correct.");
        }

        // Find final marking from deadlock states
        let deadlockList = this.deadlocks(markings)
        if(deadlockList.length != 1) return false;
        const finalMarking = deadlockList[0];
        let finalMarkArr = finalMarking.markingArr

        // Check if final marking is correct
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
        // Check if any marking covers the final marking
        if(!markings.reduce((prev, mark) => (mark == finalMarking ? true : 
            (mark.markingArr[finalPlace.index] == 0)) && prev, true )){
            return false;
        }

        // Check if all markings lead to the final marking
        let markQueueMf = [finalMarking];
        let prevMarkSet = new Set();
        // Trace back from the final marking to ensure all markings lead to it
        while(markQueueMf.length != 0){
            let currMark = markQueueMf.shift(); 
            currMark.previous.forEach(prevMark => {
                if(!prevMarkSet.has(prevMark)){
                    prevMarkSet.add(prevMark)
                    markQueueMf.push(prevMark)
                }
            })
        }
        // Verify if all markings are accounted for
        if(prevMarkSet.size != markings.length - 1){
            let prevMarkArr = Array.from(prevMarkSet);
            let initsAreEqual = places.reduce((prev, place) => this.markings[0].markingArr[place.index] == place.init && prev, true);
            if(initsAreEqual){
                prevMarkArr.push(finalMarking);
                markings.forEach(mark => {
                    if(!prevMarkArr.find(prevMark => prevMark.markingArr
                        .every((elem, index) => elem == mark.markingArr[index]))){
                            this.unsoundMarkings.push(mark);
                    }
                })
            }
            return false;
        }
        // Check for dead transitions
        let checkedTrans = new Set()
        markings.forEach(mark => mark.nextMarks.forEach((nextMark, trans) => 
            checkedTrans.add(trans)))
        if(checkedTrans.size != transitions.length) return false;

        // Return true if all checks pass, indicating soundness
        return true;
    }

    analyzeStrSoundness(nodes){
        // Check for a single initial and final node
        let initialNode;
        let finalNode;
        for(let node of nodes){
            if(node.incoming.length == 0){
                if(initialNode != null)
                    return false;
                initialNode = node;
            }
            if(node.outgoing.length == 0){
                if(finalNode != null)
                    return false;   
                finalNode = node;
            }
        }
        // Early return if structural soundness criteria are not met
        if(initialNode == null || finalNode == null) return false;

        // Check if each node is on a path from the initial node to the final node
        let initFoll = new Set();
        initFoll.add(initialNode);
        let finalPrev = new Set();
        finalPrev.add(finalNode);
        let nodeQueue = [initialNode];
        // Populate the set of nodes following the initial node
        while(nodeQueue.length != 0){
            let currNode = nodeQueue.shift(); 
            currNode.outgoing.forEach(follNode => {
                if(!initFoll.has(follNode)){
                    initFoll.add(follNode)
                    nodeQueue.push(follNode)
                }
            })
        }
        // Reset the queue and populate the set of nodes preceding the final node
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

        //check if all nodes appear in the found sets
        nodes.forEach(node => {
            if(!initFoll.has(node) || !finalPrev.has(node)){
                this.unsoundNodes.push(node);
            }
        })

        // Determine if all nodes are part of the path from initial to final node
        return this.unsoundNodes.length == 0;
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
            let marksLeadingToTrans = this.getMarksLeadingToTrans(activatingMarks);
            if (this.deadlocks(markings).length == 0 && marksLeadingToTrans.size == markings.length ){
                return 4;
            //L3 for all M activating T with M--T-->M', there is a path t1,...,tn, 
                //so that M'--t1,...,tn-->M'' and M'' activates T
            } else if(activatingMarks.reduce((prev,mark) => 
                marksLeadingToTrans.has(mark.nextMarks.get(trans)) && prev, true)){
                return 3;
            //L2: for one M activating T with M--T-->M', there is a path t1,...,tn, with M'--t1,...,tn-->M
            }else if(activatingMarks.find(mark => this.pathExists(mark.nextMarks.get(trans), mark))){
                return 2;
            } else {
            //L1: if none of the other cases is correct
                return 1;
            }
        }
    }
    getMarksLeadingToTrans(activatingMarks){
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

    //checks if a Path from mark1 to mark2 exists
    pathExists(mark1, mark2){
        let visited = new Set();
        let toVisit = mark2.previous;
        while(toVisit.length != 0){
            let curMark = toVisit.pop();
            visited.add(curMark.index);
            if(curMark.index == mark1.index) return true;
            curMark.previous.forEach(prevMark => {
                if(!visited.has(prevMark.index) && !toVisit.includes(prevMark)){
                    toVisit.push(prevMark);
                }
            })
        }
        return false;

    }    

    loopExists(newLoop){
        for(let loop of this.loops){
            if(loop[0].index == newLoop[0].index && loop[1].index == newLoop[1].index) return true;
        }
        return false;
    }
    // less performant method to check for loops with more detailed result
    checkForLoops(startMarking) {
        let stack = [{marking: startMarking, explored: new Set()}];
        while (stack.length > 0) {
            let { marking, explored } = stack.pop();
            if (marking.nextMarks.size === 0) {
                continue;
            }
            for (let nextMarking of marking.nextMarks.values()) {
                if (explored.has(nextMarking.index) || nextMarking.index === marking.index) {
                    let newLoop = [marking, nextMarking];
                    if (!this.loopExists(newLoop)) {
                        this.loops.push(newLoop);
                    }
                } else {
                    let newExplored = new Set(explored);
                    newExplored.add(nextMarking.index);
                    stack.push({marking: nextMarking, explored: newExplored});
                }
            }
        }
    }
    
    analyseLoops(markings) {
        const length = markings.length;
         // Array to track the last update for each marking
        let lastUpdate = new Array(length).fill(0);
        // Array of sets to store potential loops for each marking
        let loopsMap = Array.from({length}, () => new Set());
        // Array to store previous markings for each current marking
        let previousMarks = [];
        this.loops = [];
        //Initial loop detection and setting up previous marking trackers
        markings.forEach(mark => {
            previousMarks.push(new Set([mark.index]))
            // Detecting loops from a marking to itself
            if([...mark.nextMarks.values()].includes(mark)){
                this.loops.push([mark, mark])
            }
        })
        // Main loop for detailed analysis of potential loops.
        for(let i = 0; i < markings.length; i++){
            // Iteration over each marking
            markings.forEach(mark => { 
                // Skips if it hasnt been updated in the last iteration
                if(lastUpdate[mark.index] >= i - 1){
                    // Iteration over all following markings
                    mark.nextMarks.forEach(next => {
                        let newPrevMarks = previousMarks[mark.index]
                        let oldPrevMarks = previousMarks[next.index]
                        // Previous markings are added to next marking, 
                            //if it does not start a loop
                        newPrevMarks.forEach(prevMarkIndex => {
                            if(!oldPrevMarks.has(prevMarkIndex) && 
                                !loopsMap[mark.index].has(next.index)){
                                lastUpdate[next.index] = i;
                                // Checks if a new loops is detected
                                if([...next.nextMarks.values()]
                                    .reduce((hasIndex, nextMark) => hasIndex || 
                                        nextMark.index == prevMarkIndex, false)){
                                    loopsMap[next.index].add(prevMarkIndex);
                                    this.loops.push([next, markings[prevMarkIndex]])
                                }
                                previousMarks[next.index].add(prevMarkIndex)
                            }
                        })
                    })
                }
            })
        }
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
    
    analyseComponents(places, transitions) {
        let components = [];
        let allNodes = new Set([...places, ...transitions]);
    
        for (let startNode of allNodes) {
            let visited = this.depthFirstSearch(startNode);
            components.push([...visited])
            visited.forEach(element => allNodes.delete(element))
        }
        return components;
    }
}