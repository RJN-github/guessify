import React, {useEffect, useRef, useState} from 'react'
import useStore from '../../Store/Store'
import socket from '../../socket/socket'
import {useNavigate} from 'react-router-dom'
import '../../css/JoinRoom.css'
import Game from "../Game/Game.jsx";

function JoinRoom() {
    const username = useStore((s) => s.username)
    const roomId = useStore((s) => s.roomId)
    const setUsername = useStore((s) => s.setUsername)
    const setRoomId = useStore((s) => s.setRoomId)
    const setPlayers = useStore((s) => s.setPlayers)
    const setHost = useStore((s) => s.setHost)
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const GameRunning = useRef(false)

    useEffect(() => {
        socket.on("room:error", (message) => {
            setError(message)
            setLoading(false)
            setTimeout(() => setError(''), 5000)
        })

        socket.on("room:joined", ({players, host, roomId}) => {
            console.log("room joined trigger")
            setRoomId(roomId)
            setPlayers(players)
            setHost(host)

            socket.emit("room:getState", {roomId})
            sessionStorage.setItem('joined', 'true')
            setLoading(false)
        })

        return () => {
            socket.off("room:error")
            socket.off("room:joined")
            socket.off("room:gameRunning")
        }
    }, [navigate, setPlayers, setRoomId, setHost])

    const HandleJoinRoom = () => {
        if (!username.trim() || !roomId.trim()) {
            setError("Enter both username and room ID")
            setTimeout(() => setError(''), 5000)
            return
        }
        setLoading(true)
        setError('')
        socket.emit("JoinRoom", {
            roomId: roomId.trim(),
            username: username.trim() ,
            gameState : GameRunning.current
        })
        socket.emit("startGame" , (gameState) =>{
            console.log(gameState)
        socket.on("room:gameRunning" , (state , players) => {
            console.log("state from backend is" , state , "players", players)
            GameRunning.current = state
        console.log(GameRunning.current)
        })
        })
        navigate(`/lobby/${roomId}`)
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            HandleJoinRoom()
        }
    }

    return (<div className="join-room-container">
        <div className="join-room-content">
            {/* Header */}
            <div className="header">
                <div className="game-icon">🚪</div>
                <h1 className="title">Join Room</h1>
                <p className="subtitle">Enter your details to join the game</p>
            </div>

            {/* Error Message */}
            {error && (<div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
            </div>)}

            {/* Input Fields */}
            <div className="input-section">
                <div className="input-group">
                    <label className="input-label">👤 Your Name</label>
                    <input
                        type="text"
                        placeholder="Enter your display name"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="name-input"
                        disabled={loading}
                    />
                </div>

                <div className="input-group">
                    <label className="input-label">🏠 Room Code</label>
                    <input
                        type="text"
                        placeholder="Enter 6-digit room code"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                        onKeyPress={handleKeyPress}
                        className="room-input"
                        disabled={loading}
                        maxLength={6}
                    />
                </div>
            </div>

            {/* Join Button */}
            <button
                onClick={HandleJoinRoom}
                className={`join-btn ${loading ? 'loading' : ''}`}
                disabled={loading || !username.trim() || !roomId.trim()}
            >
                {loading ? (<>
                    <span className="spinner"></span>
                    Joining...
                </>) : (<>
                    🚀 Join Room
                </>)}
            </button>

            <div className="tips-section">
                <h3 className="tips-title">💡 Quick Tips</h3>
                <div className="tips-list">
                    <div className="tip-item">
                        <span className="tip-icon">✨</span>
                        <span>Ask your friend for the 6-digit room code</span>
                    </div>
                    <div className="tip-item">
                        <span className="tip-icon">🎨</span>
                        <span>Choose a fun username others will recognize</span>
                    </div>
                    <div className="tip-item">
                        <span className="tip-icon">⚡</span>
                        <span>Press Enter to quickly join</span>
                    </div>
                </div>
            </div>

            {/* Back to Home */}
            <div className="back-section">
                <p className="back-text">Don't have a room code?</p>
                <button
                    onClick={() => navigate('/')}
                    className="back-btn"
                >
                    ← Back to Home
                </button>
            </div>
        </div>
    </div>)
}

export default JoinRoom