import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CreateRoom from './components/Lobby/CreateRoom';
import JoinRoom from './components/Lobby/JoinRoom';
import Lobby from './components/Lobby/Lobby';
import LandingPage from './components/Pages/LandingPage'
import ChatInput from './components/Chat/ChatInput';
import CanvasBoard from './components/Game/CanvasBoard';
import Game from "./components/Game/Game.jsx";
function App() {

  return (
    <BrowserRouter>
    <Routes>
      <Route path="/" element={<LandingPage/>} />
      <Route path="/chat" element={<ChatInput/>} />
      <Route path="/CreateRoom" element={<CreateRoom />} />
      <Route path="/JoinRoom" element={<JoinRoom />} />
      <Route path="/lobby/:roomId" element={<Lobby/>} />
      <Route path="/game/:roomId" element={<Game/>} />
      <Route path="/draw" element={<CanvasBoard/>} />
    </Routes>
  </BrowserRouter>
  )
}

export default App
