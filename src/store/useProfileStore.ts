import { create } from 'zustand'

export type Gender = '未設定' | '男性' | '女性'

type ProfileStore = {
  gender: Gender
  setGender: (g: Gender) => void
}

export const useProfileStore = create<ProfileStore>((set) => ({
  gender: '未設定',
  setGender: (gender) => set({ gender }),
}))
