const board = document.getElementById('board');
const turnIndicator = document.getElementById('turn-indicator');
const movesList = document.getElementById('moves-list');
let patterneven = " <div class='esquare'></div>" ;
let patternodd = " <div class='osquare'></div>" ;

for (let i = 0; i < 4; i++) {
    board.innerHTML += patterneven.repeat(8);
    board.innerHTML += patternodd.repeat(8);
}

// Get all squares for selection highlighting
const squares = document.querySelectorAll('.esquare, .osquare');

// ---------------------------
// GAME STATE
// ---------------------------
const pieces = [];
const step = 80;
let selectedPiece = null;
let currentTurn = 'white'; // 'white' or 'black'
let lastMove = null; // For en passant tracking
let moveHistory = [];
let moveNumber = 1;
let gameOver = false;

// ---------------------------
// PIECE SETUP
// ---------------------------

function createPiece(type, color, x, y) {
    const piece = document.createElement('div');
    piece.className = `piece ${type} ${color}`;
    piece.style.left = x + 'px';
    piece.style.top = y + 'px';
    const pieceData = { 
        element: piece, 
        type: type,
        x: x, 
        y: y, 
        color: color,
        hasMoved: false
    };
    pieces.push(pieceData);
    board.appendChild(piece);
    return pieceData;
}

// Black pieces (top, row 0 and 1)
const blackOrder = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
for (let i = 0; i < 8; i++) {
    createPiece(blackOrder[i], 'black', i * step, 0);
    createPiece('pawn', 'black', i * step, 1 * step);
}

// White pieces (bottom, row 6 and 7)
const whiteOrder = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
for (let i = 0; i < 8; i++) {
    createPiece('pawn', 'white', i * step, 6 * step);
    createPiece(whiteOrder[i], 'white', i * step, 7 * step);
}

// ---------------------------
// HELPER FUNCTIONS
// ---------------------------
function getSquareIndex(x, y) {
    const col = x / step;
    const row = y / step;
    return row * 8 + col;
}

function isWhiteSquare(x, y) {
    const col = x / step;
    const row = y / step;
    return (row + col) % 2 === 0;
}

function clearSelection() {
    squares.forEach(square => {
        square.classList.remove('selected-white', 'selected-black', 'valid-move', 'valid-capture');
    });
}

function getPieceAt(x, y) {
    return pieces.find(p => p.x === x && p.y === y && p.element.parentNode);
}

function updateTurnIndicator() {
    const inCheck = isKingInCheck(currentTurn);
    if (inCheck) {
        turnIndicator.textContent = `${currentTurn === 'white' ? "White" : "Black"}'s Turn - CHECK!`;
        turnIndicator.style.color = '#ff6b6b';
    } else {
        turnIndicator.textContent = currentTurn === 'white' ? "White's Turn" : "Black's Turn";
        turnIndicator.style.color = '#ffffff';
    }
}

function isValidPosition(x, y) {
    return x >= 0 && x < 640 && y >= 0 && y < 640;
}

function getKing(color) {
    return pieces.find(p => p.type === 'king' && p.color === color);
}

function positionToNotation(x, y) {
    const col = String.fromCharCode(97 + (x / step)); // a-h
    const row = 8 - (y / step); // 1-8
    return col + row;
}

function pieceSymbol(type) {
    const symbols = {
        'king': 'K',
        'queen': 'Q',
        'rook': 'R',
        'bishop': 'B',
        'knight': 'N',
        'pawn': ''
    };
    return symbols[type] || '';
}

// ---------------------------
// CHECK DETECTION
// ---------------------------

function isSquareUnderAttack(x, y, byColor) {
    // Check if any piece of 'byColor' can attack position (x, y)
    for (let piece of pieces) {
        if (piece.color !== byColor || !piece.element.parentNode) continue;
        
        const moves = getValidMovesRaw(piece);
        if (moves.some(m => m.x === x && m.y === y)) {
            return true;
        }
    }
    return false;
}

function isKingInCheck(kingColor) {
    const king = getKing(kingColor);
    if (!king) return false;
    
    const oppositeColor = kingColor === 'white' ? 'black' : 'white';
    return isSquareUnderAttack(king.x, king.y, oppositeColor);
}

function wouldMoveLeaveKingInCheck(piece, newX, newY, capturedPiece = null) {
    // Simulate the move
    const oldX = piece.x;
    const oldY = piece.y;
    
    piece.x = newX;
    piece.y = newY;
    
    // Temporarily remove captured piece
    if (capturedPiece) {
        const capturedIndex = pieces.indexOf(capturedPiece);
        pieces.splice(capturedIndex, 1);
    }
    
    const inCheck = isKingInCheck(piece.color);
    
    // Undo the move
    piece.x = oldX;
    piece.y = oldY;
    
    if (capturedPiece) {
        pieces.push(capturedPiece);
    }
    
    return inCheck;
}

// ---------------------------
// MOVEMENT RULES
// ---------------------------

function getPawnMoves(piece) {
    const moves = [];
    const direction = piece.color === 'white' ? -step : step;
    
    // Forward move (1 square)
    const forward1 = { x: piece.x, y: piece.y + direction };
    if (isValidPosition(forward1.x, forward1.y) && !getPieceAt(forward1.x, forward1.y)) {
        moves.push({ ...forward1, type: 'move' });
        
        // Forward move (2 squares on first move)
        if (!piece.hasMoved) {
            const forward2 = { x: piece.x, y: piece.y + (direction * 2) };
            if (!getPieceAt(forward2.x, forward2.y)) {
                moves.push({ ...forward2, type: 'move', isDoubleMove: true });
            }
        }
    }
    
    // Diagonal captures
    const diagonals = [
        { x: piece.x - step, y: piece.y + direction },
        { x: piece.x + step, y: piece.y + direction }
    ];
    
    diagonals.forEach(pos => {
        if (isValidPosition(pos.x, pos.y)) {
            const targetPiece = getPieceAt(pos.x, pos.y);
            if (targetPiece && targetPiece.color !== piece.color) {
                moves.push({ ...pos, type: 'capture', capturedPiece: targetPiece });
            }
            
            // En passant - ONLY on the immediate next turn
            if (lastMove && lastMove.isDoubleMove && lastMove.piece.type === 'pawn' && lastMove.piece.color !== piece.color) {
                const lastPiece = lastMove.piece;
                // The pawn must be directly beside us
                if (lastPiece.y === piece.y && Math.abs(lastPiece.x - piece.x) === step) {
                    // We capture to the square it "passed over"
                    const enPassantY = lastPiece.y + (lastPiece.color === 'white' ? step : -step);
                    if (pos.x === lastPiece.x && pos.y === enPassantY) {
                        moves.push({ ...pos, type: 'enpassant', capturedPiece: lastPiece });
                    }
                }
            }
        }
    });
    
    return moves;
}

function getRookMoves(piece) {
    const moves = [];
    const directions = [
        { dx: 0, dy: -step }, // up
        { dx: 0, dy: step },  // down
        { dx: -step, dy: 0 }, // left
        { dx: step, dy: 0 }   // right
    ];
    
    directions.forEach(dir => {
        let x = piece.x + dir.dx;
        let y = piece.y + dir.dy;
        
        while (isValidPosition(x, y)) {
            const targetPiece = getPieceAt(x, y);
            if (!targetPiece) {
                moves.push({ x, y, type: 'move' });
            } else {
                if (targetPiece.color !== piece.color) {
                    moves.push({ x, y, type: 'capture', capturedPiece: targetPiece });
                }
                break;
            }
            x += dir.dx;
            y += dir.dy;
        }
    });
    
    return moves;
}

function getBishopMoves(piece) {
    const moves = [];
    const directions = [
        { dx: -step, dy: -step }, // up-left
        { dx: step, dy: -step },  // up-right
        { dx: -step, dy: step },  // down-left
        { dx: step, dy: step }    // down-right
    ];
    
    directions.forEach(dir => {
        let x = piece.x + dir.dx;
        let y = piece.y + dir.dy;
        
        while (isValidPosition(x, y)) {
            const targetPiece = getPieceAt(x, y);
            if (!targetPiece) {
                moves.push({ x, y, type: 'move' });
            } else {
                if (targetPiece.color !== piece.color) {
                    moves.push({ x, y, type: 'capture', capturedPiece: targetPiece });
                }
                break;
            }
            x += dir.dx;
            y += dir.dy;
        }
    });
    
    return moves;
}

function getKnightMoves(piece) {
    const moves = [];
    const knightMoves = [
        { dx: -step, dy: -2*step }, { dx: step, dy: -2*step },
        { dx: -step, dy: 2*step },  { dx: step, dy: 2*step },
        { dx: -2*step, dy: -step }, { dx: -2*step, dy: step },
        { dx: 2*step, dy: -step },  { dx: 2*step, dy: step }
    ];
    
    knightMoves.forEach(move => {
        const x = piece.x + move.dx;
        const y = piece.y + move.dy;
        
        if (isValidPosition(x, y)) {
            const targetPiece = getPieceAt(x, y);
            if (!targetPiece) {
                moves.push({ x, y, type: 'move' });
            } else if (targetPiece.color !== piece.color) {
                moves.push({ x, y, type: 'capture', capturedPiece: targetPiece });
            }
        }
    });
    
    return moves;
}

function getQueenMoves(piece) {
    return [...getRookMoves(piece), ...getBishopMoves(piece)];
}

function getKingMoves(piece) {
    const moves = [];
    const directions = [
        { dx: 0, dy: -step },   // up
        { dx: 0, dy: step },    // down
        { dx: -step, dy: 0 },   // left
        { dx: step, dy: 0 },    // right
        { dx: -step, dy: -step }, // up-left
        { dx: step, dy: -step },  // up-right
        { dx: -step, dy: step },  // down-left
        { dx: step, dy: step }    // down-right
    ];
    
    directions.forEach(dir => {
        const x = piece.x + dir.dx;
        const y = piece.y + dir.dy;
        
        if (isValidPosition(x, y)) {
            const targetPiece = getPieceAt(x, y);
            if (!targetPiece) {
                moves.push({ x, y, type: 'move' });
            } else if (targetPiece.color !== piece.color) {
                moves.push({ x, y, type: 'capture', capturedPiece: targetPiece });
            }
        }
    });
    
    return moves;
}

function getValidMovesRaw(piece) {
    // Get moves without checking for leaving king in check
    switch (piece.type) {
        case 'pawn': return getPawnMoves(piece);
        case 'rook': return getRookMoves(piece);
        case 'knight': return getKnightMoves(piece);
        case 'bishop': return getBishopMoves(piece);
        case 'queen': return getQueenMoves(piece);
        case 'king': return getKingMoves(piece);
        default: return [];
    }
}

function getValidMoves(piece) {
    const rawMoves = getValidMovesRaw(piece);
    
    // Filter out moves that would leave king in check
    return rawMoves.filter(move => {
        return !wouldMoveLeaveKingInCheck(piece, move.x, move.y, move.capturedPiece);
    });
}

function highlightValidMoves(piece) {
    const validMoves = getValidMoves(piece);
    validMoves.forEach(move => {
        const squareIndex = getSquareIndex(move.x, move.y);
        const square = squares[squareIndex];
        if (move.type === 'move') {
            square.classList.add('valid-move');
        } else {
            square.classList.add('valid-move', 'valid-capture');
        }
    });
}

function highlightCheck() {
    // Clear previous check highlights
    squares.forEach(square => square.classList.remove('in-check'));
    
    // Highlight king if in check
    if (isKingInCheck(currentTurn)) {
        const king = getKing(currentTurn);
        const squareIndex = getSquareIndex(king.x, king.y);
        squares[squareIndex].classList.add('in-check');
    }
}

function checkForCheckmate() {
    if (!isKingInCheck(currentTurn)) return false;
    
    // Check if any piece has any legal moves
    for (let piece of pieces) {
        if (piece.color === currentTurn && piece.element.parentNode) {
            const moves = getValidMoves(piece);
            if (moves.length > 0) {
                return false; // At least one legal move exists
            }
        }
    }
    
    return true; // No legal moves - checkmate!
}

function endGame(winner) {
    gameOver = true;
    
    const overlay = document.createElement('div');
    overlay.id = 'game-over-overlay';
    
    const message = document.createElement('div');
    message.id = 'game-over-message';
    message.innerHTML = `
        <h2>Checkmate!</h2>
        <p>${winner === 'white' ? 'White' : 'Black'} wins!</p>
        <button onclick="location.reload()">New Game</button>
    `;
    
    overlay.appendChild(message);
    document.body.appendChild(overlay);
}

function addMoveToHistory(piece, fromX, fromY, toX, toY, isCapture) {
    const notation = pieceSymbol(piece.type) + 
                    (isCapture ? 'x' : '') + 
                    positionToNotation(toX, toY);
    
    if (piece.color === 'white') {
        const movePair = document.createElement('div');
        movePair.className = 'move-pair';
        movePair.innerHTML = `
            <span class="move-number">${moveNumber}.</span>
            <span class="move-white">${notation}</span>
            <span class="move-black"></span>
        `;
        movesList.appendChild(movePair);
    } else {
        const lastPair = movesList.lastElementChild;
        if (lastPair) {
            lastPair.querySelector('.move-black').textContent = notation;
        }
        moveNumber++;
    }
    
    // Auto-scroll to bottom
    movesList.scrollTop = movesList.scrollHeight;
}

function movePiece(piece, newX, newY, moveData) {
    const oldX = piece.x;
    const oldY = piece.y;
    const isCapture = moveData.type === 'capture' || moveData.type === 'enpassant';
    
    // Handle captures
    if (isCapture) {
        const capturedPiece = moveData.capturedPiece;
        capturedPiece.element.remove();
        const index = pieces.indexOf(capturedPiece);
        if (index > -1) {
            pieces.splice(index, 1);
        }
    }
    
    // Move the piece
    piece.x = newX;
    piece.y = newY;
    piece.element.style.left = piece.x + 'px';
    piece.element.style.top = piece.y + 'px';
    piece.hasMoved = true;
    
    // Add to move history
    addMoveToHistory(piece, oldX, oldY, newX, newY, isCapture);
    
    // Track last move for en passant (must be reset each move)
    lastMove = {
        piece: piece,
        isDoubleMove: moveData.isDoubleMove || false
    };
    
    // Switch turns
    currentTurn = currentTurn === 'white' ? 'black' : 'white';
    updateTurnIndicator();
    highlightCheck();
    
    // Check for checkmate
    if (checkForCheckmate()) {
        const winner = currentTurn === 'white' ? 'black' : 'white';
        endGame(winner);
    }
    
    clearSelection();
    selectedPiece = null;
}

// ---------------------------
// UNIFIED CLICK HANDLER
// ---------------------------

document.addEventListener('click', function(event) {
    if (gameOver) return;
    
    // Check if click is on board area
    const boardRect = board.getBoundingClientRect();
    const clickX = event.clientX - boardRect.left;
    const clickY = event.clientY - boardRect.top;
    
    // If click is outside board, deselect
    if (clickX < 0 || clickX >= 640 || clickY < 0 || clickY >= 640) {
        if (selectedPiece) {
            clearSelection();
            selectedPiece = null;
        }
        return;
    }
    
    // Convert click to grid position
    const gridX = Math.floor(clickX / step) * step;
    const gridY = Math.floor(clickY / step) * step;
    
    // Check if there's a piece at this position
    const clickedPiece = getPieceAt(gridX, gridY);
    
    if (clickedPiece) {
        // Clicked on a piece
        if (selectedPiece && selectedPiece !== clickedPiece) {
            // Check if it's a valid capture
            const validMoves = getValidMoves(selectedPiece);
            const captureMove = validMoves.find(m => 
                m.x === gridX && m.y === gridY && 
                (m.type === 'capture' || m.type === 'enpassant')
            );
            
            if (captureMove) {
                movePiece(selectedPiece, gridX, gridY, captureMove);
                return;
            }
            
            // If same color, switch selection
            if (clickedPiece.color === currentTurn) {
                clearSelection();
                selectedPiece = clickedPiece;
                
                const squareIndex = getSquareIndex(gridX, gridY);
                const square = squares[squareIndex];
                
                if (isWhiteSquare(gridX, gridY)) {
                    square.classList.add('selected-white');
                } else {
                    square.classList.add('selected-black');
                }
                
                highlightValidMoves(clickedPiece);
            }
            return;
        }
        
        // Can only select pieces of current turn
        if (clickedPiece.color !== currentTurn) {
            return;
        }
        
        // If clicking same piece, deselect
        if (selectedPiece === clickedPiece) {
            clearSelection();
            selectedPiece = null;
            return;
        }
        
        // Select the piece
        clearSelection();
        selectedPiece = clickedPiece;
        
        const squareIndex = getSquareIndex(gridX, gridY);
        const square = squares[squareIndex];
        
        if (isWhiteSquare(gridX, gridY)) {
            square.classList.add('selected-white');
        } else {
            square.classList.add('selected-black');
        }
        
        highlightValidMoves(clickedPiece);
    } else {
        // Clicked on empty square
        if (selectedPiece) {
            // Check if it's a valid move
            const validMoves = getValidMoves(selectedPiece);
            const validMove = validMoves.find(m => m.x === gridX && m.y === gridY);
            
            if (validMove) {
                movePiece(selectedPiece, gridX, gridY, validMove);
            } else {
                // Invalid square clicked, deselect
                clearSelection();
                selectedPiece = null;
            }
        }
    }
});

// Initial check highlight
highlightCheck();