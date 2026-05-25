import { create } from 'zustand'

export type AppView = 'room' | 'world' | 'explore'

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
  removePost: (id: string) => void
  selectedAvatarId: number | null
  setSelectedAvatarId: (id: number | null) => void
}

export const useWorldStore = create<WorldStore>((set) => ({
  currentView: 'room',
  setView: (v) => set({ currentView: v }),
  playerPos: { x: 4, y: 3 },
  setPlayerPos: (pos) => set({ playerPos: pos }),
  currentRoom: null,
  setCurrentRoom: (key) => set({ currentRoom: key }),
  posts: [],
  addPost: (post) => set((s) => ({ posts: [...s.posts, post] })),
  removePost: (id) => set((s) => ({ posts: s.posts.filter((p) => p.id !== id) })),
  selectedAvatarId: null,
  setSelectedAvatarId: (id) => set({ selectedAvatarId: id }),
}))
