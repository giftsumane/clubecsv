import { api } from "@/src/api/client";
import AppGradient from "@/src/components/AppGradient";
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

type NewsDetail = {
  id: number;
  title: string;
  summary?: string | null;
  body?: string | null;
  image_url?: string | null;
  artist_name?: string | null;
  published_at?: string | null;
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

export default function NewsDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [news, setNews] = useState<NewsDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNewsDetail = async () => {
      try {
        setLoading(true);
        const { data } = await api.get<NewsDetail>(`/news/${id}`);
        setNews(data || null);
      } catch (error) {
        console.log("Erro ao carregar detalhe da notícia:", error);
        setNews(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchNewsDetail();
    }
  }, [id]);

  if (loading) {
    return (
      <AppGradient>
        <View style={styles.center}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </Pressable>
          <ActivityIndicator color={colors.yellow} />
          <Text style={styles.helper}>A carregar notícia...</Text>
        </View>
      </AppGradient>
    );
  }

  if (!news) {
    return (
      <AppGradient>
        <View style={styles.center}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </Pressable>
          <Text style={styles.emptyTitle}>Notícia não encontrada.</Text>
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

        {news.image_url ? (
          <Image source={{ uri: news.image_url }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Text style={styles.placeholderText}>Sem imagem</Text>
          </View>
        )}

        <Text style={styles.meta}>
          {news.artist_name || "Club CSV"}
          {news.published_at ? ` • ${formatDate(news.published_at)}` : ""}
        </Text>

        <Text style={styles.title}>{news.title}</Text>

        {news.summary ? (
          <Text style={styles.summary}>{news.summary}</Text>
        ) : null}

        <View style={styles.bodyWrapper}>
          <Text style={styles.body}>
            {news.body || "Sem conteúdo disponível para esta notícia."}
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
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 140,
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
  helper: {
    marginTop: 10,
    color: colors.textMuted,
    fontSize: 14,
  },
  emptyTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  image: {
    width: "100%",
    height: 320,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 18,
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: colors.textMuted,
  },
  meta: {
    color: colors.yellow,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 10,
  },
  title: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
  summary: {
    marginTop: 14,
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyWrapper: {
    marginTop: 22,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  body: {
    color: colors.white,
    fontSize: 15,
    lineHeight: 24,
  },
});