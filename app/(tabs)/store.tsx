import { getStoreHome } from "@/services/store";
import AppGradient from "@/src/components/AppGradient";
import EventCard from "@/src/components/store/EventCard";
import MerchCard from "@/src/components/store/MerchCard";
import { colors } from "@/src/theme/colors";
import type { StoreEvent, StoreMerch } from "@/src/types/store";
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
  const [merch, setMerch] = useState<StoreMerch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStore = async () => {
    try {
      const data = await getStoreHome();
      setEvents(data.events || []);
      setMerch(data.merch || []);
    } catch (error) {
      console.log("Erro ao carregar store:", error);
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
          Eventos e artigos oficiais dos artistas
        </Text>

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
          <Text style={styles.infoTitle}>Explora os produtos dos artistas da CSV</Text>
          <Text style={styles.infoText}>
            Explora os melhores eventos e produtos oficiais dos artistas num ambiente único. 
            Adquire os produtos no nosso website.
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