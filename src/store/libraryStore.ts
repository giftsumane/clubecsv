import { cacheImage } from "@/services/imageCache";
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

async function cacheAlbumImages(album: Album): Promise<Album> {
  const cachedCover = await cacheImage(album.cover_url);

  const tracks = album.tracks || album.contents || [];

  const cachedTracks = await Promise.all(
    tracks.map(async (track: any) => ({
      ...track,
      cover_url: await cacheImage(track.cover_url || album.cover_url),
    }))
  );

  return {
    ...album,
    cover_url: cachedCover || album.cover_url,
    tracks: album.tracks ? cachedTracks : album.tracks,
    contents: album.contents ? cachedTracks : album.contents,
  };
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

          const cachedAlbums = await Promise.all(
            albums.map(async (album: Album) => ({
              ...album,
              cover_url:
                (await cacheImage(album.cover_url)) || album.cover_url,
            }))
          );

          const cachedMusics = await Promise.all(
            musics.map(async (music: Music) => ({
              ...music,
              cover_url:
                (await cacheImage(music.cover_url)) || music.cover_url,
            }))
          );

          set({
            albums: cachedAlbums,
            musics: cachedMusics,
            loading: false,
          });
        } catch (error) {
          console.log("Biblioteca offline. A usar cache local:", error);
          set({ loading: false });
        }
      },

      saveAlbumDetail: async (album) => {
        if (!album?.id) return;

        const cachedAlbum = await cacheAlbumImages(album);

        set((state) => ({
          albumDetails: {
            ...state.albumDetails,
            [cachedAlbum.id]: cachedAlbum,
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