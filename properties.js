import { unhighlightRowByID, highlightRowByID } from "./marking-table.js";

export function vizProperties(anaResult, uncoveredMarkings){
    let props = document.getElementById("props");
    props.innerHTML = "";
    props.appendChild(createDeadlockLine(anaResult.deadlocks, uncoveredMarkings))
    props.appendChild(document.createTextNode("boundedness: " + anaResult.boundedness))
    props.appendChild(document.createElement("br"))
    props.appendChild(document.createTextNode("soundness: " + anaResult.soundness))
    props.appendChild(document.createElement("br"))
    props.appendChild(document.createTextNode("strSoundness: " + anaResult.strSoundness))
    props.appendChild(document.createElement("br"))

}

function createDeadlockLine(deadlockList, uncoveredMarkings){
    let line = document.createElement("div")
    
    const paragraphContainer = document.createElement("div");
    paragraphContainer.style.display = "flex"; 
    paragraphContainer.appendChild(document.createTextNode("deadlocks: "))

    deadlockList.forEach(mark => {
        if(uncoveredMarkings.has(mark.id)){
            let deadlockParagraph = document.createElement("p")
            deadlockParagraph.innerText = mark.id
            deadlockParagraph.addEventListener("mouseover", function(){highlightRowByID(mark.id)})
            deadlockParagraph.addEventListener("mouseout", function(){unhighlightRowByID(mark.id)})
            deadlockParagraph.style.cursor = "pointer";
            paragraphContainer.appendChild(deadlockParagraph)
        }
    })
    line.appendChild(paragraphContainer)
    return line;
}