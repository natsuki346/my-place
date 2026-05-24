import { create } from 'zustand'

export type AppView = 'room' | 'world' | 'profile'

type Post = {
  id: string
  text: string
  color: string
  x: number
  y: number
}

type WorldStore = {
  currentView: AppView
  setView: (v: AppView) => void
  playerPos: { x: number; y: number }
  setPlayerPos: (pos: { x: number; y: number }) => void
  currentRoom: string | null
  setCurrentRoom: (key: string | null) => void
  posts: Post[]
  addPost: (post: Post) => void
}

export const useWorldStore = create<WorldStore>((set) => ({
  currentView: 'room',
  setView: (v) => set({ currentView: v }),
  playerPos: { x: 4, y: 3 },
  setPlayerPos: (pos) => set({ playerPos: pos }),
  currentRoom: null,
  setCurrentRoom: (key) => set({ currentRoom: key }),
  posts: [
    { id: '1', text: 'なんか今日は穏やかだな', color: '#a78bfa', x: 320, y: 200 },
    { id: '2', text: 'コーヒーが美味しかった', color: '#60a5fa', x: 180, y: 260 },
  ],
  addPost: (post) => set((s) => ({ posts: [...s.posts, post] })),
}))
