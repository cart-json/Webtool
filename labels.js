import { highlightTransition } from "./Controller.js";

let state = {}
export function vizTransitionLabels(transitions){
    state.id_map = new Map();
    let labels = document.getElementById("labels");
    labels.innerHTML = "";
    transitions.forEach(trans => {
        let id_text_wrap = document.createElement("div");
        id_text_wrap.innerHTML = "T" + trans.id + " ... " + trans.label;
        id_text_wrap.onclick = function(){highlightTransition(trans.id);};
        id_text_wrap.classList.add('pointer');
        labels.appendChild(id_text_wrap);
        state.id_map.set(trans.id, id_text_wrap)
    })
}

export function highlightTransLabel(id, prev_id){
    if(prev_id != -1) {unhighlight(prev_id)}
    highlight(id)
}

function highlight(id){
    let node = state.id_map.get(id);
    if(node){
        node.style.backgroundColor = "red";
    }
}

function unhighlight(id){
    let node = state.id_map.get(id);
    if(node){
        node.style.backgroundColor = "white";
    }
}