export class Analysis {
    constructor(places, transitions,type){
        this.places = places;
        this.transitions = transitions;
        this.type = type;
    }
    analyse(){
        this.analyseCoverability(this.places,this.transitions)
        let markings = this.type ? this.reachabilityAnaPT(this.places, this.transitions) : this.reachabilityAnaEC(this.places, this.transitions)
        let liveness = this.type ? this.analyseLivenessPT() : this.analyseLivenessEC()
        return {markings: markings,
            deadlocks: this.deadlocks(markings),
            boundedness: this.analyzeBoundedness(markings),
            soundness: this.analyzeSoundness(this.places,this.transitions),
            strSoundness: this.analyzeStrSoundness([...this.places, ...this.transitions])}
    }

    

    reachabilityAnaPT(places, transitions){

        var markings = []
        var markingQueue = []

        var initialMarkingArr = []
        for(var n = 0; n < places.length; n++){
            initialMarkingArr[n] = places[n].init;
        };
        var initialMarking = {id: "M0", markingArr:initialMarkingArr, nextMarks:new Map(), previous:[]}
        markingQueue.push(initialMarking)
        markings[0] = initialMarking

        var counter = 1

        while(markingQueue.length > 0){
            var marking = markingQueue.shift();
            
            for(var n = 0; n < places.length; n++){
                places[n].init = marking.markingArr[n];
            };
            
            var nextMarks = transitions.filter(trans => (trans.incoming.reduce((active, place)=>active && place.init != 0,true)))
            nextMarks.forEach(trans => {
                trans.incoming.forEach(place => place.init-=1)
                trans.outgoing.forEach(place => place.init++)
                var newMarkingArr = []
                for(var n = 0; n < places.length; n++){
                    newMarkingArr[n] = places[n].init;
                };
                var existMarking = markings.filter(marking => marking.markingArr.every((elem, index) => elem === newMarkingArr[index]))
                if(existMarking.length > 0){
                    marking.nextMarks.set(trans,existMarking[0])
                    existMarking[0].previous.push(marking)
                } else {
                    var newMarking = {id: "M" + counter, markingArr:newMarkingArr, nextMarks:new Map(), index: counter, previous:[marking]}
                    marking.nextMarks.set(trans,newMarking)
                    markingQueue.push(newMarking)
                    markings[counter] = newMarking
                    counter++;
                }
                for(var n = 0; n < places.length; n++){
                    places[n].init = marking.markingArr[n];
                };
            })
            if(counter > 100) break;
        }
        for(var n = 0; n < places.length; n++){
            places[n].init = marking.markingArr[n];
        };
        return markings;
    }

    

    reachabilityAnaEC(places, transitions){

        var markings = []
        var markingQueue = []

        var initialMarkingArr = []
        for(var n = 0; n < places.length; n++){
            initialMarkingArr[n] = places[n].init;
        };
        var initialMarking = {id: "M0", markingArr:initialMarkingArr, nextMarks:new Map(), previous:[]}
        markingQueue.push(initialMarking)
        markings[0] = initialMarking

        var counter = 1

        while(markingQueue.length > 0){
            var marking = markingQueue.shift();
            
            for(var n = 0; n < places.length; n++){
                places[n].init = marking.markingArr[n];
            };
            
            var nextMarks = transitions.filter(trans => (trans.incoming
                .reduce((active, place)=>active && place.init != 0,true) && trans.outgoing
                .reduce((active,place)=> active && (place.init == 0 || place.outgoing.includes(trans)), true)))
            nextMarks.forEach(trans => {
                trans.incoming.forEach(place => place.init-=1)
                trans.outgoing.forEach(place => place.init++)
                var newMarkingArr = []
                for(var n = 0; n < places.length; n++){
                    newMarkingArr[n] = places[n].init;
                };
                var existMarking = markings.filter(marking => marking.markingArr.every((elem, index) => elem === newMarkingArr[index]))
                if(existMarking.length > 0){
                    marking.nextMarks.set(trans,existMarking[0])
                    existMarking[0].previous.push(marking)
                } else {
                    var newMarking = {id: "M" + counter, markingArr:newMarkingArr, nextMarks:new Map(), index: counter, previous:[marking]}
                    marking.nextMarks.set(trans,newMarking)
                    markingQueue.push(newMarking)
                    markings[counter] = newMarking
                    counter++;
                }
                for(var n = 0; n < places.length; n++){
                    places[n].init = marking.markingArr[n];
                };
            })
        }
        for(var n = 0; n < places.length; n++){
            places[n].init = marking.markingArr[n];
        };
        return markings;
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
        let markings = this.type ? this.reachabilityAnaPT(places,transitions) : this.reachabilityAnaEC(places,transitions);

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

    analyseCoverability(places, transitions){
        let init = places[0].init
        console.log(init)

        let initialMarkingArr = places.map(item => item.init);
        let explored = [initialMarkingArr];
        let toExplore = [initialMarkingArr];
    
        while (toExplore.length > 0) {
            let currentMarking = toExplore.pop();
    
            for (let transition of transitions) {
                if (this.canFire(transition, currentMarking)) {
                    let newMarking = this.fireTransition(transition, currentMarking);
    
                    let knownMarking = explored.find(m => m.every((value, index) => value <= newMarking[index]));
                      
                    if (knownMarking) {
                        for (let i = 0; i < knownMarking.length; i++) {
                            if (knownMarking[i] < newMarking[i]) {
                                newMarking[i] = Infinity;
                            }
                        }
                    } if (!toExplore.some(m => m.every((value, index) => value === newMarking[index])) &&
                                !explored.some(m => m.every((value, index) => value === newMarking[index]))) {
                        toExplore.push(newMarking);
                        explored.push(newMarking);
                    }
                }
            }
        }
        console.log(explored)
        return explored;

    }
    canFire(transition, markingArr) {
        for (let place of transition.incoming) {
            if (markingArr[place.index] < 1) return false;
        }
        return true;
    }
    fireTransition(transition, markingArr) {
        let newMarking = markingArr.slice();
    
        for (let place of transition.incoming) {
            newMarking[place.index]--;
        }
        for (let place of transition.outgoing) {
            newMarking[place.index]++;
        }
    
        return newMarking;
    }

    covers(coveringMark, comparingMark){
        let result = false;
        for(let i = 0; i < coveringMark.length; i++){
            if(coveringMark[i]<comparingMark[i]){
                return false;
            } else if(coveringMark[i]>comparingMark[i]){
                result = true;
            }
        }
        return result;
    }
    

    analyseLivenessPT(transitions, markings){

    //for each trans:
        //find all markings activating T
        //if there are none --> L0
        //check for each marking if there is a following marking activating T
        return null;

    }

    analyseLivenessEC(transitions, markings){

    //for each trans:
        //find all markings activating T
        //if there are none --> L0
        //check for each marking if there is a following marking activating T
        return null;

    }
}