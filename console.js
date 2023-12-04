import { PetriNet } from "./PetriNet.js";

let state = {};
state.trans_id_list = [];
state.place_id_list = [];

state.trans_elements = [];
state.place_elements = [];
state.edge_elements = [];

export function addTrans(){
    let id = getSmallesUnusedID(state.trans_id_list);
    state.trans_elements.push(new ConsoleTrans(id, ""))
}
export function addPlace(){
    let id = getSmallesUnusedID(state.place_id_list);
    state.place_elements.push(new ConsolePlace(id, 0, 1));
}
export function addEdge(startIsTrans){
    state.edge_elements.push(new ConsoleEdge(0,0,1,startIsTrans));
}

export function loadConsole(places, transitions){
    clearConsole();
    transitions.forEach(trans => loadTransitionInConsole(trans))
    places.forEach(place => loadPlaceInConsole(place))
}

export function readConsole(){
    let petriNet = new PetriNet();
    state.trans_elements.forEach(trans_element => petriNet.addTrans(trans_element.id, trans_element.getLabel()));
    state.place_elements.forEach(place_element => {
        let[init_value, max_value] = place_element.getValues();
        petriNet.addPlace(place_element.id, init_value, max_value);
    })
    state.edge_elements.forEach(edge => {
        let [start_id, target_id, weight] = edge.getValues();
        petriNet.addEdge(start_id, target_id, weight, edge.startIsTrans);
    })
    return petriNet;

}

function clearConsole(){
    state.trans_elements = [];
    state.place_elements = [];
    state.edge_elements = [];
    document.getElementById("place_list").innerHTML = "";
    document.getElementById("edge_list").innerHTML = "";
    document.getElementById("trans_list").innerHTML = "";
}

function loadPlaceInConsole(place){
    state.place_id_list.push(place.id);
    state.place_elements.push(new ConsolePlace(place.id, place.init, place.max));
    place.outgoing.forEach(trans => 
        state.edge_elements.push(new ConsoleEdge(place.id,trans.id,place.outgoingWeights.get(trans),false)))
}

function loadTransitionInConsole(trans){
    state.trans_id_list.push(trans.id);
    state.trans_elements.push(new ConsoleTrans(trans.id, trans.label))
    trans.outgoing.forEach(place => 
        state.edge_elements.push(new ConsoleEdge(trans.id,place.id,trans.outgoingWeights.get(place),true)))

}
function getSmallesUnusedID(idList){
    for( let i = 0; i < idList.length; i++){
        if(!idList.includes(i)){
            idList.push(i);
            return i;
        }
    }
    idList.push(idList.length);
    return idList.length - 1;
}


class ConsoleTrans{
    constructor(id, label){
        this.id = id;
        this.input_element = ConsoleTrans.createTransElement(id, label);
    }
    getLabel(){
        return this.input_element.value;
    }
    static createTransElement(id, label){
        let translist = document.getElementById("trans_list");
    
        let form = document.createElement("form");
        form.classList.add("console_element");
        form.style.width = "250px";

        let id_wrap = createTextField("T" + id);
        id_wrap.classList.add("id_wrap");
        form.appendChild(id_wrap);

        form.appendChild(createTextField("Label:"));

        let input = createInputField(label, 100)
        form.appendChild(input);
        translist.appendChild(form);  
        
        function delete_function(){
            translist.removeChild(form);
            state.trans_id_list = state.trans_id_list.filter(trans_id => trans_id != id);
        }

        form.appendChild(createDeleteButton(delete_function))
        
        return input;
    }
}

class ConsolePlace{
    constructor(id, init, max){
        this.id = id;
        [this.input_init, this.input_max] = ConsolePlace.createPlaceElement(id, init, max);   
    }

    getValues(){
        return [this.input_init.value, this.input_max.value];
    }

    static createPlaceElement(id, init, max){
        state.place_id_list.push(id);
    
        let placeList = document.getElementById("place_list");
    
        let form = document.createElement("form");
        form.classList.add("console_element");
    
        let id_wrap = createTextField("P" + id);
        id_wrap.classList.add("id_wrap");
        form.appendChild(id_wrap);
        
        form.appendChild(createTextField("init:"));
        let input_init = createInputField(init, 20);
        form.appendChild(input_init);
    
        form.appendChild(createTextField("max:"));
        let input_max = createInputField(max, 20);
        form.appendChild(input_max);
        
        function delete_function(){
            placeList.removeChild(form);
            state.place_id_list = state.place_id_list.filter(place_id => place_id != id);
        }

        form.appendChild(createDeleteButton(delete_function))

        placeList.appendChild(form);
        
        return [input_init, input_max];
    }
}

class ConsoleEdge{
    constructor(start_id_number, target_id_number, weight, startIsTrans){
        this.start_id_number = start_id_number;
        this.target_id_number = target_id_number;
        this.startIsTrans = startIsTrans;
        [this.input_start, this.input_target, this.input_weight] = ConsoleEdge.createEdgeElement(
            start_id_number,target_id_number, weight, startIsTrans);
    }

    getValues(){
        return [parseInt(this.input_start.value), parseInt(this.input_target.value), parseInt(this.input_weight.value)];
    }

    static createEdgeElement(start_id_number, target_id_number, weight, startIsTrans){
        let edgelist = document.getElementById("edge_list");
    
        let form = document.createElement("form");
        form.classList.add("console_element");
    
        //text and input for the start and end id number
        form.appendChild(createTextField(startIsTrans ? "T" : "P"));
        let input_start = createInputField(start_id_number, 20);
        form.appendChild(input_start);

        form.appendChild(createTextField("->"));

        form.appendChild(createTextField(startIsTrans ? "P" : "T"));
        let input_target = createInputField(target_id_number, 20);
        form.appendChild(input_target);
    
        //text and input for the weights
        form.appendChild(createTextField("weight:"));
        let input_weight = createInputField(weight, 20);
        form.appendChild(input_weight);
        
        function delete_function(){
            edgelist.removeChild(form);
        }

        form.appendChild(createDeleteButton(delete_function))
    
        edgelist.appendChild(form); 

        return [input_start, input_target, input_weight];
    }
}

function createInputField(value, width){
    let input = document.createElement("input");
    input.value = value;
    input.style.width = width + "px";
    return input;

}

function createTextField(text){
    let wrap = document.createElement("div");
    let text_field = document.createTextNode(text);
    wrap.append(text_field);
    return wrap;
}

function createDeleteButton(delete_function){
    let button = document.createElement("button");
    let text_field = document.createTextNode("X");
    button.append(text_field);
    button.style.float = "right";
    button.onclick = delete_function;
    return button;
}