import express from 'express'
import {createServer} from 'node:http';
import {Server} from 'socket.io';
import {join, dirname} from "path";
import {fileURLToPath} from "url";
import cors from 'cors'
import { log } from 'node:console';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const RoomHosts = new Map();
const RoomPlayers = new Map();
const RoomDrawings = new Map();
// New: Track current stroke color for each room
const RoomStrokeColors = new Map();
// Track current drawer per room
const RoomCurrentDrawer = new Map();

// Drawable words list (50 easy drawable words)
const DRAWABLE_WORDS = [
  "apple", "banana", "cat", "dog", "house", "tree", "sun", "moon", "star", "cloud",
  "car", "bus", "train", "plane", "bicycle", "boat", "flower", "fish", "bird", "butterfly",
  "pizza", "hamburger", "ice cream", "cake", "sandwich", "heart", "star", "diamond", "circle", "square",
  "mountain", "river", "bridge", "tower", "castle", "rocket", "alien", "dinosaur", "elephant", "lion",
  "snake", "spider", "guitar", "piano", "drum", "flag", "umbrella", "shoe", "hat", "cup",
  "bottle", "clock", "telescope", "microscope", "anchor", "book", "pencil", "scissors"
];

// Game state per room
const RoomGameState = new Map();

// Helper: Initialize game state for a room
function initializeGameState(roomId, players) {
  return {
    currentRound: 0,
    totalRounds: 3,
    currentDrawerIndex: 0,
    currentWord: null,
    wordOptions: [],
    gameActive: false,
    timeRemaining: 60,
    scores: players.reduce((acc, player) => {
      acc[player.id] = 0;
      return acc;
    }, {}),
    roundGuessers: new Set(), // players who guessed correctly in current round
    roundActive: false,
    roundStartTime: null,
    gameTimer: null
  };
}

// Helper: Get random words
function getRandomWords(count = 4) {
  const shuffled = [...DRAWABLE_WORDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Helper: Calculate points based on remaining time
function calculatePoints(timeRemaining) {
  if (timeRemaining > 50) return 250;  // 50+ seconds
  if (timeRemaining > 40) return 200;  // 40-50 seconds
  if (timeRemaining > 30) return 150;  // 30-40 seconds
  if (timeRemaining > 20) return 100;  // 20-30 seconds
  if (timeRemaining > 10) return 50;   // 10-20 seconds
  if (timeRemaining > 0) return 50;    // 1-10 seconds: still 50 points
  return 0;
}

const PORT = process.env.PORT || 3000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server(server, {
    cors: {
        origin: CLIENT_URL,
        methods: ["GET", "POST"],
        credentials: true
    }
})

app.use(cors({
    origin: CLIENT_URL,
    credentials: true
}))
app.use(express.static(join(__dirname, "../client/dist")))

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, "../client/dist/index.html"))
});

// Handle client-side routing for SPA
app.use((req, res) => {
  res.sendFile(join(__dirname, "../client/dist/index.html"));
});

io.on('connection', (socket) => {

    socket.on('chatMessage', ({Chat, username}) => {
        const msg = Chat;
        console.log(username + ":" + msg)
        const roomId = socket.roomId
        if (roomId) {
            const gameState = RoomGameState.get(roomId);
            const players = RoomPlayers.get(roomId);
            
            // Check if game is active and if this message is a correct guess
            if (gameState && gameState.roundActive && gameState.currentWord) {
                const normalizedMsg = msg.trim().toLowerCase();
                const normalizedWord = gameState.currentWord.toLowerCase();
                
                // Check if message matches the word and player hasn't guessed yet
                if (normalizedMsg === normalizedWord && !gameState.roundGuessers.has(socket.id)) {
                    // Calculate points based on remaining time
                    const points = calculatePoints(gameState.timeRemaining);
                    gameState.scores[socket.id] = (gameState.scores[socket.id] || 0) + points;
                    gameState.roundGuessers.add(socket.id);
                    RoomGameState.set(roomId, gameState);
                    
                    // Notify all clients about correct guess
                    io.to(roomId).emit("guess:correct", {
                        guesser: username,
                        points: points,
                        timeRemaining: gameState.timeRemaining,
                        scores: gameState.scores
                    });
                    
                    console.log(`${username} guessed correctly! Points: ${points}`);
                    
                    // Check if all non-drawer players have guessed
                    const totalGuessers = players.length - 1; // Total players minus drawer
                    if (gameState.roundGuessers.size === totalGuessers) {
                        console.log(`All players guessed! Ending round early in room ${roomId}`);
                        
                        // End round immediately
                        gameState.roundActive = false;
                        RoomGameState.set(roomId, gameState);
                        
                        // Clear the timer
                        if (gameState.gameTimer) {
                            clearInterval(gameState.gameTimer);
                        }
                        
                        // Emit round end
                        io.to(roomId).emit("round:end", {
                            word: gameState.currentWord,
                            scores: gameState.scores,
                            allGuessed: true
                        });
                        
                        // Move to next round
                        gameState.currentRound++;
                        gameState.currentDrawerIndex = (gameState.currentDrawerIndex + 1) % players.length;
                        RoomGameState.set(roomId, gameState);
                        
                        setTimeout(() => startNextRound(roomId, io), 3000);
                    }
                    
                    return; // Don't broadcast this as a regular chat message
                }
            }
            
            // Broadcast as regular chat message if not a correct guess or game not active
            io.to(roomId).emit("chatMessage", {username, msg})
        } else {
            io.to(roomId).emit("room:error", "something went wrong")
        }
    })

    socket.on('createRoom', ({roomId, username}) => {
        socket.username = username
        socket.roomId = roomId
        socket.join(roomId)
        RoomHosts.set(roomId, username)
        RoomPlayers.set(roomId, [{username, id: socket.id}])
        RoomDrawings.set(roomId, [])
        RoomStrokeColors.set(roomId, {
            colorName: 'White',
            colorValue: '#ffffff'
        })

        io.to(roomId).emit("room:created", ({roomId, host: username}))
        io.to(roomId).emit("room:updatedPlayers", {
            roomId, players: RoomPlayers.get(roomId), host: username
        })
        console.log(`room : ${roomId} created by ${username}`);
    })

    socket.on('JoinRoom', ({roomId, username , gameState}) => {
        const room = io.sockets.adapter.rooms.get(roomId)
        if (!room) {
            socket.emit("room:error", "room does not exist")
        } else {

            socket.join(roomId)
            socket.username = username
            socket.roomId = roomId
            const currentPlayers = RoomPlayers.get(roomId) || []
            const host = RoomHosts.get(roomId)
            RoomPlayers.set(roomId, [...currentPlayers, {username, id: socket.id}])

            const existingDrawing = RoomDrawings.get(roomId);
            if (existingDrawing && existingDrawing.length > 0) {
                socket.emit("room:DrawStrokes", existingDrawing)
            }
            const currentColor = RoomStrokeColors.get(roomId);
            if (currentColor) {
                socket.emit("room:strokeColor", currentColor)
            }

            if (gameState) {
                socket.emit("room:gameRunning" , gameState , roomId)
            }
            io.to(roomId).emit("room:joined", {username, roomId, host})
            io.to(roomId).emit("room:updatedPlayers", {
                roomId, players: RoomPlayers.get(roomId), host: RoomHosts.get(roomId),
            })

            console.log(`${username} joined room: ${roomId}`)
            io.to(roomId).emit("room:message", `${username} Joined the Room`)
        }
    })

    socket.on("room:getState", ({roomId}) => {
        const players = RoomPlayers.get(roomId);
        const host = RoomHosts.get(roomId);

        if (players && host) {
            io.to(socket.id).emit("room:updatedPlayers", {
                roomId, players, host
            });
        } else {
            socket.emit("room:error", "Room state not found");
        }
    });

    socket.on('Drawing', (data) => {
        const roomId = socket.roomId

        if (roomId) {
            let strokes;
            if (Array.isArray(data)) {
                strokes = data;
            } else if (data.strokes) {
                strokes = data.strokes
            } else {
                console.log("Invalid data format");
                io.to(roomId).emit("room:error", "Invalid Data Format")
                return
            }

            const validStrokes = strokes.filter((stroke) => stroke &&
                typeof stroke.x === "number" &&
                typeof stroke.y === "number" &&
                (stroke.type === "start" || stroke.type === "move"))

            if (validStrokes.length === 0) {
                console.log("No Valid Strokes Data Found")
                return
            }
            const currentRoomColor = RoomStrokeColors.get(roomId);
            const strokesWithCurrentColor = validStrokes.map(stroke => ({...stroke,color: currentRoomColor ? currentRoomColor.colorValue : '#ffffff'
            }));

            const RoomDrawing = RoomDrawings.get(roomId)
            if (!RoomDrawings.has(roomId)) {
                RoomDrawings.set(roomId, strokesWithCurrentColor);
            } else {
                RoomDrawing.push(...strokesWithCurrentColor);
            }

            socket.to(roomId).emit("room:DrawStrokes", strokesWithCurrentColor)
            console.log(`Drawing Strokes Received at the Backend from ${socket.username} in room : ${roomId} with color: ${currentRoomColor?.colorValue}`);
        } else {
            console.log("No Room ID Found");
        }
    })

    socket.on('room:setStrokeColor', (colorData) => {
        const roomId = socket.roomId
        if (!roomId) return console.log('No roomId found for color change');

        console.log(`Color change in backend from ${socket.username} in room ${roomId}:`, colorData);

        RoomStrokeColors.set(roomId, {
            colorName: colorData.colorName,
            colorValue: colorData.colorValue
        });

        io.to(roomId).emit('room:strokeColor', {
            colorName: colorData.colorName,
            colorValue: colorData.colorValue,
        })

        console.log(`Color broadcasted to all clients in room ${roomId}: ${colorData.colorName} (${colorData.colorValue})`);
    })

    socket.on("ClearCanvas", () => {
        const roomId = socket.roomId

        if (!roomId) {
            console.log("No Room ID Found To Clear Canvas");
            return
        }

        RoomDrawings.set(roomId, [])
        io.to(roomId).emit("room:CanvasCleared")
        console.log(`Canvas cleared in room ${roomId} by ${socket.username}`);
    })

    socket.on("InterPolationPoints", ({startpoint, lastpoint}) => {
        const roomId = socket.roomId
        if (!roomId) return

        // Get current room color for interpolation
        const currentRoomColor = RoomStrokeColors.get(roomId);

        socket.to(roomId).emit("room:interPolationPoints", {
            startpoint,
            lastpoint,
            color: currentRoomColor ? currentRoomColor.colorValue : '#ffffff'
        });
    })

    socket.on('startGame', (gameState) => {
        const roomId = socket.roomId
        if (!roomId) {
            console.log("No Room ID Found To StartGame");
            return;
        }
        const playersInGame = RoomPlayers.get(roomId);
        
        // Validate minimum 2 players
        if (!Array.isArray(playersInGame) || playersInGame.length < 2) {
            socket.emit("room:error", "Need at least 2 players to start the game!");
            console.log(`Attempted to start game in room ${roomId} with only ${playersInGame?.length || 0} players`);
            return;
        }
        
        if (gameState){
            console.log("Game is running in room", roomId, "Players:", playersInGame);
            
            // Initialize game state
            const gameStateObj = initializeGameState(roomId, playersInGame);
            gameStateObj.gameActive = true; // Mark game as active
            RoomGameState.set(roomId, gameStateObj);
            
            // Inform clients that game state is running
            io.to(roomId).emit("room:gameRunning", gameState, playersInGame);
            
            // Start first round after a short delay
            setTimeout(() => startNextRound(roomId, io), 500);
        } else {
            console.log("Some Error Occurred in StartGame")
        }
    })

    // Start next round
    function startNextRound(roomId, io) {
        const gameState = RoomGameState.get(roomId);
        const players = RoomPlayers.get(roomId);
        
        if (!gameState || !players) return;
        
        // Check if game is over
        if (gameState.currentRound >= gameState.totalRounds) {
            io.to(roomId).emit("game:over", {
                scores: gameState.scores,
                players: players
            });
            console.log(`Game Over in room ${roomId}`);
            return;
        }
        
        // Get current drawer
        const drawer = players[gameState.currentDrawerIndex];
        gameState.currentDrawer = drawer;
        gameState.roundGuessers = new Set();
        gameState.timeRemaining = 60;
        gameState.roundActive = false; // Not active until word is selected
        gameState.roundStartTime = null;
        gameState.currentWord = null; // Will be set when drawer chooses
        
        // Get 4 random words for this round
        gameState.wordOptions = getRandomWords(4);
        
        RoomGameState.set(roomId, gameState);
        
        // Clear canvas for everyone
        io.to(roomId).emit("room:CanvasCleared");
        RoomDrawings.set(roomId, []);
        
        // Notify all clients about new round (waiting for word selection)
        io.to(roomId).emit("round:start", {
            round: gameState.currentRound + 1,
            drawer: drawer,
            wordOptions: gameState.wordOptions,
            timeRemaining: 60,
            scores: gameState.scores,
            wordLength: null // Will be updated when word is selected
        });
        
        console.log(`Round ${gameState.currentRound + 1} started in room ${roomId} with drawer ${drawer.username} - waiting for word selection`);
    }

    // Timer for each round
    function startRoundTimer(roomId, io) {
        const gameState = RoomGameState.get(roomId);
        if (!gameState || !gameState.roundActive) return;
        
        let timeLeft = 60;
        
        const timerInterval = setInterval(() => {
            timeLeft--;
            gameState.timeRemaining = timeLeft;
            
            // Broadcast time update
            io.to(roomId).emit("round:timeUpdate", { timeRemaining: timeLeft });
            
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                gameState.roundActive = false;
                RoomGameState.set(roomId, gameState);
                
                // Move to next drawer
                gameState.currentRound++;
                gameState.currentDrawerIndex = (gameState.currentDrawerIndex + 1) % RoomPlayers.get(roomId).length;
                RoomGameState.set(roomId, gameState);
                
                // Notify round end and start next round
                io.to(roomId).emit("round:end", {
                    word: gameState.currentWord,
                    scores: gameState.scores
                });
                
                console.log(`Round ${gameState.currentRound} ending. Next round in 3 seconds...`);
                setTimeout(() => startNextRound(roomId, io), 3000);
            }
        }, 1000);
        
        gameState.gameTimer = timerInterval;
    }

    socket.on('round:selectWord', ({word}) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        
        const gameState = RoomGameState.get(roomId);
        if (!gameState) return;
        
        // Verify drawer is the one selecting
        if (gameState.currentDrawer && gameState.currentDrawer.id === socket.id) {
            gameState.currentWord = word;
            gameState.roundActive = true; // NOW round is active
            gameState.roundStartTime = Date.now();
            RoomGameState.set(roomId, gameState);
            
            // Notify all clients that word has been selected
            io.to(roomId).emit("round:wordSelected", {
                drawer: gameState.currentDrawer.username,
                selectedWord: word, // Only drawer sees this
                wordLength: word.length // Everyone sees the length
            });
            
            // Notify clients to start timer
            io.to(roomId).emit("round:timerStart", { timeRemaining: 60 });
            
            console.log(`Drawer ${gameState.currentDrawer.username} selected word: ${word} - Timer Started`);
            
            // NOW start the round timer
            startRoundTimer(roomId, io);
        }
    })

    socket.on('exitGame', ()=>{
        const roomId = socket.roomId
        const username = socket.username
        console.log(`${username} left the game`);
        io.to(roomId).emit("room:message", `${username} left the Game`)
    })

    socket.on('disconnect', () => {
        const username = socket.username
        const roomId = socket.roomId

        if (!roomId || !RoomPlayers.has(roomId)) {
            return;
        }
        
        const gameState = RoomGameState.get(roomId);
        const players = RoomPlayers.get(roomId);
        
        // Check if a player quit during active game
        if (gameState && gameState.gameActive) {
            // If drawer quit during a round
            if (gameState.roundActive && gameState.currentDrawer && gameState.currentDrawer.id === socket.id) {
                console.log(`Drawer ${username} quit during active round in room ${roomId}`);
                // Cancel round - no points awarded
                gameState.roundActive = false;
                if (gameState.gameTimer) clearInterval(gameState.gameTimer);
                
                // Notify all clients that drawer quit
                io.to(roomId).emit("round:drawerQuit", {
                    drawer: username,
                    message: `${username} (drawer) quit! Round cancelled. No points awarded.`
                });
                
                // End game immediately
                gameState.gameActive = false;
                RoomGameState.set(roomId, gameState);
                
                io.to(roomId).emit("game:playerQuit", {
                    scores: gameState.scores,
                    players: players,
                    quitPlayer: username,
                    reason: "Drawer quit during active round"
                });
                console.log(`Game ended in room ${roomId} due to drawer quit`);
                return;
            }
            // If any other player quit during active game
            else if (gameState.roundActive) {
                console.log(`Player ${username} quit during active game in room ${roomId}`);
                // End game immediately
                gameState.gameActive = false;
                if (gameState.gameTimer) clearInterval(gameState.gameTimer);
                RoomGameState.set(roomId, gameState);
                
                io.to(roomId).emit("game:playerQuit", {
                    scores: gameState.scores,
                    players: players,
                    quitPlayer: username,
                    reason: "A player quit during the game"
                });
                console.log(`Game ended in room ${roomId} due to player quit`);
                return;
            }
        }
        
        // Normal disconnect (not during game)
        let updatedPlayers = players.filter((player) => player.id !== socket.id)
        RoomPlayers.set(roomId, updatedPlayers)

        if (RoomHosts.get(roomId) === username) {
            if (updatedPlayers.length > 0) {
                let newHost = updatedPlayers[0]
                RoomHosts.set(roomId, newHost.username)
                io.to(roomId).emit("room:newHost", `${newHost.username} is the new Host`)
            } else {
                // Clean up all room data when last player leaves
                RoomHosts.delete(roomId)
                RoomPlayers.delete(roomId)
                RoomDrawings.delete(roomId)
                RoomStrokeColors.delete(roomId)
                RoomCurrentDrawer.delete(roomId)
                RoomGameState.delete(roomId)
                console.log(`Room ${roomId} deleted - No Players Left`);
            }
        }
        io.to(roomId).emit("room:message", `${username} left the room`);
        console.log("room:message", `${username} left the room`);
        io.to(roomId).emit("room:updatedPlayers", {
            roomId, players: updatedPlayers, host: RoomHosts.get(roomId)
        })
    })
})

server.listen(PORT, () => {
    console.log(`Server running at port ${PORT}`);
});