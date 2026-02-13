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
            <a href="https://github.com/RJN-github">
              <img src="https://pngimg.com/uploads/github/github_PNG47.png" alt="Github logo" />
            </a>

            <a href="https://www.linkedin.com/in/rishikesh-natu-182b41306/">
              <img src="https://imgs.search.brave.com/dJWbrLtblaQCButltYl4-qSHBSnenJXXnHV2QgRavhc/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9zdGF0/aWMudmVjdGVlenku/Y29tL3N5c3RlbS9y/ZXNvdXJjZXMvdGh1/bWJuYWlscy8wMTgv/OTMwLzU4NC9zbWFs/bC9saW5rZWRpbi1s/b2dvLWxpbmtlZGlu/LWljb24tdHJhbnNw/YXJlbnQtZnJlZS1w/bmcucG5n" alt="LinkedIn logo" />
            </a>

            <a href="https://www.instagram.com/_____r_j_n_____/">
              <img src="https://imgs.search.brave.com/zUmA27h7wq0QRrzWONVaeMpqa0cejpK2aAnSVapZyAE/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly93d3cu/cG5nYWxsLmNvbS93/cC1jb250ZW50L3Vw/bG9hZHMvNS9JbnN0/YWdyYW0tTG9nby1Q/TkctRnJlZS1Eb3du/bG9hZC0zMDB4MjI1/LnBuZw" alt="Instagram logo" />
            </a>

          </div>
        </footer>
      </div>
    </div>
  )
}

export default LandingPage
