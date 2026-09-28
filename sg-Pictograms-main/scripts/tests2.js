//runTests();

testSolve();

function testSolve() {
    horHints = [
        [2,2],
        [4,4],
        [1,2,2],
        [5,2,1],
        [1,2,4],
        [4,1,1],
        [1,1,3],
        [5,1],
    ]

    verHints = [
        [6],
        [2,1,1,1],
        [2,5],
        [5,1],
        [3,1],
        [1],
        [1,5],
        [2,2,1],
        [3,3],
        [3]
    ]
}

function runTests() {
    //console.log('Running tests!');
    
    //solveLine([2,1], [0,0,0,0,0]);
    //solveLine([3], [0,0,0,0,1,0,0]);
    //solveLine([3], [0,0,2,0,0,0,0]);

    //console.log('Finished!');
    
    //console.log(listLinePossibilities([2,1], 6));
    let len = 4;
    let poss = listLinePossibilities([2,1], len);
    //console.log(listLinePossibilities([2,1], 4));
    //let poss = listLinePossibilities([2,1,7], 15);
    let common = findCommonalities(poss, len);
    console.log(common);
    //console.log(listPossibilities(3, 5));
}

function solveNonogram(horHints, verHints) {
    // First calculate all possibilities for each row and column

    // Then we alternate (row, col)
    // For all of the type
    // We reduce possibilities according to line in grid
    // We find commonalities
    // If no commonality found for all of them
    //  then we're done solving
    //  And if not all cells found
    //   then puzzle not unique/solvable
}

function findCommonalities(possibilities, len) {
    console.log(possibilities);
    if (possibilities.length === 0) return []; // Handle empty input
    if (possibilities.length === 1) return [...Array(len).keys()];

    const result = [];

    // Iterate through each index
    for (let i = 0; i < len; i++) {
        const value = possibilities[0][i]; // Take the value from the first string

        // Check if all strings have the same value at this index
        if (possibilities.every(str => str[i] === value)) {
            result.push(i); // Add index to result if values match
        }
    }

    return result;
}

function listLinePossibilities(hints, len) {
    let possibilities = [];

    let sum = hints.reduce((sum, value) => sum + value, 0);
    let numHints = hints.length;
    let numSpacesToPut = len - sum - hints.length + 1;
    //console.log(`Sum: ${sum}, spots: ${numHints + 1}, fillers: ${numSpacesToPut}`);

    for(let permutation of listPossibilities(numHints + 1, numSpacesToPut)) {
        //console.log(permutation);
        let pos = 0;
        let arr = Array(len).fill(0);
        for(let i = 0; i < numHints; i++) {
            pos += permutation[i];
            for(let j = 0; j < hints[i]; j++) {
                arr[pos + j] = 1;
            }
            pos += hints[i] + 1;
        }
        possibilities.push(arr.join(''));
    }

    return possibilities;
}

function listPossibilities(numSpots, numFillers, current = [], results = []) {
    if(numSpots <= 0)
        return [];

    if(numSpots == 1) {
        results.push([...current, numFillers]);
        return [[numFillers]];
    }
    
    if(numFillers == 0) {
        const arr = Array(numSpots).fill(0);
        results.push(current.concat(arr));
        return [arr];
    }
    
    for (let i = 0; i <= numFillers; i++) {
        listPossibilities(numSpots - 1, numFillers - i, [...current, i], results);
    }
    
    return results;
}

