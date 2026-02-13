import React, { useEffect, useState } from 'react'
import CanvasBoard from "./CanvasBoard.jsx";
import ChatInput from "../Chat/ChatInput.jsx";
import socket from "../../socket/socket.js";
import { useNavigate } from "react-router-dom";
import '../../css/Utilities.css'
import '../../css/Game.css'
import useStore from '../../Store/Store.js';

function Game() {

    const navigate = useNavigate();
    const { setIsDrawer, roomId } = useStore()
    
    const [currentDrawer, setCurrentDrawer] = useState(null);
    const [currentRound, setCurrentRound] = useState(1);
    const [totalRounds, setTotalRounds] = useState();
    const [timeRemaining, setTimeRemaining] = useState(60);
    const [wordOptions, setWordOptions] = useState([]);
    const [selectedWord, setSelectedWord] = useState(null);
    const [wordLength, setWordLength] = useState(null);
    const [scores, setScores] = useState({});
    const [guessedPlayers, setGuessedPlayers] = useState(new Set());
    const [roundActive, setRoundActive] = useState(false);
    const [players, setPlayers] = useState([]);
    const [gameOver, setGameOver] = useState(false);
    const [finalScores, setFinalScores] = useState({});
    const [transitionMessage, setTransitionMessage] = useState('');
    const [timerStarted, setTimerStarted] = useState(false);

    useEffect(() => {
        socket.on('room:gameRunning', (gameState, playersInGame) => {
            console.log('Game started with players:', playersInGame);
            console.log('Initial scores:', playersInGame.reduce((acc, p) => {acc[p.id] = 0; return acc}, {}));
            setPlayers(playersInGame);
            // Set total rounds (3 rounds per player)
            setTotalRounds(playersInGame.length * 3);
            // Initialize scores
            const initialScores = {};
            playersInGame.forEach(player => {
                initialScores[player.id] = 0;
            });
            setScores(initialScores);
        })

        // Keep players in sync when lobby emits updated players
        socket.on('room:updatedPlayers', ({ roomId: rid, players: updatedPlayers }) => {
            console.log('room:updatedPlayers received in Game:', updatedPlayers);
            if (Array.isArray(updatedPlayers)) {
                setPlayers(updatedPlayers);
                // Ensure scores object contains all players
                setScores(prev => {
                    const next = { ...(prev || {}) };
                    updatedPlayers.forEach(p => { if (next[p.id] === undefined) next[p.id] = 0 });
                    return next;
                });
            }
        })

        socket.on('round:start', ({round, drawer, wordOptions, scores}) => {
            console.log(`Round ${round} started. Drawer: ${drawer.username}`, wordOptions);
            setTransitionMessage(`Round ${round} - ${drawer.username} is drawing!`);
            setTimeout(() => setTransitionMessage(''), 2000);
            
            setCurrentRound(round);
            setCurrentDrawer(drawer);
            setWordOptions(wordOptions);
            setTimeRemaining(60);
            setScores(scores);
            setSelectedWord(null);
                setWordLength(null);
            setGuessedPlayers(new Set());
            setRoundActive(false); // Wait for word selection
            setTimerStarted(false);
            
                // Set isDrawer flag
                if (drawer.id === socket.id) {
                    setIsDrawer(true);
                } else {
                    setIsDrawer(false);
                }
            
        })

        socket.on('round:timerStart', () => {
            console.log('Timer started!');
            setTimerStarted(true);
            setRoundActive(true);
        })

        socket.on('round:timeUpdate', ({timeRemaining}) => {
            setTimeRemaining(timeRemaining);
        })

        socket.on('round:wordSelected', ({selectedWord, wordLength}) => {
            setSelectedWord(selectedWord);
            setWordLength(wordLength);
        })

        socket.on('guess:correct', ({guesser, points, scores}) => {
            console.log(`${guesser} guessed correctly! +${points} points`);
            setGuessedPlayers(prev => new Set([...prev, guesser]));
            setScores(scores);
                console.log('Updated scores:', scores);
        })

        socket.on('round:end', ({word, scores, allGuessed}) => {
            console.log(`Round ended. The word was: ${word}`, allGuessed ? '- All guessed!' : '- Time up');
            const msg = allGuessed ? `Word was: ${word} - Everyone guessed! 🎉` : `Word was: ${word}`;
            setTransitionMessage(msg);
            setRoundActive(false);
            setTimerStarted(false);
            setScores(scores);
            setSelectedWord(word);
            setGuessedPlayers(new Set());
            setTimeout(() => setTransitionMessage(''), 2500);
        })

        socket.on('game:over', ({scores}) => {
            console.log('Game Over!', scores);
            setGameOver(true);
            setFinalScores(scores);
        })

        socket.on('round:drawerQuit', ({drawer, message}) => {
            console.log('Drawer quit:', drawer);
            alert(message);
            setRoundActive(false);
            setTimerStarted(false);
        })

        socket.on('game:playerQuit', ({scores, players, quitPlayer, reason}) => {
            console.log(`Game ended: ${reason}`);
            alert(`🚳 Game Ended!\n${quitPlayer} quit.\nReason: ${reason}`);
            setGameOver(true);
            setFinalScores(scores);
        })

        socket.on('room:message', (msg)=>{
            alert(msg);
        })

        window.addEventListener('unload', () => {
            navigate('/');
        })

        // Request current room state if we have a roomId (in case we navigated directly)
        if (roomId) {
            socket.emit('room:getState', { roomId });
        }

        return () => {
            socket.off('room:gameRunning');
            socket.off('round:start');
            socket.off('round:timeUpdate');
            socket.off('round:timerStart');
            socket.off('round:wordSelected');
            socket.off('guess:correct');
            socket.off('round:end');
            socket.off('game:over');
            socket.off('room:message');
        }
    }, [navigate, setIsDrawer])

    const handleSelectWord = (word) => {
        socket.emit('round:selectWord', { word });
        setSelectedWord(word);
        setTransitionMessage(`${word} selected - Timer Starting!`);
        setTimeout(() => setTransitionMessage(''), 1500);
    }

    const handleExitGame = () => {
        console.log('exit button clicked');
        socket.emit("exitGame")
        navigate('/')
    }

    const isDrawer = currentDrawer && currentDrawer.id === socket.id;

    if (gameOver) {
        // build ranking array from finalScores and players
        const ranked = players.map(p => ({ id: p.id, username: p.username, score: finalScores[p.id] || 0 }))
            .sort((a,b) => b.score - a.score);

        const top3 = ranked.slice(0,3);
        const rest = ranked.slice(3);
        const winner = top3[0];

        return (
            <div className="game-over-container">
                <div className="game-over-wrapper">
                    <h1 className="game-over-title">🎉 Game Over</h1>
                    {winner && (
                        <h2 className="game-over-winner">
                            {winner.username} won with {winner.score} points
                        </h2>
                    )}

                    {/* Podium */}
                    <div className="podium">
                        {/* second place */}
                        <div className="podium-place">
                            {top3[1] ? (
                                <div>
                                    <div className="podium-card second">
                                        <div className="username">{top3[1].username}</div>
                                        <div className="score">{top3[1].score} pts</div>
                                    </div>
                                    <div className="podium-stand second">
                                        <strong>2</strong>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {/* first place - taller */}
                        <div className="podium-place">
                            {top3[0] ? (
                                <div>
                                    <div className="podium-card first">
                                        <div className="username">{top3[0].username}</div>
                                        <div className="score">{top3[0].score} pts</div>
                                    </div>
                                    <div className="podium-stand first">
                                        <strong>1</strong>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {/* third place */}
                        <div className="podium-place">
                            {top3[2] ? (
                                <div>
                                    <div className="podium-card third">
                                        <div className="username">{top3[2].username}</div>
                                        <div className="score">{top3[2].score} pts</div>
                                    </div>
                                    <div className="podium-stand third">
                                        <strong>3</strong>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* Rest list */}
                    {rest && rest.length > 0 && (
                        <div className="others-section">
                            <h3>Other Players</h3>
                            <div className="others-grid">
                                {rest.map((p) => (
                                    <div key={p.id} className="other-player">
                                        <div className="name">{p.username}</div>
                                        <div className="score">{p.score} pts</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="game-over-btn">
                        <button onClick={handleExitGame}>Back to Lobby</button>
                    </div>
                </div>
            </div>
        );
    }

    // Transition overlay
    const showTransition = transitionMessage.length > 0;

    return (
        <div className="game-container">
            {/* Transition Overlay */}
            {showTransition && (
                <div className="transition-overlay">
                    <div className="transition-message">
                        {transitionMessage}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeInOut {
                    0% { opacity: 0; }
                    20% { opacity: 1; }
                    80% { opacity: 1; }
                    100% { opacity: 0; }
                }
            `}</style>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div className="game-header">
                    <div className="game-header-info">
                        <div className="header-item">
                            <strong>Round:</strong> {currentRound}/{players.length *3}
                        </div>
                        <div className={`header-item ${timerStarted ? (timeRemaining <= 10 ? 'low-time' : 'normal-time') : ''}`} style={{color: timerStarted ? (timeRemaining <= 10 ? '#ff4444' : '#4eff44') : '#999'}}>
                            <strong>⏱️ Time:</strong> {timerStarted ? timeRemaining : '⏳ waiting for word'}
                        </div>
                    </div>
                    <div className="game-header-center">
                        {wordLength && (
                            <div className="word-display">
                                {isDrawer ? (
                                    <span>{selectedWord} <span className="word-display-hint">({wordLength} letters)</span></span>
                                ) : (
                                    <span>
                                        {Array(wordLength).fill('_').join(' ')}
                                        <span className="word-display-hint">({wordLength} letters)</span>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="game-header-drawer">
                        <div className="header-item">
                            <strong>Drawer:</strong> {currentDrawer ? currentDrawer.username : 'Loading...'} 
                            {isDrawer && <span style={{ color: '#ffaa00' }}> (YOU)</span>}
                        </div>
                    </div>
                </div>

                {/* Word Selection (only for drawer) */}
                {isDrawer && !timerStarted && wordOptions.length > 0 && !selectedWord && (
                    <div className="word-selection">
                        <h3>Choose a word to draw:</h3>
                        <div className="word-options">
                            {wordOptions.map((word, idx) => (
                                <button
                                    key={idx}
                                    className="word-btn"
                                    onClick={() => handleSelectWord(word)}
                                >
                                    {word}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Canvas and Chat */}
                <div className="game-content">
                    <div className="canvas-container">
                        <CanvasBoard isDrawer={isDrawer} />
                    </div>
                    <div className="chat-container">
                        <ChatInput isDrawer={isDrawer} guessedPlayers={guessedPlayers} roundActive={roundActive} />
                    </div>

                    {/* Leaderboard */}
                    <div className="leaderboard">
                        <h3>📊 Scores</h3>
                        <div className="leaderboard-info">
                            Players: {players.length}
                        </div>
                        <div>
                            {players && players.length > 0 ? (
                                players.map((player, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`player-item ${player.id === socket.id ? 'current' : ''}`}
                                    >
                                        <div className="player-name">
                                            <strong>{player.username}</strong>
                                            {currentDrawer && player.id === currentDrawer.id && <span style={{ color: '#4eff44' }}> 🎨</span>}
                                        </div>
                                        <div className="player-score">
                                            {scores && scores[player.id] !== undefined ? scores[player.id] : 0} pts
                                        </div>
                                        {guessedPlayers.has(player.username) && (
                                            <div className="player-guessed">✓ Guessed</div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
                                    Waiting for players...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <button 
                className="exit-btn"
                onClick={handleExitGame}
            >
                Exit Game
            </button>
        </div>
    )
}

export default Game