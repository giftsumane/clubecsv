import { trackAnalyticsEvent } from "@/services/analytics";
import AppGradient from "@/src/components/AppGradient";
import { useLibraryStore } from "@/src/store/libraryStore";
import { colors } from "@/src/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type LibraryAlbumItem = {
  id: number;
  title: string;
  cover_url?: string | null;
  artist?: { name?: string | null } | null;
  itemType: "album";
};

type LibraryMusicItem = {
  id: number;
  title: string;
  cover_url?: string | null;
  artist?: { name?: string | null } | null;
  itemType: "music";
};

type LibraryItem = LibraryAlbumItem | LibraryMusicItem;

export default function LibraryScreen() {
  const albums = useLibraryStore((state) => state.albums);
  const musics = useLibraryStore((state) => state.musics);
  const loading = useLibraryStore((state) => state.loading);
  const fetchLibrary = useLibraryStore((state) => state.fetchLibrary);

  const [refreshing, setRefreshing] = useState(false);

  const didFetchRef = useRef(false);

  const data = useMemo<LibraryItem[]>(() => {
    const albumItems: LibraryAlbumItem[] = (albums || []).map((album) => ({
      id: album.id,
      title: album.title,
      cover_url: album.cover_url ?? null,
      artist: album.artist ?? null,
      itemType: "album",
    }));

    const musicItems: LibraryMusicItem[] = (musics || []).map((music) => ({
      id: music.id,
      title: music.title,
      cover_url: music.cover_url ?? null,
      artist: music.artist ?? null,
      itemType: "music",
    }));

    return [...albumItems, ...musicItems];
  }, [albums, musics]);

  useEffect(() => {
    if (didFetchRef.current) return;

    didFetchRef.current = true;

    fetchLibrary().catch((error) => {
      console.log("Erro ao carregar library:", error);
    });
  }, [fetchLibrary]);

  const showFullLoader = loading && data.length === 0;

  function handleItemPress(item: LibraryItem) {
    void trackAnalyticsEvent({
      eventType: item.itemType === "album" ? "album_view" : "content_view",
      entityType: item.itemType === "album" ? "album" : "content",
      entityId: item.id,
      metadata: {
        title: item.title,
        artist_name: item.artist?.name ?? null,
        source: "library_grid",
        item_type: item.itemType,
      },
    });

    if (item.itemType === "album") {
      router.push(`/library/album/${item.id}`);
    } else {
      router.push(`/library/content/${item.id}`);
    }
  }

  async function handleRefreshLibrary() {
    if (refreshing || loading) return;

    try {
      setRefreshing(true);
      await fetchLibrary();
      const refreshedState = useLibraryStore.getState();

      void trackAnalyticsEvent({
        eventType: "content_view",
        entityType: "page",
        metadata: {
          source: "library_refresh_button",
          albums_count: refreshedState.albums.length,
          musics_count: refreshedState.musics.length,
        },
      });
    } catch (error) {
      console.log("Erro ao actualizar biblioteca:", error);
      Alert.alert(
        "Sem actualização",
        "Não foi possível actualizar a biblioteca agora. Confirma a ligação à internet."
      );
    } finally {
      setRefreshing(false);
    }
  }

  if (showFullLoader) {
    return (
      <AppGradient>
        <View style={styles.center}>
          <ActivityIndicator color={colors.white} />
        </View>
      </AppGradient>
    );
  }

  return (
    <AppGradient>
      <View style={styles.screen}>
        <View style={styles.headerRow}>
          <Text style={styles.header}>Biblioteca</Text>

          {loading && data.length > 0 ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Pressable
              style={[
                styles.refreshButton,
                refreshing && styles.refreshButtonDisabled,
              ]}
              onPress={handleRefreshLibrary}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Ionicons name="refresh" size={18} color={colors.white} />
              )}
              <Text style={styles.refreshButtonText}>
                {refreshing ? "A actualizar..." : "Actualizar"}
              </Text>
            </Pressable>
          )}
        </View>

        <FlatList
          data={data}
          keyExtractor={(item) => `${item.itemType}-${item.id}`}
          numColumns={2}
          columnWrapperStyle={data.length > 1 ? styles.row : undefined}
          contentContainerStyle={[
            styles.container,
            data.length === 0 && styles.emptyContainer,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Ainda não tens conteúdos comprados. Adquire músicas ou álbuns em
              www.csveventos.co.mz.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => handleItemPress(item)}
            >
              {item.cover_url ? (
                <Image source={{ uri: item.cover_url }} style={styles.cover} />
              ) : (
                <View style={[styles.cover, styles.placeholder]}>
                  <Text style={styles.placeholderText}>Sem capa</Text>
                </View>
              )}

              <Text style={styles.title} numberOfLines={1}>
                {item.title}
              </Text>

              <Text style={styles.subtitle} numberOfLines={1}>
                {item.itemType === "album" ? "Álbum" : "Música"}
                {item.artist?.name ? ` • ${item.artist.name}` : ""}
              </Text>
            </Pressable>
          )}
        />
      </View>
    </AppGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 56,
  },
  headerRow: {
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 140,
    flexGrow: 1,
  },
  header: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.white,
  },
  refreshButton: {
    minHeight: 36,
    borderRadius: 18,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  refreshButtonDisabled: {
    opacity: 0.75,
  },
  refreshButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "800",
  },
  emptyContainer: {
    justifyContent: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  row: {
    justifyContent: "space-between",
  },
  card: {
    width: "48%",
    marginBottom: 18,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  cover: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  placeholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },
  subtitle: {
    marginTop: 4,
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
  },
  emptyText: {
    textAlign: "center",
    color: "rgba(255,255,255,0.78)",
    marginTop: 40,
    fontSize: 15,
  },
});
