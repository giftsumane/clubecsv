import { api } from "@/src/api/client";
import AppGradient from "@/src/components/AppGradient";
import { usePlayerStore, type Track } from "@/src/store/playerStore";
import { colors } from "@/src/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
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
  const { height } = useWindowDimensions();

  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);

  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const isLoading = usePlayerStore((state) => state.isLoading);
  const isBuffering = usePlayerStore((state) => state.isBuffering);
  const isDownloading = usePlayerStore((state) => state.isDownloading);
  const setQueueAndPlay = usePlayerStore((state) => state.setQueueAndPlay);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const preloadQueue = usePlayerStore((state) => state.preloadQueue);
  const downloadAlbumOffline = usePlayerStore(
    (state) => state.downloadAlbumOffline
  );
  const hydrateOfflineState = usePlayerStore(
    (state) => state.hydrateOfflineState
  );
  const isTrackOffline = usePlayerStore((state) => state.isTrackOffline);

  const contents = album?.contents || album?.tracks || [];

  const coverHeight = Math.max(140, Math.min(190, height * 0.23));

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
    if (!queue.length) return;

    preloadQueue(queue).catch((error) => {
      console.log("Falha no preload da library album:", error);
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
      console.log("Erro ao descarregar álbum da library:", error);
      Alert.alert("Erro", "Não foi possível descarregar o álbum.");
    }
  };

  const handlePlayTrack = async (item: AlbumContent) => {
    try {
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
    } catch (error) {
      console.log("Erro ao tocar faixa da library:", error);
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
      <View style={styles.container}>
        <View style={styles.topSection}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </Pressable>

          {album.cover_url ? (
            <Image
              source={{ uri: album.cover_url }}
              style={[styles.cover, { height: coverHeight }]}
            />
          ) : (
            <View
              style={[styles.cover, styles.placeholder, { height: coverHeight }]}
            >
              <Text style={styles.placeholderText}>Sem capa</Text>
            </View>
          )}

          <Text style={styles.title}>{album.title}</Text>
          <Text style={styles.artist}>
            {album.artist?.name || "Artista desconhecido"}
          </Text>

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
              size={18}
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
        </View>

        <View style={styles.tracksPanel}>
          <View style={styles.panelHeader}>
            <Text style={styles.sectionTitle}>Faixas</Text>
            <Text style={styles.sectionCount}>
              {contents.length} {contents.length === 1 ? "música" : "músicas"}
            </Text>
          </View>

          <FlatList
            data={contents}
            keyExtractor={(item) => String(item.id)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => {
              const active = currentTrack?.id === item.id;
              const offline = isTrackOffline(item.id);
              const isLast = index === contents.length - 1;

              return (
                <Pressable
                  onPress={() => handlePlayTrack(item)}
                  style={[
                    styles.trackRow,
                    active && styles.trackRowActive,
                    isLast && styles.lastTrackRow,
                  ]}
                  disabled={isLoading && !active}
                >
                  <View style={styles.trackLeft}>
                    <View
                      style={[
                        styles.trackIndexBadge,
                        active && styles.trackIndexBadgeActive,
                      ]}
                    >
                      <Text style={styles.trackIndexText}>
                        {String(index + 1).padStart(2, "0")}
                      </Text>
                    </View>

                    <View style={styles.trackTextWrap}>
                      <Text style={styles.trackTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.trackSubtitle} numberOfLines={1}>
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
                  </View>

                  <View style={styles.trackRight}>
                    {offline ? (
                      <View style={styles.offlineBadge}>
                        <Ionicons
                          name="cloud-offline-outline"
                          size={12}
                          color={colors.white}
                        />
                        <Text style={styles.offlineBadgeText}>Offline</Text>
                      </View>
                    ) : null}

                    <View
                      style={[
                        styles.playIconWrap,
                        active && styles.playIconWrapActive,
                      ]}
                    >
                      <Ionicons
                        name={
                          active
                            ? isLoading || isBuffering
                              ? "hourglass-outline"
                              : isPlaying
                              ? "pause"
                              : "play"
                            : "play"
                        }
                        size={14}
                        color={colors.white}
                      />
                    </View>
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyListWrap}>
                <Text style={styles.emptyListText}>
                  Sem conteúdos neste álbum.
                </Text>
              </View>
            }
          />
        </View>
      </View>
    </AppGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 86,
    backgroundColor: "transparent",
  },
  topSection: {
    flexShrink: 0,
    marginBottom: 12,
  },
  tracksPanel: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },
  panelHeader: {
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.white,
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 96,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cover: {
    width: "100%",
    borderRadius: 22,
    marginBottom: 12,
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
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 3,
    color: colors.white,
  },
  artist: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 12,
  },
  offlineButton: {
    backgroundColor: colors.secondary,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  offlineButtonDisabled: {
    opacity: 0.75,
  },
  offlineButtonText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 14,
  },
  trackRow: {
    minHeight: 62,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  lastTrackRow: {
    marginBottom: 0,
  },
  trackRowActive: {
    borderColor: "rgba(255,162,23,0.45)",
    backgroundColor: "rgba(255,162,23,0.10)",
  },
  trackLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  trackRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 6,
    marginLeft: 8,
  },
  trackIndexBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  trackIndexBadgeActive: {
    backgroundColor: "rgba(255,162,23,0.22)",
    borderColor: "rgba(255,162,23,0.40)",
  },
  trackIndexText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "800",
  },
  trackTextWrap: {
    flex: 1,
    justifyContent: "center",
    minWidth: 0,
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },
  trackSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  playIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  playIconWrapActive: {
    backgroundColor: "rgba(255,162,23,0.22)",
    borderColor: "rgba(255,162,23,0.40)",
  },
  offlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,175,242,0.20)",
    borderWidth: 1,
    borderColor: "rgba(0,175,242,0.35)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  offlineBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "700",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.white,
    textAlign: "center",
  },
  emptyListWrap: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 30,
  },
  emptyListText: {
    textAlign: "center",
    color: colors.textMuted,
  },
  helperText: {
    marginTop: 8,
    color: colors.textMuted,
    textAlign: "center",
  },
});