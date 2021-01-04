const underConstructionMark = '🛠 Under construction';
const methodsListRight = document.querySelectorAll('.tsd-navigation.secondary > .current > li.tsd-kind-interface.tsd-parent-kind-module > ul > li.tsd-kind-method > a');
const methodListIndex = document.querySelectorAll('.tsd-index-list > .tsd-kind-method.tsd-parent-kind-interface > a');
const methodHeaders = document.querySelectorAll('.tsd-panel.tsd-member.tsd-kind-method.tsd-parent-kind-interface > h3');
const interfaceListRight = document.querySelectorAll('.tsd-navigation.secondary > ul > li > a');
const interfaceListModule = document.querySelectorAll('.tsd-kind-interface.tsd-parent-kind-module:not(.tsd-is-external) > a');
const methodSignatures = document.querySelectorAll('.tsd-signatures.tsd-kind-method.tsd-parent-kind-interface > li');
const symbolsAndTypes = document.querySelectorAll('.tsd-signature-symbol + .tsd-signature-type + .tsd-signature-symbol');
const returns = document.querySelectorAll('.tsd-panel.tsd-member.tsd-kind-method.tsd-parent-kind-interface > .tsd-descriptions > .tsd-description > .tsd-returns-title');

function _createUnderConstructionMark(){
    const dl = document.createElement('dl'),
        dt = document.createElement('dt');
    dl.classList.add('tsd-comment-tags');
    dl.appendChild(dt);
    dt.innerText = underConstructionMark;
    return dl
}

function toUpper(text){
    return text.slice(0, 1).toUpperCase() + text.slice(1)
}

function addUnderConstructionMarksAndUppercase(){
    for(const a of [
        ...methodsListRight,
        ...methodListIndex,
    ]) if(a.innerText.startsWith('_')){
        a.innerText = toUpper(a.innerText.slice(1));
        a.classList.add('under-construction')
    } else {
        a.innerText = toUpper(a.innerText);
    }
    for(const header of methodHeaders) if(header.innerText.startsWith('_')){
        header.innerText = toUpper(header.innerText.slice(1));
        header.appendChild(_createUnderConstructionMark())
    } else {
        header.innerText = toUpper(header.innerText);
    }

    for(const a of [
        ...interfaceListRight,
        ...interfaceListModule,
    ]){
        a.innerText = toUpper(a.innerText);
    }

    for(const li of methodSignatures){
        const startText = li.childNodes[0];
        startText.data = toUpper(startText.data.slice(+startText.data.startsWith('_')))
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
            if(!openGapCount) res[returnsGot ? 'throws': 'returns'].push(current);
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
         && _checkInnerText(span.previousElementSibling, 'Return')
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
        if(firstChild && firstChild.classList.contains('tsd-signature-type') && firstChild.innerText === 'Return'){
            const parsed =_returnParser(firstChild);
            const throws = document.createElement(returnDescription.tagName);
            throws.innerText = 'Throws ';
            throws.classList.add(...returnDescription.classList);
            throws.append(...parsed.throws);
            returnDescription.parentElement.appendChild(throws);
            const toRemove = [firstChild];
            let current = firstChild;
            while(current = current.nextElementSibling) if(!parsed.returns.includes(current)) toRemove.push(current);
            toRemove.forEach(node => returnDescription.removeChild(node))
        }
    }
}

// launch all prettifying processes
addUnderConstructionMarksAndUppercase();
fixReturns();
