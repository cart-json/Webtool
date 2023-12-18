import { PetriNet } from "./PetriNet.js";
import { analyzeInput } from "./Controller.js";
let state = {};
state.trans_id_list = [];
state.place_id_list = [];

state.trans_elements = [];
state.place_elements = [];
state.edge_elements = [];

state.edge_id = 0;

export function addTrans(id){
    if(!id){
        id = getSmallesUnusedID(state.trans_id_list);
    }
    state.trans_id_list.push(id);
    state.trans_elements.push(new ConsoleTrans(id, ""))
}
export function addPlace(id){
    if(!id){
        id = getSmallesUnusedID(state.place_id_list);
    }
    state.place_id_list.push(id);
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
    //console.log(state.trans_elements);
    //console.log(state.place_elements);
    return petriNet;
}

export function clearConsole(){
    state.trans_elements = [];
    state.place_elements = [];
    state.edge_elements = [];
    state.trans_id_list = [];
    state.place_id_list = [];
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
    return idList.length;
}

class ConsoleTrans{
    constructor(id, label){
        this.id = id;
        this.highlighted = false;
        [this.input_element, this.element] = ConsoleTrans.createTransElement(id, label);
        this.input_element.focus();
        this.input_element.select();
    }
    getLabel(){
        return this.input_element.value;
    }

    highlightIfHasId(id){
        if(this.id == id){
            this.highlight();
        } else if(this.highlighted){
            this.unhighlight();
        }
    }

    highlight(){
        this.element.style.backgroundColor = "red";
        this.highlighted = true;
    }
    unhighlight(){
        this.element.style.backgroundColor = "lightgray";
        this.highlighted = false;
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
        
        function handleEnterPressed(event){
            if(event.key === "Enter"){
                event.preventDefault();
                if(event.ctrlKey){
                    analyzeInput(readConsole());
                } else {
                    addTrans();
                }
            }
        }

        input.addEventListener('keypress', handleEnterPressed);  
        
        function delete_function(){
            translist.removeChild(form);
            state.trans_elements = state.trans_elements.filter(trans_element => trans_element.id != id);
            state.trans_id_list = state.trans_id_list.filter(trans_id => trans_id != id);
        }

        form.appendChild(createDeleteButton(delete_function))
        
        return [input, form];
    }
}

class ConsolePlace{
    constructor(id, init, max){
        this.id = id;
        [this.input_init, this.input_max] = ConsolePlace.createPlaceElement(id, init, max);   
        this.input_init.focus();
        this.input_init.select();
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
        let input_init = createNumberInputField(init, 20);
        form.appendChild(input_init);
    
        form.appendChild(createTextField("max:"));
        let input_max = createNumberInputField(max, 20);
        form.appendChild(input_max);

        function handleEnterPressed(event){
            if(event.key === "Enter"){
                event.preventDefault();
                if(event.ctrlKey){
                    analyzeInput(readConsole());
                } else {
                addPlace();
                }
            }
        }

        input_init.addEventListener('keypress', handleEnterPressed);
        input_max.addEventListener('keypress', handleEnterPressed);
        
        function delete_function(){
            placeList.removeChild(form);
            state.place_elements = state.place_elements.filter(place_element => place_element.id != id);
            state.place_id_list = state.place_id_list.filter(place_id => place_id != id);
        }

        form.appendChild(createDeleteButton(delete_function))

        placeList.appendChild(form);
        
        return [input_init, input_max];
    }
}

class ConsoleEdge{
    constructor(start_id, target_id, weight, startIsTrans){
        this.start_id = start_id;
        this.target_id = target_id;
        this.startIsTrans = startIsTrans;
        this.id = state.edge_id;
        state.edge_id++;
        this.highlighted = false;
        [this.input_start, this.input_target, this.input_weight, this.element] = ConsoleEdge.createEdgeElement(
            start_id, target_id, weight, startIsTrans, this.id);
        this.input_start.focus();
        this.input_start.select();
    }

    getValues(){
        this.start_id = this.input_start.value;
        this.target_id = this.input_target.value;
        return [parseInt(this.input_start.value), parseInt(this.input_target.value), parseInt(this.input_weight.value)];
    }

    highlightIfContainsTrans(id){
        if(this.startIsTrans){
            if(this.input_start.value == id){
                this.highlight();
                return true;
            }
        } else {
            if(this.input_target.value == id){
                this.highlight();
                return true;
            }
        }
        if(this.highlighted){
            this.unhighlight();
        }
        return false;
    }

    highlight(){
        this.element.style.backgroundColor = "red";
        this.highlighted = true;
    }

    unhighlight(){
        this.element.style.backgroundColor = "lightgray";
        this.highlighted = false;
    }

    static createEdgeElement(start_id, target_id, weight, startIsTrans, id){

        let edgelist = document.getElementById("edge_list");
    
        let form = document.createElement("form");
        form.classList.add("console_element");
    
        //text and input for the start and end id number
        form.appendChild(createTextField(startIsTrans ? "T" : "P"));
        let input_start = createNumberInputField(start_id, 20);
        form.appendChild(input_start);

        form.appendChild(createTextField("->"));

        form.appendChild(createTextField(startIsTrans ? "P" : "T"));
        let input_target = createNumberInputField(target_id, 20);
        form.appendChild(input_target);
    
        //text and input for the weights
        form.appendChild(createTextField("weight:"));
        let input_weight = createNumberInputField(weight, 20);
        form.appendChild(input_weight);

        function load_edge(){
            let input_start_id = parseInt(input_start.value)
            let input_target_id = parseInt(input_target.value)
            if(startIsTrans){
                if(!state.place_id_list.includes(input_target_id)){
                    addPlace(input_target_id);
                }
                if(!state.trans_id_list.includes(input_start_id)){
                    addTrans(input_start_id);
                }
            } else {
                if(!state.place_id_list.includes(input_start_id)){
                    addPlace(input_start_id);
                }
                if(!state.trans_id_list.includes(input_target_id)){
                    addTrans(input_target_id);
                }
            }            
        }

        function handleEnterPressed(event){
            if(event.key === "Enter"){
                event.preventDefault();
                if(event.ctrlKey){
                    analyzeInput(readConsole());
                } else {
                    load_edge();
                }
            }
        }

        input_start.addEventListener('keypress', handleEnterPressed);
        input_target.addEventListener('keypress', handleEnterPressed);
        input_weight.addEventListener('keypress', handleEnterPressed);
        
        function delete_function(){
            edgelist.removeChild(form);
            state.edge_elements = state.edge_elements.filter(edge => edge.id != id);
        }

        form.appendChild(createDeleteButton(delete_function))
    
        edgelist.appendChild(form); 

        return [input_start, input_target, input_weight, form];
    }
}

function createInputField(value, width){
    let input = document.createElement("input");
    input.value = value;
    input.style.width = width + "px";
    return input;
}

function createNumberInputField(value, width){
    let input = createInputField(value, width);
    input.addEventListener('input', function(){
        let value = parseInt(this.value)

        if(isNaN(value) || value < 0){
            this.value = '';
        } else if(value > 99){
            this.value = 99;
        }
    })
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

export function highlightTransConsole(id, prev_id){
    state.edge_elements.forEach(edge_element => edge_element.highlightIfContainsTrans(id));
    state.trans_elements.forEach(trans_element => trans_element.highlightIfHasId(id));

}