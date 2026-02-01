import React, { useEffect, useState } from 'react'
import CanvasBoard from "./CanvasBoard.jsx";
import ChatInput from "../Chat/ChatInput.jsx";
import socket from "../../socket/socket.js";
import { useNavigate } from "react-router-dom";
import '../../css/Utilities.css'
import useStore from '../../Store/Store.js';

function Game() {

    const navigate = useNavigate();
    const { setIsDrawer, roomId } = useStore()
    
    const [currentDrawer, setCurrentDrawer] = useState(null);
    const [currentRound, setCurrentRound] = useState(1);
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
            <div style={{ padding: '20px', background: '#0f0b16', color: '#fff', minHeight: '100vh', boxSizing: 'border-box' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto', padding: 20 }}>
                    <h1 style={{ textAlign: 'center', margin: 0, fontSize: 36 }}>🎉 Game Over</h1>
                    {winner && (
                        <h2 style={{ textAlign: 'center', marginTop: 8, color: '#e6d0ff' }}>
                            {winner.username} won with {winner.score} points
                        </h2>
                    )}

                    {/* Podium */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 20, alignItems: 'flex-end', marginTop: 30, flexWrap: 'wrap' }}>
                        {/* second place */}
                        <div style={{ width: 200, textAlign: 'center' }}>
                            {top3[1] ? (
                                <div>
                                    <div style={{ background: '#6b4b9c', padding: 16, borderRadius: 8, color: '#fff' }}>
                                        <div style={{ fontSize: 18 }}>{top3[1].username}</div>
                                        <div style={{ fontSize: 14, color: '#ffd7fb' }}>{top3[1].score} pts</div>
                                    </div>
                                    <div style={{ height: 80, background: '#2a2130', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}>
                                        <strong style={{ color: '#cfc7ff' }}>2</strong>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {/* first place - taller */}
                        <div style={{ width: 220, textAlign: 'center' }}>
                            {top3[0] ? (
                                <div>
                                    <div style={{ background: '#9b6bff', padding: 18, borderRadius: 10, color: '#fff' }}>
                                        <div style={{ fontSize: 20 }}>{top3[0].username}</div>
                                        <div style={{ fontSize: 16, color: '#fff3' }}>{top3[0].score} pts</div>
                                    </div>
                                    <div style={{ height: 110, background: '#27162b', marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
                                        <strong style={{ fontSize: 22, color: '#fff' }}>1</strong>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {/* third place */}
                        <div style={{ width: 200, textAlign: 'center' }}>
                            {top3[2] ? (
                                <div>
                                    <div style={{ background: '#6b4b9c', padding: 16, borderRadius: 8, color: '#fff' }}>
                                        <div style={{ fontSize: 18 }}>{top3[2].username}</div>
                                        <div style={{ fontSize: 14, color: '#ffd7fb' }}>{top3[2].score} pts</div>
                                    </div>
                                    <div style={{ height: 60, background: '#2a2130', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}>
                                        <strong style={{ color: '#cfc7ff' }}>3</strong>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* Rest list */}
                    {rest && rest.length > 0 && (
                        <div style={{ marginTop: 40, background: '#120812', padding: 16, borderRadius: 8 }}>
                            <h3 style={{ margin: '0 0 10px 0', color: '#e6d0ff' }}>Other Players</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                                {rest.map((p) => (
                                    <div key={p.id} style={{ padding: 12, background: '#1b1220', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ color: '#fff' }}>{p.username}</div>
                                        <div style={{ color: '#d6b6ff', fontWeight: 'bold' }}>{p.score} pts</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ textAlign: 'center', marginTop: 30 }}>
                        <button onClick={handleExitGame} style={{ padding: '10px 20px', fontSize: '16px', background: '#7b3fff', color: '#fff', border: 'none', borderRadius: 6 }}>Back to Lobby</button>
                    </div>
                </div>
            </div>
        );
    }

    // Transition overlay
    const showTransition = transitionMessage.length > 0;

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#0a0a0a', color: '#fff', position: 'relative' }}>
            {/* Transition Overlay */}
            {showTransition && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                    animation: 'fadeInOut 2s ease-in-out'
                }}>
                    <div style={{
                        fontSize: '32px',
                        fontWeight: 'bold',
                        color: '#4eff44',
                        textAlign: 'center',
                        textShadow: '0 0 20px #4eff44'
                    }}>
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
                <div style={{ padding: '15px', background: '#1a1a1a', borderBottom: '2px solid #444' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ fontSize: '18px', marginRight: '20px' }}>
                                <strong>Round:</strong> {currentRound}/3
                            </span>
                            <span style={{ fontSize: '18px', color: timerStarted ? (timeRemaining <= 10 ? '#ff4444' : '#4eff44') : '#999' }}>
                                <strong>⏱️ Time:</strong> {timerStarted ? timeRemaining : '⏳ waiting for word'}
                            </span>
                        </div>
                        <div style={{ fontSize: '18px', textAlign: 'center', flex: 1 }}>
                            {wordLength && (
                                <div style={{ color: '#4eff44', fontWeight: 'bold', fontSize: '20px' }}>
                                    {isDrawer ? (
                                        <span>{selectedWord} <span style={{ fontSize: '14px', color: '#ffaa00' }}>({wordLength} letters)</span></span>
                                    ) : (
                                        <span>
                                            {Array(wordLength).fill('_').join(' ')}
                                            <span style={{ fontSize: '14px', color: '#ffaa00', marginLeft: '10px' }}>({wordLength} letters)</span>
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                        <div style={{ fontSize: '18px' }}>
                            <strong>Drawer:</strong> {currentDrawer ? currentDrawer.username : 'Loading...'} 
                            {isDrawer && <span style={{ color: '#ffaa00' }}> (YOU)</span>}
                        </div>
                    </div>
                </div>

                {/* Word Selection (only for drawer) */}
                {isDrawer && !timerStarted && wordOptions.length > 0 && !selectedWord && (
                    <div style={{ padding: '15px', background: '#1a1a1a', borderBottom: '2px solid #444', textAlign: 'center' }}>
                        <h3>Choose a word to draw:</h3>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {wordOptions.map((word, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSelectWord(word)}
                                    style={{
                                        padding: '10px 20px',
                                        fontSize: '16px',
                                        background: '#2a7f62',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '5px',
                                        cursor: 'pointer',
                                        transition: 'background 0.3s'
                                    }}
                                    onMouseOver={(e) => e.target.style.background = '#40a77d'}
                                    onMouseOut={(e) => e.target.style.background = '#2a7f62'}
                                >
                                    {word}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Canvas and Chat */}
                <div style={{ display: 'flex', flex: 1 }}>
                    <div style={{ flex: 1, display: 'flex' }}>
                        <CanvasBoard isDrawer={isDrawer} />
                        <div style={{ width: '300px' }}>
                            <ChatInput isDrawer={isDrawer} guessedPlayers={guessedPlayers} roundActive={roundActive} />
                        </div>
                    </div>

                    {/* Leaderboard */}
                    <div style={{ width: '250px', background: '#1a1a1a', borderLeft: '2px solid #444', padding: '15px', overflowY: 'auto', maxHeight: '100%' }}>
                        <h3 style={{ textAlign: 'center', marginTop: 0 }}>📊 Scores</h3>
                        <div style={{ fontSize: '10px', color: '#666', marginBottom: '10px', textAlign: 'center' }}>
                            Players: {players.length}
                        </div>
                        <div>
                            {players && players.length > 0 ? (
                                players.map((player, idx) => (
                                    <div 
                                        key={idx} 
                                        style={{
                                            padding: '10px',
                                            background: player.id === socket.id ? '#2a2a2a' : '#0a0a0a',
                                            margin: '5px 0',
                                            borderLeft: player.id === socket.id ? '4px solid #ffaa00' : 'none',
                                            borderRadius: '3px'
                                        }}
                                    >
                                        <div style={{ fontSize: '14px' }}>
                                            <strong>{player.username}</strong>
                                            {currentDrawer && player.id === currentDrawer.id && <span style={{ color: '#4eff44' }}> 🎨</span>}
                                        </div>
                                        <div style={{ fontSize: '18px', color: '#ffaa00', fontWeight: 'bold' }}>
                                            {scores && scores[player.id] !== undefined ? scores[player.id] : 0} pts
                                        </div>
                                        {guessedPlayers.has(player.username) && (
                                            <div style={{ fontSize: '12px', color: '#4eff44' }}>✓ Guessed</div>
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
                onClick={handleExitGame}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    padding: '10px 20px',
                    background: '#ff4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '14px'
                }}
            >
                Exit Game
            </button>
        </div>
    )
}

export default Game