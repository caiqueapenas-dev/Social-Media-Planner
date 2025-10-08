import { create } from "zustand";
import { Post } from "@/lib/types";

interface PostsState {
  posts: Post[];
  setPosts: (posts: Post[]) => void;
  addPost: (post: Post) => void;
  updatePost: (id: string, post: Partial<Post>) => void;
  deletePost: (id: string) => void;
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
}

export const usePostsStore = create<PostsState>((set) => ({
  posts: [],
  setPosts: (posts) => set({ posts }),
  addPost: (post) => set((state) => ({ posts: [...state.posts, post] })),
  updatePost: (id, updatedPost) =>
    set((state) => ({
      posts: state.posts.map((p) => (p.id === id ? { ...p, ...updatedPost } : p)),
    })),
  deletePost: (id) =>
    set((state) => ({
      posts: state.posts.filter((p) => p.id !== id),
    })),
  selectedDate: null,
  setSelectedDate: (date) => set({ selectedDate: date }),
}));

