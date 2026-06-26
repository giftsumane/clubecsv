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

function normalizeAlbum(album: Album): Album {
  const tracks = (album as any).tracks || (album as any).contents || [];

  return {
    ...album,
    tracks: (album as any).tracks ? tracks : (album as any).tracks,
    contents: (album as any).contents ? tracks : (album as any).contents,
  } as Album;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      albums: [],
      musics: [],
      albumDetails: {},
      loading: false,

      fetchLibrary: async () => {
        const hasCache = get().albums.length > 0 || get().musics.length > 0;

        if (!hasCache) {
          set({ loading: true });
        }

        try {
          const { data } = await api.get("/library");

          const albums = Array.isArray(data?.albums) ? data.albums : [];
          const musics = Array.isArray(data?.musics) ? data.musics : [];

          // 1.0.6: não fazemos download/cache manual de imagens aqui.
          // O React Native/Image decide o cache normal. Isto evita tráfego invisível.
          set({
            albums,
            musics,
            loading: false,
          });
        } catch (error) {
          console.log("Biblioteca offline. A usar cache local:", error);
          set({ loading: false });
        }
      },

      saveAlbumDetail: (album) => {
        if (!album?.id) return;

        const normalizedAlbum = normalizeAlbum(album);

        // 1.0.6: guardar metadata/URLs apenas. Sem cacheImage automático.
        set((state) => ({
          albumDetails: {
            ...state.albumDetails,
            [normalizedAlbum.id]: normalizedAlbum,
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
