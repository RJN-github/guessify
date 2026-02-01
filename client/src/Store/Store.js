import { create } from 'zustand';

const useStore = create((set,) => ({
  username: '',
  roomId: '',
  isHost: false,
  players: [],
  host: '',
  message: '',
  isDrawer: false,
  gameState : false,
  currentWord: '',
  round: 1,
  score: 0,
  DrawStrokes: [],

  setUsername: (username) => set({ username }),
  setIsHost: (isHost) => set({ isHost }),
  setRoomId: (roomId) => set({ roomId }),
  setPlayers: (update) => set((state) => ({
    players: typeof update === 'function' ? update(state.players) : update
  })),
  setHost: (host) => set({ host }),
  setMessage: (message) => set({ message }),
  
  setIsDrawer: (isDrawer) => set({ isDrawer }), 
  setGameState: (gameState) => set({ gameState }),
  setCurrentWord: (currentWord) => set({ currentWord }),
  setRound: (round) => set({ round }),
  setScore: (score) => set({ score }),
  SetDrawStrokes: (strokes) => set({ strokes }),

  resetGame: () =>
    set({
      username: '',
      roomId: '',
      isHost: false,
      isDrawer: false,
      players: [],
      currentWord: '',
      round: 1,
      score: 0,
    }),

    guessifyWords : [
      "cat",
      "house",
      "sun",
      "car",
      "tree",
      "fish",
      "star",
      "flower",
      "apple",
      "bird",
      "pizza",
      "guitar",
      "elephant",
      "butterfly",
      "castle",
      "rainbow",
      "bicycle",
      "spider",
      "sandwich",
      "rocket",
      "telescope",
      "volcano",
      "skeleton",
      "lighthouse",
      "hamburger",
      "dinosaur",
      "helicopter",
      "cactus",
      "penguin",
      "umbrella"
    ],
  
}));

export default useStore;
