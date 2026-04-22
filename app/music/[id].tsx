import { api } from "@/src/api/client";
import AppGradient from "@/src/components/AppGradient";
import { usePlayerStore, type Track } from "@/src/store/playerStore";
import { colors } from "@/src/theme/colors";
import type { Music } from "@/src/types";
import { formatPrice } from "@/src/utils/formatters";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function MusicDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [music, setMusic] = useState<Music | null>(null);
  const [loading, setLoading] = useState(true);

  const setQueueAndPlay = usePlayerStore((state) => state.setQueueAndPlay);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const isLoading = usePlayerStore((state) => state.isLoading);
  const isBuffering = usePlayerStore((state) => state.isBuffering);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const preloadQueue = usePlayerStore((state) => state.preloadQueue);

  useEffect(() => {
    let mounted = true;

    const fetchMusic = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/contents/${id}`);

        if (mounted) {
          setMusic(data.content || data);
        }
      } catch (error) {
        console.log("Erro ao carregar música:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (id) fetchMusic();

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!music) return;

    preloadQueue([
      {
        id: music.id,
        contentId: music.id,
        title: music.title,
        url: null,
        cover_url: music.cover_url ?? null,
        artistName: music.artist?.name ?? null,
      },
    ]).catch(() => {});
  }, [music, preloadQueue]);

  const handlePlay = async () => {
    if (!music) return;

    const isCurrent = currentTrack?.id === music.id;

    if (isCurrent) {
      await togglePlayPause();
      return;
    }

    const track: Track = {
      id: music.id,
      contentId: music.id,
      title: music.title,
      url: null,
      cover_url: music.cover_url ?? null,
      artistName: music.artist?.name ?? null,
    };

    await setQueueAndPlay([track], track);
  };

  if (loading) {
    return (
      <AppGradient>
        <View style={styles.center}>
          <ActivityIndicator color={colors.yellow} />
          <Text style={styles.helperText}>A carregar música...</Text>
        </View>
      </AppGradient>
    );
  }

  if (!music) {
    return (
      <AppGradient>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Música não encontrada.</Text>
        </View>
      </AppGradient>
    );
  }

  const isCurrent = currentTrack?.id === music.id;

  return (
    <AppGradient>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {music.cover_url ? (
          <Image source={{ uri: music.cover_url }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.placeholder]}>
            <Text style={styles.placeholderText}>Sem capa</Text>
          </View>
        )}

        <Text style={styles.title}>{music.title}</Text>
        <Text style={styles.artist}>{music.artist?.name || "Artista"}</Text>

        {typeof music.price !== "undefined" ? (
          <Text style={styles.price}>{formatPrice(music.price || 0)}</Text>
        ) : null}

        {music.description ? (
          <Text style={styles.description}>{music.description}</Text>
        ) : null}

        <Pressable
          style={[styles.playButton, isLoading && styles.playButtonDisabled]}
          onPress={handlePlay}
          disabled={isLoading}
        >
          <Text style={styles.playButtonText}>
            {isCurrent
              ? isLoading
                ? "A preparar..."
                : isBuffering
                ? "A estabilizar..."
                : isPlaying
                ? "Pausar"
                : "Continuar"
              : "Ouvir"}
          </Text>
        </Pressable>

        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Estado do player</Text>
          <Text style={styles.statusText}>
            {isCurrent
              ? isLoading
                ? "A música está a preparar a reprodução."
                : isBuffering
                ? "A ligação está a estabilizar."
                : isPlaying
                ? "A tocar agora."
                : "Em pausa."
              : "Pronta para reproduzir."}
          </Text>
        </View>
      </ScrollView>
    </AppGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    padding: 16,
    paddingBottom: 170,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  helperText: {
    marginTop: 10,
    color: colors.textMuted,
    fontSize: 14,
  },
  cover: {
    width: "100%",
    height: 320,
    borderRadius: 20,
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  placeholderText: {
    color: colors.textMuted,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.white,
  },
  artist: {
    color: colors.textMuted,
    marginTop: 6,
    fontSize: 15,
  },
  price: {
    marginTop: 10,
    fontWeight: "800",
    fontSize: 18,
    color: colors.yellow,
  },
  description: {
    marginTop: 14,
    color: colors.textMuted,
    lineHeight: 22,
    fontSize: 15,
  },
  playButton: {
    marginTop: 24,
    backgroundColor: colors.pink,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  playButtonDisabled: {
    opacity: 0.7,
  },
  playButtonText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 16,
  },
  statusCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.white,
    marginBottom: 6,
  },
  statusText: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  emptyTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
});