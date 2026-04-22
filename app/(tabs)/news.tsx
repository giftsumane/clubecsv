import { api } from "@/src/api/client";
import AppGradient from "@/src/components/AppGradient";
import { colors } from "@/src/theme/colors";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from "react-native";

type NewsItem = {
  id: number;
  title: string;
  summary?: string | null;
  body?: string | null;
  image_url?: string | null;
  artist_name?: string | null;
  published_at?: string | null;
  link?: string | null;
};

type NewsResponse = {
  news?: NewsItem[];
};

function formatDate(date?: string | null) {
  if (!date) return "";
  try {
    return new Date(date).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

export default function NewsScreen() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = async () => {
    try {
      const { data } = await api.get<NewsResponse>("/news");
      setNews(Array.isArray(data?.news) ? data.news : []);
    } catch (error) {
      console.log("Erro ao carregar notícias:", error);
      setNews([]);
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        await fetchNews();
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchNews();
    } finally {
      setRefreshing(false);
    }
  };

  const handleNewsPress = async (item: NewsItem) => {
    if (item.link) {
      try {
        await WebBrowser.openBrowserAsync(item.link);
      } catch (error) {
        console.log("Erro ao abrir link da notícia:", error);
      }
      return;
    }

    router.push(`/news/${item.id}`);
  };

  if (loading) {
    return (
      <AppGradient>
        <View style={styles.center}>
          <ActivityIndicator color={colors.yellow} />
          <Text style={styles.helper}>A carregar notícias...</Text>
        </View>
      </AppGradient>
    );
  }

  return (
    <AppGradient>
      <View style={styles.screen}>
        <FlatList
          data={news}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.kicker}>Clube CSV</Text>
              <Text style={styles.heading}>Notícias</Text>
              <Text style={styles.subheading}>
                Acompanha lançamentos, novidades e actualizações dos artistas.
              </Text>
            </View>
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>Sem notícias disponíveis.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => handleNewsPress(item)}
            >
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.image} />
              ) : (
                <View style={[styles.image, styles.placeholder]}>
                  <Text style={styles.placeholderText}>Sem imagem</Text>
                </View>
              )}

              <View style={styles.cardContent}>
                <Text style={styles.meta}>
                  {item.artist_name || "Clube CSV"}
                  {item.published_at ? ` • ${formatDate(item.published_at)}` : ""}
                </Text>

                <Text style={styles.title}>{item.title}</Text>

                <Text style={styles.summary} numberOfLines={3}>
                  {item.summary || item.body || "Sem descrição disponível."}
                </Text>

                <Text style={styles.actionText}>
                  {item.link ? "Abrir link" : "Ler notícia"}
                </Text>
              </View>
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
    backgroundColor: "transparent",
  },
  contentContainer: {
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 140,
  },
  header: {
    marginBottom: 18,
  },
  kicker: {
    color: colors.yellow,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.white,
  },
  subheading: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  card: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  image: {
    width: "100%",
    height: 220,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  placeholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: colors.textMuted,
  },
  cardContent: {
    padding: 14,
  },
  meta: {
    color: colors.yellow,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  title: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
  },
  summary: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  actionText: {
    marginTop: 10,
    color: colors.yellow,
    fontSize: 12,
    fontWeight: "800",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  helper: {
    marginTop: 10,
    color: colors.textMuted,
    fontSize: 14,
  },
});