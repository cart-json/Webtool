export class PetriNet{
    constructor(isPTNet){
        this.transitions = []; // Stores all transitions in the Petri Net
        this.places = []; // Stores all places in the Petri Net
        this.placeIdMap = new Map(); // Maps place IDs to their respective objects
        this.transIdMap = new Map(); // Maps transition IDs to their respective objects
        this.isPTNet = isPTNet; // Indicates if the net is a PT net (true) or an EC net (false)

        this.placeNameIdMap = new Map(); // Maps the name of a place in a .tpn file to its id
        this.errorStack = []; // Collects issues and inconsistencies while creating the  to be shown to the user
    }

    // Checks if a place with a given ID exists in the Petri Net
    placeExists(id){
        if(this.placeIdMap.has(parseInt(id))){
            return true;
        }
        return false;
    }

    getUnusedPlaceID(){
        for(let i = 0; i < 100; i++){
            if(this.places.reduce((prev, place) => place.id != i && prev, true)) 
                return i;
        } 
        return -1;
    }

    // Checks if a transition with a given ID exists in the Petri Net
    transExists(id){
        if(this.transIdMap.has(parseInt(id))){
            return true;
        }
        return false;
    }

    // Creates and adds a new Transition object to the Petri Net
    addTrans(id, label){
        id = parseInt(id);

        // Validate that id is a non-negative integer and smaller than 100
        if (isNaN(id) || id < 0 || id > 99) {
            return null;
        }
        let transition = new Transition(id, label, this.transitions.length);
        this.transitions.push(transition);
        this.transIdMap.set(id, transition);
        return transition;
    }

    getUnusedTransID(){
        for(let i = 0; i < 100; i++){
            if(this.transitions.reduce((prev, trans) => trans.id != i && prev, true)) 
                return i;
        } 
        return -1;
    }

    // Creates and adds a new Place object to the Petri Net
    addPlace(id, init, capacity){
        id = parseInt(id);
        init = parseInt(init);
        if(capacity !== Infinity) capacity = parseInt(capacity);

        // Validate that id is a non-negative integer
        if (isNaN(id) || id < 0 || id > 99) {
            return null;
        }
        // Validate that init is a non-negative integer
        if (isNaN(init) || init < 0) {
            init = 0;
        }

        // Validate that capacity is a non-negative integer or Infinity
        if ((capacity !== Infinity && isNaN(capacity)) || capacity < 0) {
            capacity = this.isPTNet ? Infinity : 1;
        } else if (capacity > 9 && capacity !== Infinity){
            capacity = 9;
        }
        if(init > capacity){
            init = capacity;
        }
        let place = new Place(id,init,capacity,this.places.length);
        this.places.push(place);
        this.placeIdMap.set(id, place);
        return place;
    }

    // Adds an edge between a place and a transition
    addEdge(start_id, target_id, weight, startIsTrans){
        start_id = parseInt(start_id);
        target_id = parseInt(target_id);
        weight = parseInt(weight);

        // Validate that the ids are a non-negative integers and smaller than 100
        if (isNaN(start_id) || start_id < 0 || start_id > 99 ||
            isNaN(target_id) || target_id < 0 || target_id > 99) {
            return null;
        }

        // Validate that weight is a non-negative integer or Infinity
        if (isNaN(weight) || weight <= 0) {
            weight = 1;
        } else if (weight > 9){
            weight = 9;
        }

        let start, target;


        // Connecting transitions and places
        if(startIsTrans){
            start = this.transIdMap.get(start_id);
            target = this.placeIdMap.get(target_id);
            if(!start){
                start = this.addTrans(start_id, "")
            } 
            if (!target) {
                target = this.addPlace(target_id, 0, this.isPTNet ? Infinity : 1)
            }
        } else {
            start = this.placeIdMap.get(start_id);
            target = this.transIdMap.get(target_id);
            if(!start){
                start = this.addPlace(start_id, 0, this.isPTNet ? Infinity : 1)
            } 
            if (!target) {
                target = this.addTrans(target_id, "")
            }
        }

        // Setting up the connections
        start.addOutgoing(target, weight);
        target.addIncoming(start, weight);
    }

    sortElements(){
        this.transitions = this.transitions.sort((trans1, trans2) => trans1.id > trans2.id);
        for(let i = 0; i < this.transitions.length; i++){
            this.transitions[i].index = i;
        }
        this.places = this.places.sort((place1, place2) => place1.id > place2.id);
        for(let i = 0; i < this.places.length; i++){
            this.places[i].index = i;
        }
    }
}

export class Transition{
    constructor(id, label, index){
        this.id_text = "T" + id; // Textual representation of the transition's ID
        this.label = label; // Label of the transition
        this.index = index; // Index in the Petri Net
        this.incoming = []; // Stores incoming places
        this.outgoing = []; // Stores outgoing places
        this.incomingWeights = new Map(); // Maps incoming places to their weights
        this.outgoingWeights = new Map(); // Maps outgoing places to their weights
        this.id = id; // Numeric ID of the transition
        this.isTrans = true; // Boolean flag (always true for transitions)
    }

    // Adds an outgoing connection from this transition to a place
    addOutgoing(place, weight){
        this.outgoing.push(place);
        this.outgoingWeights.set(place, weight);
    }

    // Adds an incoming connection to this transition from a place
    addIncoming(place, weight){
        this.incoming.push(place);
        this.incomingWeights.set(place, weight);
    }
    
    // Returns all nodes (places) connected to this transition
    getConnectedNodes() {
        return [...this.outgoing, ...this.incoming];
    }
    

}
export class Place{

    constructor(id, init, capacity, index){
        this.id_text = "P" + id; // Textual representation of the place's ID
        this.init = init; // Initial marking of the place
        this.capacity = capacity; // Maximum capacity of the place (Infinity if unlimited)
        this.index = index; // Index in the Petri Net
        this.incoming = []; // Stores incoming transitions
        this.outgoing = []; // Stores outgoing transitions
        this.incomingWeights = new Map(); // Maps incoming transitions to their weights
        this.outgoingWeights = new Map(); // Maps outgoing transitions to their weights
        this.id = id; // Numeric ID of the place
        this.isTrans = false; // Boolean flag (always false for places)
    }

    // Adds an outgoing connection from this place to a transition
    addOutgoing(trans, weight){
        this.outgoing.push(trans)
        this.outgoingWeights.set(trans, weight)
    }

    // Adds an incoming connection to this place from a transition
    addIncoming(trans, weight){
        this.incoming.push(trans)
        this.incomingWeights.set(trans, weight)
    }

    // Returns all nodes (transitions) connected to this place
    getConnectedNodes() {
        return [...this.outgoing, ...this.incoming];
    }
}