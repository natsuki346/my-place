import { create } from 'zustand'

export type AppView = 'museum' | 'world' | 'explore'

export type DoorCustom = {
  doorColor: string
  doorAccentColor: string
  labelBgColor: string
  labelTextColor: string
  knobColor: string
}

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
  subPageOpen: boolean
  setSubPageOpen: (open: boolean) => void
  savedDoorMap: Record<string, DoorCustom>
  setSavedDoor: (key: string, custom: DoorCustom) => void
  sharedDoorMap: Record<string, DoorCustom>
  setSharedDoor: (key: string, custom: DoorCustom) => void
}

export const useWorldStore = create<WorldStore>((set) => ({
  currentView: 'museum',
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
  subPageOpen: false,
  setSubPageOpen: (open) => set({ subPageOpen: open }),
  savedDoorMap: {},
  setSavedDoor: (key, custom) => set((s) => ({ savedDoorMap: { ...s.savedDoorMap, [key]: custom } })),
  sharedDoorMap: {},
  setSharedDoor: (key, custom) => set((s) => ({ sharedDoorMap: { ...s.sharedDoorMap, [key]: custom } })),
}))
