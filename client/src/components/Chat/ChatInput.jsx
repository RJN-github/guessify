import React, { useEffect, useState, useRef } from 'react'
import socket from '../../socket/socket'
import useStore from '../../Store/Store'
import '../../css/ChatInput.css'

function ChatInput({isDrawer, guessedPlayers, roundActive}) {
    const [Chat, setChat] = useState("")
    const [messages, setMessages] = useState([])
    const { username } = useStore()
    const messagesEndRef = useRef(null)
    const inputRef = useRef(null)
    const [roomUpdate , SetRoomUpdate] = useState('')
    
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    useEffect(() => {
        socket.on('chatMessage', ({ msg, username }) => {
            console.log('received from backend', username + ":" + msg)
            setMessages((prevMsg) => [...prevMsg, { username, msg, timestamp: Date.now() }])
        })
        socket.on('room:message' , (msg)=> SetRoomUpdate(msg))
        
        socket.on('guess:correct', ({guesser, points, timeRemaining}) => {
            setMessages((prevMsg) => [...prevMsg, { 
                username: '🎉 GUESSED', 
                msg: `${guesser} guessed correctly! +${points} points (${timeRemaining}s remaining)`, 
                timestamp: Date.now(),
                isSystem: true
            }])
        })
     
        return () => {
            socket.off('chatMessage')
            socket.off('room:message')
            socket.off('guess:correct')
        }
    }, [])

    const HandleSubmit = () => {
        // Prevent drawer from sending chat messages
        if (isDrawer) {
            alert("Drawer cannot chat during their round!");
            return;
        }

        // Prevent already guessed players from chatting
        if (guessedPlayers && guessedPlayers.has(username)) {
            alert("You already guessed! Wait for next round.");
            return;
        }

        if (Chat.trim()) {
            socket.emit('chatMessage', { username, Chat })
            setChat("")
            inputRef.current?.focus()
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            HandleSubmit()
        }
    }

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const canChat = !isDrawer && !(guessedPlayers && guessedPlayers.has(username)) && roundActive;

    return (
        <div className="chat-container">
            <div className="chat-header">
                <span className="chat-icon">
                    🔔
                {   
                        roomUpdate.length > 0 && <div className="room-update">{roomUpdate}</div>
                }
                </span>
                <h3 className="chat-title">Chat</h3>
                <span className="chat-count">{messages.length}</span>
            </div>
            
            <div className="chat-messages">
                {messages.length === 0 ? (
                    <div className="no-messages">
                        <span className="no-messages-icon">🤐</span>
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((item, index) => (
                        <div 
                            key={index} 
                            className={`message-item ${item.isSystem ? 'system-message' : (item.username === username ? 'own-message' : 'other-message')}`}
                            style={{
                                background: item.isSystem ? '#2a7f62' : undefined,
                                color: item.isSystem ? '#fff' : undefined
                            }}
                        >
                            <div className="message-header">
                                <span className="message-username">
                                    {item.username === username ? 'You' : item.username}
                                </span>
                                <span className="message-time">
                                    {formatTime(item.timestamp)}
                                </span>
                            </div>
                            <div className="message-content">
                                {item.msg}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {isDrawer ? (
                <div style={{ padding: '10px', background: '#4eff44', color: '#000', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                    🎨 YOU ARE THE DRAWER - DRAW NOW!
                </div>
            ) : guessedPlayers && guessedPlayers.has(username) ? (
                <div style={{ padding: '10px', background: '#2a7f62', color: '#fff', textAlign: 'center', fontSize: '12px' }}>
                    ✓ YOU GUESSED CORRECTLY! Watch others guess.
                </div>
            ) : !roundActive ? (
                <div style={{ padding: '10px', background: '#444', color: '#fff', textAlign: 'center', fontSize: '12px' }}>
                    ⏳ WAITING FOR NEXT ROUND...
                </div>
            ) : null}

            <div className="chat-input-area">
                <textarea
                    ref={inputRef}
                    value={Chat}
                    onChange={(e) => setChat(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                        isDrawer ? "Drawer cannot chat" :
                        guessedPlayers && guessedPlayers.has(username) ? "Already guessed!" :
                        !roundActive ? "Waiting for round..." :
                        "Guess the word..."
                    }
                    disabled={!canChat}
                    className="chat-textarea"
                    rows={3}
                />
                <button 
                    onClick={HandleSubmit}
                    disabled={!canChat}
                    className="chat-submit-btn"
                >
                    Send
                </button>
            </div>
        </div>
    )
}

export default ChatInput