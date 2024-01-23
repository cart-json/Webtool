import { unhighlightRowByID, highlightRowByID, highlightCellsWithValue, unhighlightCellsWithValue } from "./marking-table.js";
import { highlightNode, unhighlightNode } from "./libraries/visulization.js";

//lists all properties
export function vizProperties(anaResult, uncoveredMarkings){
    let lifenessString;
    if(anaResult.liveness.reduce((prev, liveness) => prev && liveness == 4, true)){
        lifenessString = "strong-live"
    } else if (anaResult.liveness.reduce((prev, liveness) => prev || liveness == 4, false)){
        lifenessString = "quasi-live";
    } else {
        let minimalLiveness = anaResult.liveness.reduce((prev, liveness) => prev > liveness ? liveness : prev, 4);
        lifenessString = "L" + minimalLiveness + "-live";
    }
    let props = document.getElementById("props");
    props.innerHTML = "";
    props.appendChild(createDeadlockLine(anaResult.deadlocks, uncoveredMarkings))
    props.appendChild(createBoundednessString(anaResult.boundedness))
    props.appendChild(createSoundnessString(anaResult.soundness, anaResult.unsoundMarkings))
    props.appendChild(createStrSoundnessString(anaResult.strSoundness, anaResult.unsoundNodes))
    props.appendChild(document.createTextNode("liveness: " +  lifenessString));
    props.appendChild(document.createElement("br"))
}

function createDeadlockLine(deadlockList, uncoveredMarkings){
    let line = document.createElement("div")
    
    const paragraphContainer = document.createElement("div");
    paragraphContainer.style.display = "flex"; 
    let title_paragraph = document.createElement("p");
    title_paragraph.innerText = "deadlocks: ";
    title_paragraph.addEventListener("mouseover", function(){
        deadlockList.forEach(mark => highlightRowByID(mark.id));
    })
    title_paragraph.addEventListener("mouseout", function(){
        deadlockList.forEach(mark => unhighlightRowByID(mark.id));
    })

    paragraphContainer.appendChild(title_paragraph);

    deadlockList.forEach(mark => {
        if(uncoveredMarkings.has(mark.id)){
            let deadlockParagraph = document.createElement("p")
            deadlockParagraph.innerText = mark.id + " "
            deadlockParagraph.addEventListener("mouseover", function(){highlightRowByID(mark.id)})
            deadlockParagraph.addEventListener("mouseout", function(){unhighlightRowByID(mark.id)})
            deadlockParagraph.style.cursor = "pointer";
            deadlockParagraph.style.marginLeft = "5px";
            paragraphContainer.appendChild(deadlockParagraph)
        }
    })
    line.appendChild(paragraphContainer)
    return line;
}

function createBoundednessString(boundedness){
    let paragraph = document.createElement("p")
    paragraph.innerText = "boundedness: " + boundedness
    paragraph.addEventListener("mouseover", function(){highlightCellsWithValue(boundedness)})
    paragraph.addEventListener("mouseout", function(){unhighlightCellsWithValue(boundedness)})
    paragraph.style.cursor = "pointer";
    return paragraph;
}

function createSoundnessString(soundness, unsoundMarkings){
    let paragraph = document.createElement("p")
    paragraph.innerText = "soundness: " + soundness
    paragraph.addEventListener("mouseover", function(){
        unsoundMarkings.forEach(mark => highlightRowByID(mark.id))
    })
    paragraph.addEventListener("mouseout", function(){
        unsoundMarkings.forEach(mark => unhighlightRowByID(mark.id))})
    paragraph.style.cursor = "pointer";
    return paragraph;
}

function createStrSoundnessString(strSoundness, unsoundNodes){
    let paragraph = document.createElement("p")
    paragraph.innerText = "structural soundness: " + strSoundness
    paragraph.addEventListener("mouseover", function(){
        unsoundNodes.forEach(node => highlightNode(node.id_text))
    })
    paragraph.addEventListener("mouseout", function(){
        unsoundNodes.forEach(node => unhighlightNode(node.id_text))})
    paragraph.style.cursor = "pointer";
    return paragraph;
}