import { api } from "@/src/api/client";
import AppGradient from "@/src/components/AppGradient";
import { colors } from "@/src/theme/colors";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
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

type HomeResponse = {
  featured?: NewsItem | null;
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

export default function HomeScreen() {
  const [featuredNews, setFeaturedNews] = useState<NewsItem | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHome();
  }, []);

  const fetchHome = async () => {
    try {
      setLoading(true);

      const { data } = await api.get<HomeResponse>("/home");

      setFeaturedNews(data?.featured || null);
      setNews(Array.isArray(data?.news) ? data.news : []);
    } catch (error) {
      console.log("Erro ao carregar home", error);
      setFeaturedNews(null);
      setNews([]);
    } finally {
      setLoading(false);
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
        <Text style={styles.kicker}>Clube CSV</Text>
        <Text style={styles.heading}>Notícia em destaque</Text>

        {featuredNews ? (
          <Pressable
            style={styles.featuredCard}
            onPress={() => handleNewsPress(featuredNews)}
          >
            {featuredNews.image_url ? (
              <Image
                source={{ uri: featuredNews.image_url }}
                style={styles.featuredImage}
              />
            ) : (
              <View style={[styles.featuredImage, styles.placeholder]}>
                <Text style={styles.placeholderText}>Sem imagem</Text>
              </View>
            )}

            <View style={styles.featuredOverlay}>
              <Text style={styles.featuredMeta}>
                {featuredNews.artist_name || "Club CSV"}
                {featuredNews.published_at
                  ? ` • ${formatDate(featuredNews.published_at)}`
                  : ""}
              </Text>

              <Text style={styles.featuredTitle}>{featuredNews.title}</Text>

              <Text style={styles.featuredSummary}>
                {featuredNews.summary ||
                  featuredNews.body ||
                  "Sem descrição disponível."}
              </Text>

              {featuredNews.link ? (
                <Text style={styles.linkHint}>Abrir link</Text>
              ) : (
                <Text style={styles.linkHint}>Ler notícia</Text>
              )}
            </View>
          </Pressable>
        ) : (
          <Text style={styles.emptyText}>Sem notícia em destaque.</Text>
        )}

        <Text style={[styles.heading, styles.sectionSpacing]}>
          Últimas notícias
        </Text>

        <View style={styles.newsList}>
          {news.length === 0 ? (
            <Text style={styles.emptyText}>Sem notícias disponíveis.</Text>
          ) : (
            news.map((item) => (
              <Pressable
                key={item.id}
                style={styles.newsCard}
                onPress={() => handleNewsPress(item)}
              >
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.newsImage} />
                ) : (
                  <View style={[styles.newsImage, styles.placeholder]}>
                    <Text style={styles.placeholderText}>Sem imagem</Text>
                  </View>
                )}

                <View style={styles.newsContent}>
                  <Text style={styles.newsMeta}>
                    {item.artist_name || "Club CSV"}
                    {item.published_at ? ` • ${formatDate(item.published_at)}` : ""}
                  </Text>

                  <Text style={styles.newsTitle} numberOfLines={2}>
                    {item.title}
                  </Text>

                  <Text style={styles.newsSummary} numberOfLines={3}>
                    {item.summary || item.body || "Sem descrição disponível."}
                  </Text>

                  <Text style={styles.newsAction}>
                    {item.link ? "Abrir link" : "Ler notícia"}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Tudo sobre o teu artista, num só lugar</Text>
          <Text style={styles.infoText}>
            O Club CSV foi pensado para aproximar os fãs dos seus artistas
            favoritos, com acesso centralizado a notícias, conteúdos, biblioteca
            e bilhetes.
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
  contentContainer: {
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 140,
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
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 14,
    color: colors.white,
  },
  sectionSpacing: {
    marginTop: 28,
  },
  featuredCard: {
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  featuredImage: {
    width: "100%",
    height: 320,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  featuredOverlay: {
    padding: 16,
  },
  featuredMeta: {
    color: colors.yellow,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  featuredTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },
  featuredSummary: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  linkHint: {
    color: colors.yellow,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 14,
  },
  newsList: {
    gap: 14,
  },
  newsCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  newsImage: {
    width: 110,
    height: 110,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  newsContent: {
    flex: 1,
    padding: 12,
    justifyContent: "center",
  },
  newsMeta: {
    color: colors.yellow,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 6,
  },
  newsTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
  },
  newsSummary: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  newsAction: {
    color: colors.yellow,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 8,
  },
  infoBox: {
    marginTop: 28,
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  placeholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: colors.textMuted,
  },
});