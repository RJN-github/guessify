import React from 'react'
import { useNavigate } from 'react-router-dom'
import '../../css/LandingPage.css'

function LandingPage() {
  const navigate = useNavigate()

  const HandleNavigation = (e) => {
    navigate(`/${e}`)
  }

  return (
    <div className='landing-page-wrapper'>

      <div className="landing-container">
        <div className="landing-header">
          <h1 className=''>Guessify</h1>
          <p>A fun and competitive multiplayer drawing + guessing game, inspired by Skribbl.io. Draw, guess, laugh, and win!</p>
        </div>

        <div className="buttons">
          <button onClick={() => HandleNavigation("CreateRoom")}>🎨 Create Private Room</button>
          <button onClick={() => HandleNavigation("JoinRoom")}>👥 Join Room</button>
        </div>

        <div className="how-to-play">
          <h2>🕹️ How to Play</h2>
          <p>One player draws a word, others guess what it is. Points are awarded based on how quickly you guess correctly. Take turns, unleash your inner artist, and have fun!</p>
          <p>No account needed. Just share your private room code and start playing!</p>
        </div>

        <footer>
          <p>Created with ❤️ by Rishikesh Natu</p>
          <p>I’m a curious developer always building fun, multiplayer & utility web projects. This game is another creation born from my passion for real-time web apps. Let’s play!</p>
          <div className="socials">
            <button>T</button>
            <button>I</button>
            <button>G</button>
            <button>L</button>
          </div>
        </footer>
      </div>
      </div>
  )
}

export default LandingPage
