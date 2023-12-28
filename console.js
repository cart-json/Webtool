import { PetriNet } from "./PetriNet.js";
import { analyzeInput } from "./Controller.js";
let state = {};
state.trans_id_list = [];
state.place_id_list = [];

state.trans_elements = [];
state.place_elements = [];
state.edge_elements = [];

state.edge_id = 0;
state.isPTNet = document.getElementById("netType").checked;

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
    let capacity = state.isPTNet ? Infinity : 1;
    state.place_id_list.push(id);
    state.place_elements.push(new ConsolePlace(id, 0, capacity));
}
export function addEdge(startIsTrans){
    state.edge_elements.push(new ConsoleEdge(0,0,1,startIsTrans));
}

export function loadConsole(places, transitions, isPTNet){
    state.isPTNet = isPTNet;
    clearConsole();
    transitions.forEach(trans => loadTransitionInConsole(trans))
    places.forEach(place => loadPlaceInConsole(place))
}

export function readConsole(){
    let petriNet = new PetriNet(state.isPTNet);
    state.trans_elements.forEach(trans_element => petriNet.addTrans(trans_element.id, trans_element.getLabel()));
    state.place_elements.forEach(place_element => {
        let[init_value, capacity_value] = place_element.getValues();
        petriNet.addPlace(place_element.id, init_value, capacity_value);
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
    state.place_elements.push(new ConsolePlace(place.id, place.init, place.capacity));
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
    constructor(id, init, capacity){
        this.id = id;
        [this.input_init, this.input_capacity, this.input_bounded] = ConsolePlace.createPlaceElement(id, init, capacity);   
        this.input_init.focus();
        this.input_init.select();
    }

    getValues(){
        let weight = 1;
        if(state.isPTNet){
            //if the 'bounded' box is checked, the input value will be returned
            //if there is no input field oder the element hasnt been loaded into the console, Infinity is returned
            if(this.input_capacity && this.input_bounded.checked){
                weight = this.input_capacity.value;
            } else {
                weight = Infinity;
            }
        }
        return [this.input_init.value, weight]
    }

    static createPlaceElement(id, init, capacity){
        state.place_id_list.push(id);
    
        let placeList = document.getElementById("place_list");
    
        let form = document.createElement("form");
        form.classList.add("console_element");
        form.style.width = "250px";
    
        let id_wrap = createTextField("P" + id);
        id_wrap.classList.add("id_wrap");
        form.appendChild(id_wrap);
        
        form.appendChild(createTextField("init:"));
        let input_init = createNumberInputField(init, 20);
        form.appendChild(input_init);


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

        let input_capacity;
        let input_bounded;

        if(state.isPTNet){
            input_capacity = createNumberInputField(capacity, 20);
            let input_capacity_text = createTextField("max:");

            function handleCheckboxChange(event){
                const checkbox = event.target;
                if(checkbox.checked){
                    form.appendChild(input_capacity_text);
                    form.appendChild(input_capacity);
                } else {
                    input_capacity.remove();
                    input_capacity_text.remove();
                }
            }

            let isBounded = capacity !== Infinity;
    
            form.appendChild(createTextField("bounded:"));
            input_bounded = document.createElement("input");
            input_bounded.type = "checkbox";
            input_bounded.checked = isBounded;
            input_bounded.style.width = 15 + "px";
            input_bounded.addEventListener("change", handleCheckboxChange);
            form.appendChild(input_bounded);
            if(isBounded){
                form.appendChild(input_capacity_text);
                form.appendChild(input_capacity);
            }
            input_capacity.addEventListener('keypress', handleEnterPressed);
        }

        input_init.addEventListener('keypress', handleEnterPressed);
        
        function delete_function(){
            placeList.removeChild(form);
            state.place_elements = state.place_elements.filter(place_element => place_element.id != id);
            state.place_id_list = state.place_id_list.filter(place_id => place_id != id);
        }

        form.appendChild(createDeleteButton(delete_function))

        placeList.appendChild(form);
        
        return [input_init, input_capacity, input_bounded];
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
        let weight = 1;
        if(state.PetriNet){
            weight = this.input_weight.value;
        }
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

        let input_weight = createNumberInputField(weight, 20);
        if(state.isPTNet){
            //text and input for the weights
            form.appendChild(createTextField("weight:"));
            form.appendChild(input_weight);
        }

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

export function reloadConsole(isPTNet){
    let petriNet = readConsole();
    loadConsole(petriNet.places, petriNet.transitions, isPTNet)
}
document.getElementById("add_trans").onclick = function(){
    addTrans();
}

document.getElementById("add_place").onclick = function(){
    addPlace();
}

document.getElementById("add_edgeT").onclick = function(){
    addEdge(true);
}
document.getElementById("add_edgeP").onclick = function(){
    addEdge(false);
}