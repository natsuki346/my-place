import { create } from 'zustand'

type TagStore = {
  followingTags: string[]
  followTag:     (tag: string) => void
  unfollowTag:   (tag: string) => void
  isFollowing:   (tag: string) => boolean
}

export const useTagStore = create<TagStore>((set, get) => ({
  followingTags: ['夜型人間', '内向型', '猫好き'],
  followTag:   (tag) => set(s => ({ followingTags: [...s.followingTags, tag] })),
  unfollowTag: (tag) => set(s => ({ followingTags: s.followingTags.filter(t => t !== tag) })),
  isFollowing: (tag) => get().followingTags.includes(tag),
}))
