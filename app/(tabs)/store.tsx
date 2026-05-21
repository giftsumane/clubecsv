import { getStoreHome } from "@/services/store";
import AppGradient from "@/src/components/AppGradient";
import AlbumCardStore from "@/src/components/store/AlbumCardStore";
import EventCard from "@/src/components/store/EventCard";
import MerchCard from "@/src/components/store/MerchCard";
import { colors } from "@/src/theme/colors";
import type { StoreAlbum, StoreEvent, StoreMerch } from "@/src/types/store";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function StoreScreen() {
  const [events, setEvents] = useState<StoreEvent[]>([]);
  const [albums, setAlbums] = useState<StoreAlbum[]>([]);
  const [merch, setMerch] = useState<StoreMerch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchStore = async () => {
    try {
      setErrorMessage("");

      const data = await getStoreHome();

      console.log("STORE HOME DATA:", data);

      setEvents(Array.isArray(data?.events) ? data.events : []);
      setAlbums(Array.isArray(data?.albums) ? data.albums : []);
      setMerch(Array.isArray(data?.merch) ? data.merch : []);
    } catch (error: any) {
      console.log(
        "Erro ao carregar store:",
        error?.response?.data || error?.message || error
      );
      setEvents([]);
      setAlbums([]);
      setMerch([]);
      setErrorMessage("Não foi possível carregar a loja.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStore();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStore();
  };

  if (loading) {
    return (
      <AppGradient>
        <View style={styles.center}>
          <ActivityIndicator color={colors.yellow} />
          <Text style={styles.loadingText}>A carregar loja...</Text>
        </View>
      </AppGradient>
    );
  }

  return (
    <AppGradient>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>Clube CSV</Text>
        <Text style={styles.header}>Loja</Text>
        <Text style={styles.subheader}>
          Eventos, álbuns e artigos oficiais dos artistas
        </Text>

        {!!errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Eventos</Text>

          <FlatList
            data={events}
            horizontal
            keyExtractor={(item) => item.id.toString()}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => <EventCard item={item} />}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Nenhum evento disponível.</Text>
            }
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Álbuns</Text>

          <FlatList
            data={albums}
            horizontal
            keyExtractor={(item) => item.id.toString()}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => <AlbumCardStore item={item} />}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Nenhum álbum disponível.</Text>
            }
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Merch</Text>

          <FlatList
            data={merch}
            horizontal
            keyExtractor={(item) => item.id.toString()}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => <MerchCard item={item} />}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Nenhum artigo disponível.</Text>
            }
          />
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>
            Explora os produtos dos artistas da CSV
          </Text>
          <Text style={styles.infoText}>
            Explora eventos, álbuns e produtos oficiais dos artistas num ambiente único.
            A aquisição é feita no nosso website oficial.
          </Text>
        </View>

        <View style={{ height: 120 }} />
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
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 140,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    color: colors.textMuted,
    fontSize: 14,
  },
  kicker: {
    color: colors.yellow,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  header: {
    color: colors.white,
    fontSize: 30,
    fontWeight: "800",
  },
  subheader: {
    color: colors.textMuted,
    marginTop: 6,
    marginBottom: 24,
    fontSize: 14,
  },
  errorBox: {
    marginBottom: 18,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,80,80,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,80,80,0.28)",
  },
  errorText: {
    color: colors.white,
    fontSize: 14,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 14,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  infoBox: {
    marginTop: 8,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  infoTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },
  infoText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
});