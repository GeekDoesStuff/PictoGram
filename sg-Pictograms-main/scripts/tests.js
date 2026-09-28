runTests();

function runTests() {
    //console.log('Running tests!');
    console.log(notContains([0,0,2,1,1], 0, 2, 1));
    
    /*solveLine([2,1], [0,0,0,0,0]);
    solveLine([3], [0,0,0,0,1,0,0]);
    solveLine([3], [0,0,2,0,0,0,0]);*/

    //console.log('Finished!');
}

// Takes in hints, as well as a partially solved line
function solveLine(hints, line) {
    const lineLen = line.length;
    const numHints = hints.length;
    console.log(`Solving line '${line.join('')}' with hints ${hints}`);

    let hintInsights = hints.map(val => ({val}));

    let hintPos = 0;
    let linePos = 0;
    while(linePos < numPos) {
        let hint = hintInsights[hintPos];
        if(notContains(line, currPos, hint.val, 2) && notContains(line, currPos + hint.val, 1, 1)) {
            currHint++;
            currPos += hint.val + 1;
        } else {
            currPos++;
        }
    }
}

function notContains(list, startPos, len, value) {
    if(len < 0) {
        startPos += len;
        len *= -1;
    }

    if(startPos + len >= list.length) {
        len = list.length - startPos;
    }

    return !list.slice(startPos, startPos + len).includes(value);
}