const board = document.getElementById('board');
const turnIndicator = document.getElementById('turn-indicator');
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
    turnIndicator.textContent = currentTurn === 'white' ? "White's Turn" : "Black's Turn";
}

function isValidPosition(x, y) {
    return x >= 0 && x < 640 && y >= 0 && y < 640;
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
            
            // En passant
            if (lastMove && lastMove.isDoubleMove && lastMove.piece.type === 'pawn' && lastMove.piece.color !== piece.color) {
                const lastPiece = lastMove.piece;
                if (lastPiece.y === piece.y && Math.abs(lastPiece.x - piece.x) === step) {
                    if (pos.x === lastPiece.x && pos.y === lastPiece.y + direction) {
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
    // Queen moves like both rook and bishop
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

function getValidMoves(piece) {
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

function movePiece(piece, newX, newY, moveData) {
    // Handle captures
    if (moveData.type === 'capture' || moveData.type === 'enpassant') {
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
    
    // Track last move for en passant
    lastMove = {
        piece: piece,
        isDoubleMove: moveData.isDoubleMove || false
    };
    
    // Switch turns
    currentTurn = currentTurn === 'white' ? 'black' : 'white';
    updateTurnIndicator();
    
    clearSelection();
    selectedPiece = null;
}

// ---------------------------
// PIECE SELECTION AND MOVEMENT
// ---------------------------
pieces.forEach((piece) => {
    piece.element.addEventListener('click', function(event) {
        event.stopPropagation();
        
        // If a piece is selected, check if clicking on an enemy piece to capture
        if (selectedPiece && selectedPiece !== piece) {
            const validMoves = getValidMoves(selectedPiece);
            const captureMove = validMoves.find(m => 
                m.x === piece.x && m.y === piece.y && 
                (m.type === 'capture' || m.type === 'enpassant')
            );
            
            if (captureMove) {
                movePiece(selectedPiece, piece.x, piece.y, captureMove);
                return;
            }
        }
        
        // Can only select pieces of current turn
        if (piece.color !== currentTurn) {
            return;
        }
        
        // Clear previous selection
        clearSelection();
        
        // Set new selection
        selectedPiece = piece;
        
        // Highlight the square
        const squareIndex = getSquareIndex(piece.x, piece.y);
        const square = squares[squareIndex];
        
        if (isWhiteSquare(piece.x, piece.y)) {
            square.classList.add('selected-white');
        } else {
            square.classList.add('selected-black');
        }
        
        // Show valid moves
        highlightValidMoves(piece);
    });
});

// Click on squares to move
squares.forEach((square, index) => {
    square.addEventListener('click', function(event) {
        if (!selectedPiece) return;
        
        const col = index % 8;
        const row = Math.floor(index / 8);
        const targetX = col * step;
        const targetY = row * step;
        
        // Check if this is a valid move
        const validMoves = getValidMoves(selectedPiece);
        const validMove = validMoves.find(m => m.x === targetX && m.y === targetY);
        
        if (validMove) {
            movePiece(selectedPiece, targetX, targetY, validMove);
        }
    });
});

// Click on board to deselect
board.addEventListener('click', function(event) {
    if (event.target === board) {
        clearSelection();
        selectedPiece = null;
    }
});