import * as nono from './util/nono-utils.js';
import * as idParser from './util/id-parser.js';

const sketch = (p, id) => {
    const ACTION_TYPE = {
        MARK_CELL: 0,
        TOGGLE_HOR_HINT: 1,
        TOGGLE_VER_HINT: 2
    }
    
    const CELL_MARK = {
        EMPTY: 0,
        BLACK: 1,
        WHITE: 2
    };

    const EVENT = {
        MOUSE: 0,
        TOUCH: 1
    }

    const ZOOM_FACTOR = 1.2;
    const FADED = 150; // TODO Put it in the color palette

    let canvas;

    let zoom = 1;

    let margin = 12;
    let cellSize = 30;
    let crossSize = cellSize/6;

    let numRows;
    let horHints;
    let maxHorHints;

    let numCols;
    let verHints;
    let maxVerHints;

    let enc;
    let msgType;

    let grid;
    let gridHorHints;
    let gridVerHints;

    let cellColors;

    let actionEvent;
    let actions = [];

    let movesUndo = [];
    let movesRedo = [];
    let ended = false;

    p.setup = function() {
        canvas = p.createCanvas(500, 300);
        canvas.parent(document.getElementById('nonoDiv'));
        canvas.touchStarted((ev) => ev.preventDefault());

        initializeColors();

        loadPuzzle();

        resetGrid();
        loadState();
        resize();

        setupButtons();
    }

    function setupButtons() {
        document.getElementById("undoBtn").addEventListener("click", undo);
        document.getElementById("redoBtn").addEventListener("click", redo);
        document.getElementById("zoomInBtn").addEventListener("click", zoomIn);
        document.getElementById("zoomOutBtn").addEventListener("click", zoomOut);
        document.getElementById("resetBtn").addEventListener("click", reset);
    }

    function initializeColors() {
        cellColors = [
            p.color(200,255,165),  // Yellow 1
            p.color(200,215,165),  // Yellow 2
            p.color(165,255,200),  // Green 1
            p.color(165,215,200)   // Green 2
        ];
    }

    function resize() {
        p.resizeCanvas(zoom * (2 * margin + (maxHorHints + numCols) * cellSize),
            zoom * (2 * margin + (maxVerHints + numRows) * cellSize));
    }

    function loadPuzzle() {
        if(!id) {
            id = nono.generateNonogram(10, 10, null, 0);
            const newUrl = `${window.location.pathname}?id=${id}`;
            window.history.pushState({}, '', newUrl);
        }

        const infos = idParser.parseId(id);
        ({numRows, numCols, enc, msgType} = infos);

        [horHints, verHints] = nono.getPuzzleFromInfos(infos);
        maxHorHints = countMaxHints(horHints);
        maxVerHints = countMaxHints(verHints);
    }

    function resetGrid() {
        grid = nono.getEmptyGrid(numRows, numCols);

        gridHorHints = [];
        for(let hints of horHints)
            gridHorHints.push(Array(hints.length).fill(0));

        gridVerHints = [];
        for(let hints of verHints)
            gridVerHints.push(Array(hints.length).fill(0));
        
        actionEvent = null;
        emptyUndoRedo();
        ended = false;
    }

    function loadState() {
        const encodedState = localStorage.getItem(id);
        if(!encodedState)
            return;

        nono.decodeGameState(grid, gridHorHints, gridVerHints, encodedState);
        checkSolution();
    }

    function saveState() {
        if(ended)
            return;
        const encodedState = nono.encodeGameState(grid, gridHorHints, gridVerHints);
        localStorage.setItem(id, encodedState);
    }

    function deleteState() {
        localStorage.removeItem(id);
    }

    function countMaxHints(hints) {
        let max = 1; // at least one slot so empty lines can show a 0
        for(let h of hints) {
            let num = h.length;
            if(num > max)
                max = num;
        }
        return max;
    }

    p.draw = function() {
        p.scale(zoom);
        p.background(ended ? p.color(100, 200, 100) : p.color(225));

        p.translate(margin, margin);
        p.translate(maxHorHints * cellSize, maxVerHints * cellSize);
        
        drawHorHints();
        drawVerHints();
        drawGrid();
        drawPosHighlight();
    }

    function drawGrid() {
        for(let row = 0; row < numRows; row++) {
            for(let col = 0; col < numCols; col++) {
                let gridVal = grid[row][col];
                let cellColor = cellColors[2 * ((Math.floor(row/5) + Math.floor(col/5)) % 2) + (row + col) % 2];
                if(gridVal == CELL_MARK.BLACK) {
                    cellColor = p.lerpColor(cellColor, p.color(0, 0, 125), 0.9);
                } else if(gridVal == CELL_MARK.WHITE) {
                    cellColor = p.lerpColor(cellColor, p.color(255, 255, 255), 0.5);
                }
                
                p.noStroke();
                p.fill(cellColor);
                p.rect(col * cellSize, row * cellSize, cellSize, cellSize);

                if(gridVal == CELL_MARK.WHITE) {
                    p.noFill();
                    p.stroke(160,0,0);
                    p.strokeWeight(2);
                    p.strokeCap(p.SQUARE)
                    let centerX = (col + 0.5) * cellSize;
                    let centerY = (row + 0.5) * cellSize;
                    p.line(centerX - crossSize, centerY - crossSize, centerX + crossSize, centerY + crossSize);
                    p.line(centerX - crossSize, centerY + crossSize, centerX + crossSize, centerY - crossSize);
                    p.strokeCap(p.ROUND);
                }
            }
        }

        p.stroke(0);
        p.noFill();
        for(let row = 0; row <= numRows; row++) {
            p.strokeWeight((row == numRows || row % 5 == 0) ? 3 : 1);
            p.line(-maxHorHints * cellSize, row * cellSize,
                numCols * cellSize, row * cellSize);
        }
        for(let col = 0; col <= numCols; col++) {
            p.strokeWeight((col == numCols || col % 5 == 0) ? 3 : 1);
            p.line(col * cellSize, -maxVerHints * cellSize,
                col * cellSize, numRows * cellSize);
        }
    }

    function drawHorHints() {
        for(let row = 0; row < numRows; row++) {
            let rowHints = horHints[row];
            let numHints = rowHints.length;

            if(numHints == 0) { // empty row
                p.noStroke();
                p.fill(FADED);
                p.textSize(cellSize * 0.9);
                p.textAlign(p.CENTER, p.CENTER);
                p.text(0, -0.5 * cellSize, (row + 0.5) * cellSize + 2);
            }

            for(let i = 0; i < numHints; i++) {
                let hint = rowHints[i];
                let checked = gridHorHints[row][i] == 1;

                p.noStroke();
                p.fill(checked ? FADED : 0);
                p.textSize(hint < 10 ? cellSize * 0.9 : cellSize * 0.7);
                p.textAlign(p.CENTER, p.CENTER);
                p.text(hint, -(numHints - i - 0.5) * cellSize, (row + 0.5) * cellSize + 2);
            }
        }
    }

    function drawVerHints() {
        for(let col = 0; col < numCols; col++) {
            let colHints = verHints[col];
            let numHints = colHints.length;

            if(numHints == 0) { // empty column
                p.noStroke();
                p.fill(FADED);
                p.textSize(cellSize * 0.9);
                p.textAlign(p.CENTER, p.CENTER);
                p.text(0, (col + 0.5) * cellSize, -0.5 * cellSize + 2);
            }

            for(let i = 0; i < numHints; i++) {
                let hint = colHints[i];
                let checked = gridVerHints[col][i] == 1;

                p.noStroke();
                p.fill(checked ? FADED : 0);
                p.textSize(hint < 10 ? cellSize * 0.9 : cellSize * 0.7);
                p.textAlign(p.CENTER, p.CENTER);
                p.text(hint, (col + 0.5) * cellSize, -(numHints - i - 0.5) * cellSize + 2);
            }
        }
    }

    function drawPosHighlight() {
        const mouseInfo = getMouseInfo();
        p.noStroke();
        p.fill(0, 70);
        
        if(mouseInfo.inGridY && (mouseInfo.inGridX || mouseInfo.inHintsX)) {
            p.rect(-maxHorHints * cellSize - 1, mouseInfo.row * cellSize - 1,
                (maxHorHints + numCols) * cellSize + 2, cellSize + 2);
        }
        
        if(mouseInfo.inGridX && (mouseInfo.inGridY || mouseInfo.inHintsY)) {
            p.rect(mouseInfo.col * cellSize - 1, -maxVerHints * cellSize - 1,
                cellSize + 2, (maxVerHints + numRows) * cellSize + 2);
        }
    }

    function getMouseInfo() {
        return getEventInfo(p.mouseX, p.mouseY, EVENT.MOUSE, p.mouseButton);
    }

    function getTouchInfo(touch) {
        return getEventInfo(touch.x, touch.y, EVENT.TOUCH);
    }

    function getEventInfo(x, y, type, button = -1) {
        let col = Math.floor((x/zoom - margin) / cellSize) - maxHorHints;
        let row = Math.floor((y/zoom - margin) / cellSize) - maxVerHints;

        let inGridX = (col >= 0 && col < numCols);
        let inHintsX = (col < 0 && col > (-1 - maxHorHints));
        let inGridY = (row >= 0 && row < numRows);
        let inHintsY = (row < 0 && row > (-1 - maxVerHints));

        return { type, button, col, row,
            inGridX, inGridY, inHintsX, inHintsY };
    }

    p.touchStarted = function(event) {
        if(event.target !== canvas.elt) {
            return;
        }
        if(p.touches.length == 1)
            handleClickEvent(getTouchInfo(p.touches[0]));
        return false;
    }

    p.touchMoved = function(event) {
        if(event.target !== canvas.elt)
            return;
        if(p.touches.length == 1)
            handleDragEvent(getTouchInfo(p.touches[0]));
        return false;
    }

    p.touchEnded = function(event) {
        clearActions();
        if(event.target !== canvas.elt)
            return;
        return false;
    }

    p.mousePressed = function(event) {
        if(event.target !== canvas.elt)
            return;
        handleClickEvent(getMouseInfo());
    }
    
    function handleClickEvent(eventInfo) {
        if(eventInfo.inGridX) {
            if(eventInfo.inGridY)
                clickInGrid(eventInfo);
            else if(eventInfo.inHintsY)
                clickInVerHints(eventInfo);
        } else if(eventInfo.inHintsX && eventInfo.inGridY)
            clickInHorHints(eventInfo);
    }

    p.mouseReleased = function(event) {
        if(p.mouseButton == actionEvent?.button) {
            clearActions();
        }
    }

    p.mouseDragged = function(event) {
        if(event.target !== canvas.elt)
            return;
        if(actionEvent && actions.length > 0)
            handleDragEvent(getMouseInfo());
    }

    function handleDragEvent(eventInfo) {
        let action = actions[0];
        if(action.type == ACTION_TYPE.MARK_CELL) {
            if(eventInfo.inGridX && eventInfo.inGridY) {
                let currVal = grid[eventInfo.row][eventInfo.col];
                
                if((eventInfo.type == EVENT.TOUCH && currVal != action.to) ||
                        (action.from == CELL_MARK.EMPTY && currVal == CELL_MARK.EMPTY) ||
                        (action.to == CELL_MARK.EMPTY && currVal == action.from) ||
                        (action.from != CELL_MARK.EMPTY && action.to != CELL_MARK.EMPTY && currVal != action.to))
                    addAction({type: ACTION_TYPE.MARK_CELL,
                        row: eventInfo.row, col: eventInfo.col,
                        from: currVal, to: action.to});
            }
        } else if(action.type == ACTION_TYPE.TOGGLE_HOR_HINT) {
            if(eventInfo.inGridY && eventInfo.inHintsX && eventInfo.row == action.row) {
                let hints = gridHorHints[eventInfo.row];
                let col = -1 - eventInfo.col;
                let numHints = hints.length;
                if(col < numHints) {
                    let index = numHints - col - 1;
                    let currVal = hints[index];
                    if(currVal == action.from)
                        addAction({type: ACTION_TYPE.TOGGLE_HOR_HINT,
                            row: eventInfo.row, index: index,
                            from: currVal});
                }
            }
        } else if(action.type == ACTION_TYPE.TOGGLE_VER_HINT) {
            if(eventInfo.inGridX && eventInfo.inHintsY && eventInfo.col == action.col) {
                let hints = gridVerHints[eventInfo.col];
                let row = -1 - eventInfo.row;
                let numHints = hints.length;
                if(row < numHints) {
                    let index = numHints - row - 1;
                    let currVal = hints[index];
                    if(currVal == action.from)
                        addAction({type: ACTION_TYPE.TOGGLE_VER_HINT,
                            col: eventInfo.col, index: index,
                            from: currVal});
                }
            }
        }
    }

    function clickInGrid(eventInfo) {
        const currVal = grid[eventInfo.row][eventInfo.col];
        let nextVal = CELL_MARK.EMPTY;

        if(eventInfo.type == EVENT.MOUSE) {
            if(eventInfo.button == p.LEFT)
                nextVal = currVal == CELL_MARK.BLACK ? CELL_MARK.EMPTY : CELL_MARK.BLACK;
            else if(eventInfo.button == p.RIGHT)
                nextVal = currVal == CELL_MARK.WHITE ? CELL_MARK.EMPTY : CELL_MARK.WHITE;
        } else if(eventInfo.type == EVENT.TOUCH) {
            nextVal = (currVal + 1) % 3;
        }

        if(currVal != nextVal)
            setAction({type: ACTION_TYPE.MARK_CELL, 
                row: eventInfo.row, col: eventInfo.col,
                from: currVal, to: nextVal}, eventInfo);
    }

    function clickInHorHints(eventInfo) {
        let col = -1 - eventInfo.col;
        let hints = gridHorHints[eventInfo.row];
        let numHints = hints.length;
        if(col < numHints) {
            let index = numHints - col - 1;
            let currVal = hints[index];
            setAction({type: ACTION_TYPE.TOGGLE_HOR_HINT,
                row: eventInfo.row, index: index,
                from: currVal}, eventInfo);
        }
    }

    function clickInVerHints(eventInfo) {
        let row = -1 - eventInfo.row;
        let hints = gridVerHints[eventInfo.col];
        let numHints = hints.length;
        if(row < numHints) {
            let index = numHints - row - 1;
            let currVal = hints[index];
            setAction({type: ACTION_TYPE.TOGGLE_VER_HINT,
                col: eventInfo.col, index: index,
                from: currVal}, eventInfo);
        }
    }

    function setAction(action, eventInfo = null) {
        clearActions();
        actionEvent = eventInfo;
        addAction(action);
    }

    function addAction(action) {
        apply(action);
        actions.push(action);
    }

    function clearActions() {
        actionEvent = null;
        if(actions && actions.length > 0) {
            addUndo(actions);
        }
        actions = [];
    }

    function emptyUndoRedo() {
        movesUndo = [];
        movesRedo = [];
        updateUndoRedoButtons();
    }

    function addUndo(actions) {
        movesUndo.push(actions);
        movesRedo = [];
        updateUndoRedoButtons();
    }

    function undo() {
        if(movesUndo.length == 0)
            return;
        clearActions();

        let currActions = movesUndo.pop();
        for(let action of currActions)
            unapply(action);
        movesRedo.push(currActions);

        updateUndoRedoButtons();
    }

    function redo() {
        if(movesRedo.length == 0)
            return;
        clearActions();
        
        let currActions = movesRedo.pop();
        for(let action of currActions)
            apply(action);
        movesUndo.push(currActions);

        updateUndoRedoButtons();
    }

    function updateUndoRedoButtons() {
        document.getElementById('undoBtn').disabled = (movesUndo.length == 0);
        document.getElementById('redoBtn').disabled = (movesRedo.length == 0);
    }

    function apply(action) {
        if(action.type == ACTION_TYPE.MARK_CELL) {
            grid[action.row][action.col] = action.to;
            checkSolution();
        } else if(action.type == ACTION_TYPE.TOGGLE_HOR_HINT) {
            let hints = gridHorHints[action.row];
            hints[action.index] = 1 - hints[action.index];
        } else if(action.type == ACTION_TYPE.TOGGLE_VER_HINT) {
            let hints = gridVerHints[action.col];
            hints[action.index] = 1 - hints[action.index];
        }
        saveState();
    }

    function unapply(action) {
        if(action.type == ACTION_TYPE.MARK_CELL) {
            grid[action.row][action.col] = action.from;
        } else if(action.type == ACTION_TYPE.TOGGLE_HOR_HINT) {
            let hints = gridHorHints[action.row];
            hints[action.index] = 1 - hints[action.index];
        } else if(action.type == ACTION_TYPE.TOGGLE_VER_HINT) {
            let hints = gridVerHints[action.col];
            hints[action.index] = 1 - hints[action.index];
        }
        saveState();
    }

    function checkSolution() {
        if(!ended && isSolved()) {
            saveState();
            ended = true;
            displaySecretMessage();
        }
    }

    function displaySecretMessage() {
        let code = nono.decryptWithGrid(enc, msgType, grid);
        const msgDiv = document.getElementById('msgDiv');
        if(msgType == 0)
            msgDiv.textContent = code;
        else
            msgDiv.appendChild(getAnchor(nono.getSteamGiftsURL(code)));
        msgDiv.style.display = 'block';
    }

    function getAnchor(link, text = null) {
        const anchor = document.createElement('a');
        anchor.setAttribute('href', link);
        anchor.setAttribute('target', '_blank');
        anchor.textContent = text || link;
        return anchor;
    }

    function isSolved() {
        // Check each row
        for(let row = 0; row < numRows; row++) {
            let hints = horHints[row];
            let numHints = hints.length;

            let currCount = 0;
            let currGroup = 0;

            for(let col = 0; col <= numCols; col++) {
                if(col == numCols || grid[row][col] != CELL_MARK.BLACK) { // White or after last cell
                    if(currCount > 0) {
                        if(currGroup >= numHints || hints[currGroup] != currCount) {
                            return false;
                        } else {
                            currCount = 0;
                            currGroup++;
                        }
                    }
                } else { // Black cell
                    currCount++;
                }
            }
            if(currGroup != numHints) {
                return false;
            }
        }

        // Check each col
        for(let col = 0; col < numCols; col++) {
            let hints = verHints[col];
            let numHints = hints.length;

            let currCount = 0;
            let currGroup = 0;

            for(let row = 0; row <= numRows; row++) {
                if(row == numRows || grid[row][col] != CELL_MARK.BLACK) { // White or after last cell
                    if(currCount > 0) {
                        if(currGroup >= numHints || hints[currGroup] != currCount) {
                            return false;
                        } else {
                            currCount = 0;
                            currGroup++;
                        }
                    }
                } else { // Black cell
                    currCount++;
                }
            }
            if(currGroup != numHints) {
                return false;
            }
        }

        return true;
    }

    function zoomIn() {
        zoom *= ZOOM_FACTOR;
        resize();
    }

    function zoomOut() {
        zoom /= ZOOM_FACTOR;
        resize();
    }

    function reset() {
        resetGrid();
        deleteState();
    }

    function clearAllCache() {
        resetGrid();
        localStorage.clear();
    }

    p.keyPressed = function() {
        if (p.keyCode === p.RIGHT_ARROW || (p.key === 'y' && p.keyIsDown(p.CONTROL))) {
            redo();
        } else if (p.keyCode === p.LEFT_ARROW || (p.key === 'z' && p.keyIsDown(p.CONTROL))) {
            undo();
        } else if (p.keyCode === p.UP_ARROW || p.key === '+' ) {
            zoomIn();
        } else if (p.keyCode === p.DOWN_ARROW || p.key === '-' ) {
            zoomOut();
        } else if (p.key === 'R' && p.keyIsDown(p.SHIFT)) {
            reset();
        } else if (p.key == 'Q' && p.keyIsDown(p.SHIFT)) {
            clearAllCache();
        }
    }
};

// Disable selection
document.getElementById('nonoDiv').addEventListener('mousedown', (event) => {
    event.preventDefault();
});

// Disable right click context menu
document.getElementById('nonoDiv').addEventListener('contextmenu', (event) => {
    event.preventDefault();
});

document.getElementById("createBtn").addEventListener("click", function() {
    window.open("creator.html", "_blank");
});

// On page load, read id and start sketch
document.addEventListener('DOMContentLoaded', () => {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const id = urlParams.get('id');

    new p5((p) => sketch(p, id));
});
