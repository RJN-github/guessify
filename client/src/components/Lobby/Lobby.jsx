  import React, { useCallback, useEffect } from 'react'
  import useStore from '../../Store/Store'
  import socket from '../../socket/socket'
  import Chat from '../Chat/ChatInput'
  import { useNavigate } from 'react-router-dom'
  import '../../css/Lobby.css' 
  import CanvasBoard from '../Game/CanvasBoard'

  function Lobby() {
    const {
      players, host, roomId, setPlayers,
      setHost, setRoomId,message,setMessage,
       setGameState, gameState,
    } = useStore()
    const navigate = useNavigate()

    const handleExit = useCallback(() => {
      sessionStorage.removeItem('joined')
      socket.disconnect()
      navigate('/')
    }, [navigate])

    useEffect(() => {
      const joined = sessionStorage.getItem('joined')
      if (!joined) {
        navigate('/')
        return
      }
      const updatedPlayers = ({roomId, players, host}) => {
        setRoomId(roomId)
        setPlayers(players)
        setHost(host)
      }
      socket.on("room:updatedPlayers", updatedPlayers)
      socket.on("room:message", (msg) => setMessage(msg))
      socket.emit("room:getState", { roomId });
      socket.on("room:newHost", (newHost) => {
        if (newHost.id === socket.id) {
          alert('Host disconnected, you are the new host')
          setHost(true)
        }
        setTimeout(() => {
          setMessage(newHost)
        }, 1000);
      })
      window.addEventListener("beforeunload", handleExit)

      socket.on('room:startGame', () => {navigate(`/game/${roomId}`)})

      return () => {
        socket.off("room:updatedPlayers")
        window.removeEventListener("beforeunload", handleExit)
      }
    }, [navigate, setPlayers, setHost, setRoomId, setMessage, handleExit , roomId])

    const isHost = players?.some(p => p.username === host && socket.id === p.id)

    const startGame = () => {
      if (!players || players.length < 2) {
        alert('❌ Need at least 2 players to start the game!');
        return;
      }
      setGameState(true)
      socket.emit("startGame", useStore.getState().gameState)
    }

    useEffect(()=>{
      socket.on("room:gameRunning" , (state , players) => {
        console.log("state from backend is" , state , "players", players)
        if (state === true){
          navigate(`/game/${roomId}`)
        }
        else{
          console.log("no game is running in" , roomId)
        }
      })
    }, [navigate , roomId])

    return (
      <div className="lobby-container">
        <div className="lobby-header">
          <span className="room-id-badge">Room ID: {roomId}</span>
          <span className="host-badge">
            Host: <span className="host-username">
              {players?.find(p => p.username === host)?.username || host}
            </span>
          </span>
        </div>
        <hr className="divider" />
        <h1 className="players-heading">Current Players in Lobby:</h1>
        <ul className="players-list">
          {(players || []).map((player, index) => (
            <li key={player.id || index} className="player-list-item">
              <span className={`player-name ${player.username === host ? 'player-host' : ''}`}>
                {player.username}
                {player.username === host && (
                  <span className="host-star"> ⭐ (host)</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      
        <button
          className="start-game-btn guessify-btn"
          disabled={!isHost}
          title="Only the host can start the game"
          onClick={startGame}
        >
          Start Gameplay
        </button>
        {/*  <CanvasBoard/>*/}
        <button className="exit-btn guessify-btn" onClick={handleExit} roomUpdates = {message}>
          Exit Lobby
        </button>
      </div>
    )
  }

  export default Lobby
