export class PetriNet{
    constructor(){
        this.transitions = [];
        this.places = [];
        this.placeIdMap = new Map();
        this.transIdMap = new Map();
        this.isPTNet = false;
    }

    placeExists(id){
        if(this.placeIdMap.has(id)){
            return true;
        }
        return false;
    }

    transExists(id){
        if(this.transIdMap.has(id)){
            return true;
        }
        return false;
    }

    addTrans(id, label){
        id = parseInt(id);
        let transition = new Transition(id, label, this.transitions.length);
        this.transitions.push(transition);
        this.transIdMap.set(id, transition);
        return transition;
    }

    addPlace(id, init, max){
        id = parseInt(id);
        init = parseInt(init);
        max = parseInt(max);
        if(max != 1){
            this.isPTNet = true;
        }
        let place = new Place(id,init,max,this.places.length);
        this.places.push(place);
        this.placeIdMap.set(id, place);
        return place;
    }

    addEdge(start_id_number, target_id_number, weight, startIsTrans){
        start_id_number = parseInt(start_id_number);
        target_id_number = parseInt(target_id_number);
        weight = parseInt(weight);
        if(weight != 1){
            this.isPTNet = true;
        }
        let start;
        let target;
        if(startIsTrans){
            start = this.transIdMap.get(start_id_number);
            target = this. placeIdMap.get(target_id_number);
            if(!start){
                start = this.addTrans(start_id_number, "")
            } 
            if (!target) {
                target = this.addPlace(target_id_number, 0, 1)
            }
        } else {
            start = this.placeIdMap.get(start_id_number);
            target = this. transIdMap.get(target_id_number);
            if(!start){
                start = this.addPlace(start_id_number, 0, 1)
            } 
            if (!target) {
                target = this.addTrans(target_id_number, "")
            }
        }
        start.addOutgoing(target, weight);
        target.addIncoming(start, weight);
    }
}

export class Transition{
    constructor(id, label, index){
        this.id_text = "T" + id;
        this.label = label;
        this.index = index;
        this.incoming = [];
        this.outgoing = [];
        this.incomingWeights = new Map();
        this.outgoingWeights = new Map();
        this.type = "trans";
        this.id = id;
        this.isTrans = true;
    }

    addOutgoing(place, weight){
        this.outgoing.push(place);
        this.outgoingWeights.set(place, weight);
    }

    addIncoming(place, weight){
        this.incoming.push(place);
        this.incomingWeights.set(place, weight);
    }
    
    getConnectedNodes() {
        return [...this.outgoing, ...this.incoming];
    }
    

}
export class Place{

    constructor(id, init, max, index){
        this.id_text = "P" + id;
        this.init = init;
        this.index = index;
        this.incoming = [];
        this.outgoing = [];
        this.incomingWeights = new Map();
        this.outgoingWeights = new Map();
        this.type = "place";
        this.id = id;
        this.isTrans = false;
        this.max = max;
    }
    addOutgoing(trans, weight){
        this.outgoing.push(trans)
        this.outgoingWeights.set(trans, weight)
    }

    addIncoming(trans, weight){
        this.incoming.push(trans)
        this.incomingWeights.set(trans, weight)
    }

    getConnectedNodes() {
        return [...this.outgoing, ...this.incoming];
    }
}