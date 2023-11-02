export class Transition{

    constructor(id, label, index){
        this.id = id;
        this.label = label;
        this.index = index;
        this.incoming = []
        this.outgoing = []
        this.incomingWeights = new Map()
        this.outgoingWeights = new Map()
        this.type = "trans"
    }

    addOutgoing(place, weight){
        this.outgoing.push(place)
        this.outgoingWeights.set(place, weight)
    }

    addIncoming(place, weight){
        this.incoming.push(place)
        this.incomingWeights.set(place, weight)
    }
}
export class Place{

    constructor(id, init, index){
        this.id = id;
        this.init = init;
        this.index = index;
        this.incoming = [];
        this.outgoing = [];
        this.incomingWeights = new Map();
        this.outgoingWeights = new Map();
        this.type = "place"
    }
    addOutgoing(trans, weight){
        this.outgoing.push(trans)
        this.outgoingWeights.set(trans, weight)
    }

    addIncoming(trans, weight){
        this.incoming.push(trans)
        this.incomingWeights.set(trans, weight)
    }
}