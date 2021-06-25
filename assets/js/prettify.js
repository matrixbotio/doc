const underConstructionMark = '🛠 Under construction';
const methodsListRight = document.querySelectorAll('.tsd-navigation.secondary > .current > li.tsd-kind-interface.tsd-parent-kind-module > ul > li.tsd-kind-method > a');
const methodListIndex = document.querySelectorAll('.tsd-index-list > .tsd-kind-method.tsd-parent-kind-interface > a');
const methodHeaders = document.querySelectorAll('.tsd-panel.tsd-member.tsd-kind-method.tsd-parent-kind-interface > h3');
const interfaceListRight = document.querySelectorAll('.tsd-navigation.secondary > ul > li > a');
const interfaceListModule = document.querySelectorAll('.tsd-kind-interface.tsd-parent-kind-module:not(.tsd-is-external) > a');
const methodSignatures = document.querySelectorAll('.tsd-signatures.tsd-kind-method.tsd-parent-kind-interface > li');
const symbolsAndTypes = document.querySelectorAll('.tsd-signature-symbol + .tsd-signature-type + .tsd-signature-symbol');
const returns = document.querySelectorAll('.tsd-panel.tsd-member.tsd-kind-method.tsd-parent-kind-interface > .tsd-descriptions > .tsd-description > .tsd-returns-title');
const parameters = document.querySelectorAll('.tsd-panel.tsd-member.tsd-kind-method.tsd-parent-kind-interface > .tsd-descriptions > .tsd-description > .tsd-parameters');

function _createUnderConstructionMark(){
    const dl = document.createElement('dl'),
        dt = document.createElement('dt');
    dl.classList.add('tsd-comment-tags');
    dl.appendChild(dt);
    dt.innerText = underConstructionMark;
    return dl
}

function addUnderConstructionMarksForMethods(methods){
    for(const a of [
        ...methodsListRight,
        ...methodListIndex,
    ]) if(methods.includes(a.innerText)){
        a.classList.add('under-construction')
    }
    for(const header of methodHeaders) if(methods.includes(header.innerText)){
        header.appendChild(_createUnderConstructionMark())
    }
}

function _checkInnerText(element, text){
    return element && element.innerText === text
}

function _returnParser(returnStartNode){
    let openGapCount = -1;
    let current = returnStartNode;
    let returnsGot = false;
    const res = {
        returns: [],
        throws: [],
    }
    while(current = current.nextElementSibling){
        if(current.innerText === '<'){
            if(openGapCount >= 0) res[returnsGot ? 'throws': 'returns'].push(current);
            openGapCount++
        } else if(current.innerText === '>'){
            if(openGapCount) res[returnsGot ? 'throws': 'returns'].push(current);
            openGapCount--
        } else if(openGapCount && !returnsGot) res.returns.push(current);
        else if(!openGapCount && !returnsGot){
            if(current.innerText === ', ') returnsGot = true;
            else res.returns.push(current)
        } else if(openGapCount !== -1) res.throws.push(current)
    }
    return res
}

function fixReturns(){
    for(const span of symbolsAndTypes){
        if(
            _checkInnerText(span, '<')
         && _checkInnerText(span.previousElementSibling, 'ThrowablePromise')
         && _checkInnerText(span.previousElementSibling.previousElementSibling, ': ')
        ){
            const { returns } = _returnParser(span.previousElementSibling);
            const toRemove = [];
            const { parentElement } = span;
            let current = span.previousElementSibling.previousElementSibling;
            while(current = current.nextElementSibling) if(!returns.includes(current)) toRemove.push(current);
            toRemove.forEach(node => parentElement.removeChild(node))
        }
    }
    for(const returnDescription of returns){
        const firstChild = returnDescription.children[0];
        if(firstChild && firstChild.classList.contains('tsd-signature-type') && firstChild.innerText === 'ThrowablePromise'){
            const parsed =_returnParser(firstChild);
            if(parsed.throws.length){
                const throws = document.createElement(returnDescription.tagName);
                throws.innerText = 'Throws ';
                throws.classList.add(...returnDescription.classList);
                throws.append(...parsed.throws);
                returnDescription.parentElement.appendChild(throws);
            }
            const toRemove = [firstChild];
            let current = firstChild;
            while(current = current.nextElementSibling) if(!parsed.returns.includes(current)) toRemove.push(current);
            toRemove.forEach(node => returnDescription.removeChild(node))
        }
    }
}

function fixParameters(){
    for(const parameterList of parameters){
        parameterList.parentElement.insertBefore(parameterList.children[0].children[1], parameterList);
        parameterList.remove();
    }
    for(const signature of methodSignatures){
        let i = -1;
        while(signature.childNodes[i += 2].nodeName.toLowerCase() === 'wbr');
        const argsTextNode = signature.childNodes[i + 1];
        if(argsTextNode.nodeType === HTMLElement.TEXT_NODE){
            argsTextNode.nextSibling.remove();
            argsTextNode.remove();
        }
    }
}

function removeLastNodes(nodeContainer, count){
    const { length } = nodeContainer;
    for(let i = length - 1; i >= length - count; i--) nodeContainer[i].remove();
}

/**
 * @arg {ChildNode} start
 */
function getValDefs(start){
    const nodes = Array.from(start.parentElement.childNodes);
    const valDef = [];
    let currentNode = nodes[nodes.indexOf(start) + 5];
    while(currentNode.textContent !== ', val') currentNode = currentNode.nextSibling;
    currentNode = currentNode.nextSibling.nextSibling;
    while(currentNode.innerText !== ')'){
        valDef.push(currentNode);
        currentNode = currentNode.nextSibling;
    }
    return valDef;
}

/**
 * @arg {ChildNode} start
 * @arg {ChildNode} end
 */
function removeCallback(start, end){
    let current = start;
    while(current !== end){
        const next = current.nextSibling;
        current.remove();
        current = next;
    }
}

function fixIntervals(){
    for(const signature of methodSignatures){
        const overloadIndex = Array.from(signature.parentElement.children).indexOf(signature);
        const description = signature.parentElement.nextElementSibling.children[overloadIndex];
        const tags = Array.from(description.querySelectorAll('.tsd-comment-tags > dt')).map(v => v.innerText);
        if(tags.includes('interval')){
            const sigChild = signature.children;
            const sigChildN = signature.childNodes;
            let startNI = 2, endI = sigChild.length - 6;
            if(sigChild[1].innerText.trim() === '{'){
                let level = 1;
                let i = 2;
                for(; i < endI; i++){
                    if(sigChild[i].innerText.trim() === '{') level++;
                    else if(sigChild[i].innerText.trim() === '}' && !--level) break;
                }
                startNI = Array.from(sigChildN).indexOf(sigChild[i]) + 1;
            }
            const callbackStartNode = sigChildN[startNI];
            const value = getValDefs(callbackStartNode);
            removeCallback(callbackStartNode, sigChild[endI]);
            removeLastNodes(signature.childNodes, 4);
            signature.append(...value.map(v => v.cloneNode(true)));
            description.children[description.children.length - 1].remove();
            const returnDescription = description.children[description.children.length - 1];
            returnDescription.innerText = returnDescription.childNodes[0].textContent;
            returnDescription.append(...value);
        }
    }
}

function addUnderConstructionMarks(){
    const methodsToMark = [];
    for(const signature of methodSignatures){
        const overloadIndex = Array.from(signature.parentElement.children).indexOf(signature);
        const description = signature.parentElement.nextElementSibling.children[overloadIndex];
        const tagNodeList = description.querySelectorAll('.tsd-comment-tags > dt');
        const tags = Array.from(tagNodeList).map(v => v.innerText);
        const underconstructionIndex = tags.indexOf('underconstruction');
        if(underconstructionIndex !== -1){
            tagNodeList[underconstructionIndex].remove();
            methodsToMark.push(signature.parentElement.previousElementSibling.innerText);
        }
    }
    addUnderConstructionMarksForMethods(methodsToMark);
}

// launch all prettifying processes
addUnderConstructionMarks();
fixParameters();
fixReturns();
fixIntervals();
