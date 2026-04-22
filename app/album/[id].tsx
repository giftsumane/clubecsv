import { api } from "@/src/api/client";
import AppGradient from "@/src/components/AppGradient";
import MusicCard from "@/src/components/MusicCard";
import PurchaseButton from "@/src/components/PurchaseButton";
import { usePlayerStore, type Track } from "@/src/store/playerStore";
import { colors } from "@/src/theme/colors";
import type { Album } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function AlbumDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);

  const setQueueAndPlay = usePlayerStore((state) => state.setQueueAndPlay);
  const preloadQueue = usePlayerStore((state) => state.preloadQueue);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const isLoading = usePlayerStore((state) => state.isLoading);
  const isBuffering = usePlayerStore((state) => state.isBuffering);
  const isDownloading = usePlayerStore((state) => state.isDownloading);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const downloadAlbumOffline = usePlayerStore(
    (state) => state.downloadAlbumOffline
  );
  const hydrateOfflineState = usePlayerStore(
    (state) => state.hydrateOfflineState
  );
  const isTrackOffline = usePlayerStore((state) => state.isTrackOffline);

  useEffect(() => {
    let mounted = true;

    const fetchAlbum = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/albums/${id}`);

        if (mounted) {
          setAlbum(data?.album || data);
        }
      } catch (error) {
        console.log("Erro ao carregar álbum:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (id) fetchAlbum();

    return () => {
      mounted = false;
    };
  }, [id]);

  const tracks = album?.tracks || album?.contents || [];

  const queue = useMemo<Track[]>(() => {
    return tracks.map((track: any) => ({
      id: track.id,
      contentId: track.id,
      title: track.title,
      url: null,
      cover_url: track.cover_url ?? album?.cover_url ?? null,
      artistName: track.artist?.name ?? album?.artist?.name ?? null,
    }));
  }, [tracks, album]);

  useEffect(() => {
    if (!queue.length) return;

    preloadQueue(queue).catch((error) => {
      console.log("Falha no preload do álbum:", error);
    });

    hydrateOfflineState(queue.map((item) => item.contentId)).catch((error) => {
      console.log("Falha ao verificar estado offline:", error);
    });
  }, [queue, preloadQueue, hydrateOfflineState]);

  const offlineCount = queue.filter((item) =>
    isTrackOffline(item.contentId)
  ).length;
  const allOffline = queue.length > 0 && offlineCount === queue.length;

  const handleDownloadAlbum = async () => {
    try {
      await downloadAlbumOffline(queue);
      Alert.alert("Offline", "Álbum descarregado com sucesso.");
    } catch (error) {
      console.log("Erro ao descarregar álbum:", error);
      Alert.alert("Erro", "Não foi possível descarregar o álbum.");
    }
  };

  const handleTrackPress = async (track: any) => {
    try {
      const isCurrentTrack = currentTrack?.id === track.id;

      if (isCurrentTrack) {
        await togglePlayPause();
        return;
      }

      const selectedTrack: Track = {
        id: track.id,
        contentId: track.id,
        title: track.title,
        url: null,
        cover_url: track.cover_url ?? album?.cover_url ?? null,
        artistName: track.artist?.name ?? album?.artist?.name ?? null,
      };

      await setQueueAndPlay(queue, selectedTrack);
    } catch (error) {
      console.log("Erro ao tocar faixa:", error);
    }
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
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
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
        <Text style={styles.artist}>{album.artist?.name || "Artista"}</Text>

        {album.description ? (
          <Text style={styles.description}>{album.description}</Text>
        ) : null}

        <View style={styles.purchaseWrapper}>
          <PurchaseButton
            type="album"
            targetId={album.id}
            label="Comprar álbum"
          />
        </View>

        <Pressable
          style={[
            styles.offlineButton,
            (isDownloading || allOffline) && styles.offlineButtonDisabled,
          ]}
          onPress={handleDownloadAlbum}
          disabled={isDownloading || allOffline}
        >
          <Ionicons
            name={allOffline ? "checkmark-circle" : "download-outline"}
            size={20}
            color={colors.white}
          />
          <Text style={styles.offlineButtonText}>
            {isDownloading
              ? "A descarregar..."
              : allOffline
              ? "Álbum disponível offline"
              : `Descarregar álbum (${offlineCount}/${queue.length})`}
          </Text>
        </Pressable>

        <Text style={styles.section}>Faixas</Text>

        {tracks.length === 0 ? (
          <Text style={styles.emptyText}>Sem músicas neste álbum.</Text>
        ) : (
          tracks.map((track: any) => {
            const active = currentTrack?.id === track.id;
            const offline = isTrackOffline(track.id);

            return (
              <View
                key={track.id}
                style={[styles.trackWrapper, active && styles.trackWrapperActive]}
              >
                <MusicCard
                  music={track}
                  onPress={() => handleTrackPress(track)}
                />

                <View style={styles.trackMetaRow}>
                  {active ? (
                    <Text style={styles.status}>
                      {isLoading
                        ? "A preparar..."
                        : isBuffering
                        ? "A estabilizar ligação..."
                        : isPlaying
                        ? "A tocar"
                        : "Em pausa"}
                    </Text>
                  ) : (
                    <View />
                  )}

                  {offline ? (
                    <View style={styles.offlineBadge}>
                      <Ionicons
                        name="cloud-offline-outline"
                        size={14}
                        color={colors.white}
                      />
                      <Text style={styles.offlineBadgeText}>Offline</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </AppGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  contentContainer: {
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
    borderRadius: 22,
    marginBottom: 18,
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
    fontSize: 30,
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
  purchaseWrapper: {
    marginTop: 18,
  },
  offlineButton: {
    marginTop: 14,
    backgroundColor: colors.secondary,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  offlineButtonDisabled: {
    opacity: 0.75,
  },
  offlineButtonText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 15,
  },
  section: {
    marginTop: 30,
    marginBottom: 10,
    fontSize: 20,
    fontWeight: "800",
    color: colors.white,
  },
  trackWrapper: {
    marginBottom: 10,
    borderRadius: 18,
  },
  trackWrapperActive: {
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  trackMetaRow: {
    marginTop: -4,
    marginBottom: 10,
    marginLeft: 12,
    marginRight: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  status: {
    color: colors.textMuted,
    fontSize: 12,
  },
  offlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,175,242,0.20)",
    borderWidth: 1,
    borderColor: "rgba(0,175,242,0.35)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  offlineBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "700",
  },
  emptyTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyText: {
    color: colors.textMuted,
    marginTop: 8,
    fontSize: 14,
  },
});