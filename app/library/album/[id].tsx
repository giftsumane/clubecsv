import { api } from "@/src/api/client";
import AppGradient from "@/src/components/AppGradient";
import { usePlayerStore, type Track } from "@/src/store/playerStore";
import { colors } from "@/src/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Artist = {
  id: number;
  name: string;
};

type AlbumContent = {
  id: number;
  title: string;
  cover_url?: string | null;
  media_url?: string | null;
  hls_master_url?: string | null;
  artist?: Artist | null;
};

type Album = {
  id: number;
  title: string;
  cover_url?: string | null;
  artist?: Artist | null;
  contents?: AlbumContent[];
  tracks?: AlbumContent[];
};

export default function LibraryAlbumDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);

  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const isLoading = usePlayerStore((state) => state.isLoading);
  const isBuffering = usePlayerStore((state) => state.isBuffering);
  const setQueueAndPlay = usePlayerStore((state) => state.setQueueAndPlay);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const preloadQueue = usePlayerStore((state) => state.preloadQueue);

  const contents = album?.contents || album?.tracks || [];

  useEffect(() => {
    let mounted = true;

    async function loadAlbum() {
      try {
        setLoading(true);
        const res = await api.get(`/albums/${id}`);
        const payload = res.data?.album || res.data;

        if (mounted) {
          setAlbum(payload);
        }
      } catch (error) {
        console.log("Erro ao carregar álbum da library:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (id) loadAlbum();

    return () => {
      mounted = false;
    };
  }, [id]);

  const queue = useMemo<Track[]>(() => {
    return contents.map((item) => ({
      id: item.id,
      contentId: item.id,
      title: item.title,
      url: null,
      cover_url: item.cover_url ?? album?.cover_url ?? null,
      artistName: item.artist?.name ?? album?.artist?.name ?? null,
    }));
  }, [contents, album]);

  useEffect(() => {
    if (queue.length) {
      preloadQueue(queue).catch(() => {});
    }
  }, [queue, preloadQueue]);

  const handlePlayTrack = async (item: AlbumContent) => {
    if (currentTrack?.id === item.id) {
      await togglePlayPause();
      return;
    }

    const track: Track = {
      id: item.id,
      contentId: item.id,
      title: item.title,
      url: null,
      cover_url: item.cover_url ?? album?.cover_url ?? null,
      artistName: item.artist?.name ?? album?.artist?.name ?? null,
    };

    await setQueueAndPlay(queue, track);
  };

  if (loading) {
    return (
      <AppGradient>
        <View style={styles.center}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </Pressable>
          <ActivityIndicator color={colors.yellow} />
          <Text style={styles.helperText}>A carregar álbum...</Text>
        </View>
      </AppGradient>
    );
  }

  if (!album) {
    return (
      <AppGradient>
        <View style={styles.center}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </Pressable>
          <Text style={styles.emptyTitle}>Álbum não encontrado.</Text>
        </View>
      </AppGradient>
    );
  }

  return (
    <AppGradient>
      <View style={styles.container}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </Pressable>

        {album.cover_url ? (
          <Image source={{ uri: album.cover_url }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.placeholder]}>
            <Text style={styles.placeholderText}>Sem capa</Text>
          </View>
        )}

        <Text style={styles.title}>{album.title}</Text>
        <Text style={styles.artist}>
          {album.artist?.name || "Artista desconhecido"}
        </Text>

        <FlatList
          data={contents}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const active = currentTrack?.id === item.id;

            return (
              <Pressable
                onPress={() => handlePlayTrack(item)}
                style={[styles.trackRow, active && styles.trackRowActive]}
                disabled={isLoading && !active}
              >
                <View style={styles.trackTextWrap}>
                  <Text style={styles.trackTitle}>{item.title}</Text>
                  <Text style={styles.trackSubtitle}>
                    {active
                      ? isLoading
                        ? "A preparar..."
                        : isBuffering
                        ? "A estabilizar..."
                        : isPlaying
                        ? "A tocar"
                        : "Em pausa"
                      : "Toque para ouvir"}
                  </Text>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyListText}>Sem conteúdos neste álbum.</Text>
          }
        />
      </View>
    </AppGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 24,
    paddingBottom: 170,
    backgroundColor: "transparent",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  cover: {
    width: "100%",
    height: 280,
    borderRadius: 22,
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  placeholder: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  placeholderText: {
    color: colors.textMuted,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
    color: colors.white,
  },
  artist: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  trackRow: {
    paddingVertical: 15,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  trackRowActive: {
    borderColor: "rgba(255,162,23,0.45)",
    backgroundColor: "rgba(255,162,23,0.10)",
  },
  trackTextWrap: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.white,
  },
  trackSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.white,
    textAlign: "center",
  },
  emptyListText: {
    marginTop: 20,
    textAlign: "center",
    color: colors.textMuted,
  },
  helperText: {
    marginTop: 8,
    color: colors.textMuted,
    textAlign: "center",
  },
});