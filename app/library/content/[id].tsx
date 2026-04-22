import { api } from "@/src/api/client";
import AppGradient from "@/src/components/AppGradient";
import { usePlayerStore, type Track } from "@/src/store/playerStore";
import { colors } from "@/src/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
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

type Artist = {
  id: number;
  name: string;
};

type Content = {
  id: number;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  artist?: Artist | null;
};

export default function LibraryContentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [content, setContent] = useState<Content | null>(null);
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

    const fetchContent = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/contents/${id}`);

        if (mounted) {
          setContent(data?.content || data);
        }
      } catch (error) {
        console.log("Erro ao carregar conteúdo da biblioteca:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (id) fetchContent();

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!content) return;

    preloadQueue([
      {
        id: content.id,
        contentId: content.id,
        title: content.title,
        url: null,
        cover_url: content.cover_url ?? null,
        artistName: content.artist?.name ?? null,
      },
    ]).catch(() => {});
  }, [content, preloadQueue]);

  const handlePlay = async () => {
    if (!content) return;

    const isCurrent = currentTrack?.id === content.id;

    if (isCurrent) {
      await togglePlayPause();
      return;
    }

    const track: Track = {
      id: content.id,
      contentId: content.id,
      title: content.title,
      url: null,
      cover_url: content.cover_url ?? null,
      artistName: content.artist?.name ?? null,
    };

    await setQueueAndPlay([track], track);
  };

  if (loading) {
    return (
      <AppGradient>
        <View style={styles.center}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </Pressable>
          <ActivityIndicator color={colors.yellow} />
          <Text style={styles.helperText}>A carregar conteúdo...</Text>
        </View>
      </AppGradient>
    );
  }

  if (!content) {
    return (
      <AppGradient>
        <View style={styles.center}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </Pressable>
          <Text style={styles.emptyTitle}>Conteúdo não encontrado.</Text>
        </View>
      </AppGradient>
    );
  }

  const isCurrent = currentTrack?.id === content.id;

  return (
    <AppGradient>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </Pressable>

        {content.cover_url ? (
          <Image source={{ uri: content.cover_url }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.placeholder]}>
            <Text style={styles.placeholderText}>Sem capa</Text>
          </View>
        )}

        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.artist}>
          {content.artist?.name || "Artista desconhecido"}
        </Text>

        {content.description ? (
          <Text style={styles.description}>{content.description}</Text>
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
                ? "O conteúdo está a preparar a reprodução."
                : isBuffering
                ? "A ligação está a estabilizar."
                : isPlaying
                ? "A tocar agora."
                : "Em pausa."
              : "Pronto para reproduzir."}
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