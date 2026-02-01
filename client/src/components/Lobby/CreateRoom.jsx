import React, { useEffect, useState } from 'react'
import UseStore from '../../Store/Store'
import socket from '../../socket/socket'
import { useNavigate } from 'react-router-dom'
import '../../css/CreateRoom.css'

function CreateRoom() {
    const setRoomId = UseStore((s) => s.setRoomId)
    const setIsHost = UseStore((s) => s.setIsHost)
    const setHost = UseStore((s) => s.setHost)
    const setPlayers = UseStore((s) => s.setPlayers)
    const [generatedRoomId, setGeneratedRoomId] = useState('')
    const [copied, setCopied] = useState(false)
    const navigate = useNavigate()

    const [username, setUsername] = useState('')
    const setStoreUsername = UseStore((s) => s.setUsername)

    useEffect(() => {
        let RoomID = ''
        for (let i = 0; i < 6; i++) {
            RoomID += Math.floor((Math.random() + 1) * 3)
        }
        setGeneratedRoomId(RoomID)
        setRoomId(RoomID)
        console.log(RoomID)
    }, [])

    const handleCreateRoom = () => {
        const username = UseStore.getState().username
        if (!username.trim()) {
            alert('Enter Your name')
        } else {
            setIsHost(true)
            setHost(username)
            setPlayers([{username}])
            socket.emit('createRoom', { roomId: generatedRoomId, username })
            sessionStorage.setItem('joined', 'true')
            navigate(`/lobby/${generatedRoomId}`)
        }
    }

    const handleCopyRoomId = async () => {
        try {
            await navigator.clipboard.writeText(generatedRoomId)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    return (
        <div className="create-room-container">
            <div className="create-room-content">
                {/* Header */}
                <div className="header">
                    <div className="game-icon">🎮</div>
                    <h1 className="title">Create Room</h1>
                    <p className="subtitle">Set up your game and invite friends</p>
                </div>

                {/* Username Input */}
                <div className="name-section">
                    <label className="label">Enter Your Name</label>
                    <input
                        value={username}
                        type="text"
                        onChange={(e) => {
                            setUsername(e.target.value)
                            setStoreUsername(e.target.value)
                        }}
                        placeholder="Your display name"
                        className="name-input"
                    />
                </div>

                {/* Game Settings */}
                <div className="settings-container">
                    <h3 className="settings-title">⚙️ Game Settings</h3>
                    
                    <div className="settings-grid">
                        <div className="setting-item">
                            <label className="setting-label">👥 Players</label>
                            <div className="setting-value">10</div>
                        </div>

                        <div className="setting-item">
                            <label className="setting-label"># Rounds</label>
                            <div className="setting-value">3</div>
                        </div>

                        <div className="setting-item">
                            <label className="setting-label">⏱️ Duration</label>
                            <div className="setting-value">60s</div>
                        </div>

                        <div className="setting-item">
                            <label className="setting-label">📝 Words</label>
                            <div className="setting-value">4</div>
                        </div>
                    </div>
                </div>

                {/* Room ID Display */}
                <div className="room-id-section">
                    <p className="room-id-label">Room ID</p>
                    <div className="room-id-display">
                        <span className="room-id-code">{generatedRoomId}</span>
                        <button
                            onClick={handleCopyRoomId}
                            className={`copy-btn ${copied ? 'copied' : ''}`}
                            title="Copy room ID"
                        >
                            {copied ? '✓' : '📋'}
                        </button>
                    </div>
                    <p className="room-id-hint">Share this code with your friends</p>
                </div>

                {/* Action Buttons */}
                <div className="action-buttons">
                    <button onClick={handleCreateRoom} className="create-btn">
                        🚀 Create Room
                    </button>
                </div>
            </div>
        </div>
    )
}

export default CreateRoom