import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { api } from "../api/client";
import type { Album, Music } from "../types";

type AlbumCache = Record<number, Album>;

type LibraryState = {
  albums: Album[];
  musics: Music[];
  albumDetails: AlbumCache;
  loading: boolean;
  fetchLibrary: () => Promise<void>;
  saveAlbumDetail: (album: Album) => void;
  getAlbumDetail: (id: number) => Album | null;
};

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      albums: [],
      musics: [],
      albumDetails: {},
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
          console.log("Biblioteca offline. A usar cache local:", error);

          set({ loading: false });

          // Não fazer throw aqui.
          // Não limpar albums/musics.
        }
      },

      saveAlbumDetail: (album) => {
        if (!album?.id) return;

        set((state) => ({
          albumDetails: {
            ...state.albumDetails,
            [album.id]: album,
          },
        }));
      },

      getAlbumDetail: (id) => {
        return get().albumDetails[id] || null;
      },
    }),
    {
      name: "clubcsv-library-cache-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        albums: state.albums,
        musics: state.musics,
        albumDetails: state.albumDetails,
      }),
    }
  )
);