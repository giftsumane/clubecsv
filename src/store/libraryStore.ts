import { create } from "zustand";
import { api } from "../api/client";
import type { Album, Music } from "../types";

type LibraryState = {
  albums: Album[];
  musics: Music[];
  loading: boolean;
  fetchLibrary: () => Promise<void>;
};

export const useLibraryStore = create<LibraryState>((set) => ({
  albums: [],
  musics: [],
  loading: false,

  fetchLibrary: async () => {
    set({ loading: true });

    try {
      const { data } = await api.get("/library");

      set({
        albums: data.albums || [],
        musics: data.musics || [],
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
}));