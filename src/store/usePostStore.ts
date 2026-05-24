import { create } from "zustand";
import type { SoulPost } from "@/types";

type PostStore = {
  posts: SoulPost[];
  setPosts: (posts: SoulPost[]) => void;
  addPost: (post: SoulPost) => void;
};

export const usePostStore = create<PostStore>((set) => ({
  posts: [],
  setPosts: (posts) => set({ posts }),
  addPost: (post) => set((state) => ({ posts: [post, ...state.posts] })),
}));
