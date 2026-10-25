import {
  flushAnalyticsQueue,
  trackAnalyticsEvent,
} from "@/services/analytics";
import { api } from "@/src/api/client";
import AppGradient from "@/src/components/AppGradient";
import { colors } from "@/src/theme/colors";
import type { StoreAlbum, StoreEvent } from "@/src/types/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const HOME_CACHE_KEY = "clubcsv-home-cache-v1";
const FEATURED_SLIDE_WIDTH = 320;
const FEATURED_SLIDE_GAP = 14;
const FEATURED_SLIDE_STEP = FEATURED_SLIDE_WIDTH + FEATURED_SLIDE_GAP;
const FEATURED_SLIDESHOW_INTERVAL_MS = 5000;

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
  featured_album?: StoreAlbum | null;
  best_selling_album?: StoreAlbum | null;
  recent_albums?: StoreAlbum[];
  featured_events?: StoreEvent[];
  events?: StoreEvent[];
};

type FeaturedSlide =
  | {
      id: string;
      type: "album";
      title: string;
      meta: string;
      summary: string;
      imageUrl?: string | null;
      album: StoreAlbum;
    }
  | {
      id: string;
      type: "event";
      title: string;
      meta: string;
      summary: string;
      imageUrl?: string | null;
      event: StoreEvent;
    }
  | {
      id: string;
      type: "news";
      title: string;
      meta: string;
      summary: string;
      imageUrl?: string | null;
      news: NewsItem;
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
  const [featuredAlbum, setFeaturedAlbum] = useState<StoreAlbum | null>(null);
  const [recentAlbums, setRecentAlbums] = useState<StoreAlbum[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<StoreEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOfflineCache, setIsOfflineCache] = useState(false);
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0);
  const featuredListRef = useRef<FlatList<FeaturedSlide>>(null);

  useEffect(() => {
    void trackAnalyticsEvent({
      eventType: "app_open",
      entityType: "page",
      metadata: {
        page: "home",
      },
    });

    void flushAnalyticsQueue();
  
    void fetchHome();
  }, []);

  async function loadCachedHome() {
    try {
      const cached = await AsyncStorage.getItem(HOME_CACHE_KEY);

      if (!cached) return false;

      const parsed: HomeResponse = JSON.parse(cached);

      setFeaturedNews(parsed.featured || null);
      setNews(Array.isArray(parsed.news) ? parsed.news : []);
      setFeaturedAlbum(parsed.featured_album || parsed.best_selling_album || null);
      setRecentAlbums(Array.isArray(parsed.recent_albums) ? parsed.recent_albums : []);
      setFeaturedEvents(
        Array.isArray(parsed.featured_events)
          ? parsed.featured_events
          : Array.isArray(parsed.events)
          ? parsed.events
          : []
      );
      setIsOfflineCache(true);

      return true;
    } catch (error) {
      console.log("Erro ao carregar cache da home:", error);
      return false;
    }
  }

  async function saveHomeCache(data: HomeResponse) {
    try {
      await AsyncStorage.setItem(HOME_CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.log("Erro ao guardar cache da home:", error);
    }
  }

  async function fetchHome() {
    try {
      setLoading(true);

      await loadCachedHome();

      const { data } = await api.get<HomeResponse>("/home");

      const payload: HomeResponse = {
        featured: data?.featured || null,
        news: Array.isArray(data?.news) ? data.news : [],
        featured_album: data?.featured_album || data?.best_selling_album || null,
        best_selling_album: data?.best_selling_album || null,
        recent_albums: Array.isArray(data?.recent_albums)
          ? data.recent_albums
          : [],
        featured_events: Array.isArray(data?.featured_events)
          ? data.featured_events
          : Array.isArray(data?.events)
          ? data.events
          : [],
      };

      setFeaturedNews(payload.featured || null);
      setNews(payload.news || []);
      setFeaturedAlbum(payload.featured_album || payload.best_selling_album || null);
      setRecentAlbums(payload.recent_albums || []);
      setFeaturedEvents(payload.featured_events || []);
      setIsOfflineCache(false);

      await saveHomeCache(payload);
    } catch (error) {
      console.log("Erro ao carregar home. A usar cache local:", error);

      await loadCachedHome();

      // Importante:
      // Não fazer setFeaturedNews(null)
      // Não fazer setNews([])
      // Assim, os dados antigos continuam visíveis offline.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchHome();
  }

  function handleNewsPress(item: NewsItem) {
    void trackAnalyticsEvent({
      eventType: "news_view",
      entityType: "news",
      entityId: item.id,
      metadata: {
        title: item.title,
        artist_name: item.artist_name ?? null,
        source: item.id === featuredNews?.id ? "featured" : "news_list",
        has_external_link: Boolean(item.link),
        offline_cache: isOfflineCache,
      },
    });
  
    router.push(`/news/${item.id}`);
  }

  function handleAlbumPress(item: StoreAlbum, source: string) {
    void trackAnalyticsEvent({
      eventType: "album_view",
      entityType: "album",
      entityId: item.id,
      metadata: {
        title: item.title,
        artist_name: item.artist_name ?? null,
        source,
        offline_cache: isOfflineCache,
      },
    });

    router.push(`/store/album/${item.id}`);
  }

  function handleEventPress(item: StoreEvent, source: string) {
    void trackAnalyticsEvent({
      eventType: "content_view",
      entityType: "page",
      entityId: item.id,
      metadata: {
        title: item.title,
        source,
        item_type: "event",
        offline_cache: isOfflineCache,
      },
    });

    router.push(`/store/event/${item.id}`);
  }

  const featuredSlides: FeaturedSlide[] = [
    ...(featuredAlbum
      ? [
          {
            id: `album-${featuredAlbum.id}`,
            type: "album" as const,
            title: featuredAlbum.title,
            meta: "Álbum em destaque",
            summary:
              featuredAlbum.description ||
              featuredAlbum.artist_name ||
              "Disponível na loja Clube CSV.",
            imageUrl: featuredAlbum.cover_url || featuredAlbum.image_url,
            album: featuredAlbum,
          },
        ]
      : []),
    ...featuredEvents.slice(0, 3).map((event) => ({
      id: `event-${event.id}`,
      type: "event" as const,
      title: event.title,
      meta: "Evento em destaque",
      summary: event.description || "Bilhetes disponíveis na loja Clube CSV.",
      imageUrl: event.image_url,
      event,
    })),
    ...(featuredNews
      ? [
          {
            id: `news-${featuredNews.id}`,
            type: "news" as const,
            title: featuredNews.title,
            meta: "Notícia em destaque",
            summary:
              featuredNews.summary ||
              featuredNews.body ||
              "Actualização Clube CSV.",
            imageUrl: featuredNews.image_url,
            news: featuredNews,
          },
        ]
      : []),
  ];

  useEffect(() => {
    if (featuredSlides.length <= 1) {
      setActiveFeaturedIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setActiveFeaturedIndex((currentIndex) => {
        const nextIndex = (currentIndex + 1) % featuredSlides.length;

        try {
          featuredListRef.current?.scrollToIndex({
            index: nextIndex,
            animated: true,
          });
        } catch {}

        return nextIndex;
      });
    }, FEATURED_SLIDESHOW_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [featuredSlides.length]);

  function handleFeaturedSlidePress(item: FeaturedSlide) {
    if (item.type === "album") {
      handleAlbumPress(item.album, "home_featured_carousel");
      return;
    }

    if (item.type === "event") {
      handleEventPress(item.event, "home_featured_carousel");
      return;
    }

    handleNewsPress(item.news);
  }

  if (
    loading &&
    !featuredNews &&
    news.length === 0 &&
    !featuredAlbum &&
    recentAlbums.length === 0 &&
    featuredEvents.length === 0
  ) {
    return (
      <AppGradient>
        <View style={styles.center}>
          <ActivityIndicator color={colors.yellow} />
          <Text style={styles.loadingText}>A carregar conteúdos...</Text>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.yellow}
          />
        }
      >
        <Text style={styles.kicker}>Clube CSV</Text>
        <Text style={styles.heading}>Destaques</Text>

        {isOfflineCache ? (
          <View style={styles.offlineNotice}>
            <Text style={styles.offlineNoticeText}>
              Modo offline: a mostrar dados guardados.
            </Text>
          </View>
        ) : null}

        {featuredSlides.length > 0 ? (
          <FlatList
            ref={featuredListRef}
            data={featuredSlides}
            horizontal
            pagingEnabled
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            getItemLayout={(_, index) => ({
              length: FEATURED_SLIDE_STEP,
              offset: FEATURED_SLIDE_STEP * index,
              index,
            })}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x / FEATURED_SLIDE_STEP
              );

              setActiveFeaturedIndex(
                Math.max(0, Math.min(index, featuredSlides.length - 1))
              );
            }}
            renderItem={({ item }) => (
              <Pressable
                style={styles.featuredCard}
                onPress={() => handleFeaturedSlidePress(item)}
              >
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.featuredImage}
                  />
                ) : (
                  <View style={[styles.featuredImage, styles.placeholder]}>
                    <Text style={styles.placeholderText}>Clube CSV</Text>
                  </View>
                )}

                <View style={styles.featuredOverlay}>
                  <Text style={styles.featuredMeta}>{item.meta}</Text>
                  <Text style={styles.featuredTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.featuredSummary} numberOfLines={3}>
                    {item.summary}
                  </Text>
                  <Text style={styles.linkHint}>
                    {item.type === "news"
                      ? "Ler notícia"
                      : item.type === "album"
                      ? "Ver álbum"
                      : "Ver evento"}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        ) : (
          <Text style={styles.emptyText}>Sem destaques disponíveis.</Text>
        )}

        {featuredSlides.length > 1 ? (
          <View style={styles.slideDots}>
            {featuredSlides.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.slideDot,
                  index === activeFeaturedIndex && styles.slideDotActive,
                ]}
              />
            ))}
          </View>
        ) : null}

        {featuredAlbum ? (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Álbum mais vendido</Text>
            <Pressable
              style={styles.albumFeatureCard}
              onPress={() => handleAlbumPress(featuredAlbum, "home_best_selling_album")}
            >
              {featuredAlbum.cover_url || featuredAlbum.image_url ? (
                <Image
                  source={{
                    uri: featuredAlbum.cover_url || featuredAlbum.image_url || "",
                  }}
                  style={styles.albumFeatureImage}
                />
              ) : (
                <View style={[styles.albumFeatureImage, styles.placeholder]}>
                  <Text style={styles.placeholderText}>Álbum</Text>
                </View>
              )}
              <View style={styles.albumFeatureContent}>
                <Text style={styles.albumFeatureTitle} numberOfLines={2}>
                  {featuredAlbum.title}
                </Text>
                <Text style={styles.albumFeatureMeta} numberOfLines={1}>
                  {featuredAlbum.artist_name || "Clube CSV"}
                </Text>
                <Text style={styles.newsAction}>Ver na loja</Text>
              </View>
            </Pressable>
          </View>
        ) : null}

        {recentAlbums.length > 0 ? (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Álbuns adicionados recentemente</Text>
            <FlatList
              data={recentAlbums}
              horizontal
              keyExtractor={(item) => String(item.id)}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.albumCard}
                  onPress={() => handleAlbumPress(item, "home_recent_albums")}
                >
                  {item.cover_url || item.image_url ? (
                    <Image
                      source={{ uri: item.cover_url || item.image_url || "" }}
                      style={styles.albumImage}
                    />
                  ) : (
                    <View style={[styles.albumImage, styles.placeholder]}>
                      <Text style={styles.placeholderText}>Álbum</Text>
                    </View>
                  )}
                  <Text style={styles.albumTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.albumMeta} numberOfLines={1}>
                    {item.artist_name || "Clube CSV"}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        ) : null}

        {featuredEvents.length > 0 ? (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Eventos em destaque</Text>
            <FlatList
              data={featuredEvents}
              horizontal
              keyExtractor={(item) => String(item.id)}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.eventCard}
                  onPress={() => handleEventPress(item, "home_featured_events")}
                >
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.eventImage} />
                  ) : (
                    <View style={[styles.eventImage, styles.placeholder]}>
                      <Text style={styles.placeholderText}>Evento</Text>
                    </View>
                  )}
                  <Text style={styles.eventTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        ) : null}

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
                  <Image
                    source={{ uri: item.image_url }}
                    style={styles.newsImage}
                  />
                ) : (
                  <View style={[styles.newsImage, styles.placeholder]}>
                    <Text style={styles.placeholderText}>Sem imagem</Text>
                  </View>
                )}

                <View style={styles.newsContent}>
                  <Text style={styles.newsMeta}>
                    {item.artist_name || "Club CSV"}
                    {item.published_at
                      ? ` • ${formatDate(item.published_at)}`
                      : ""}
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
          <Text style={styles.infoTitle}>
            Tudo sobre o teu artista, num só lugar
          </Text>

          <Text style={styles.infoText}>
            O Club CSV foi pensado para aproximar os fãs dos seus artistas
            favoritos, com acesso centralizado a notícias, conteúdos,
            biblioteca e bilhetes.
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
  offlineNotice: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    marginBottom: 14,
  },
  offlineNoticeText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  featuredCard: {
    width: 320,
    marginRight: 14,
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
  slideDots: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
  },
  slideDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  slideDotActive: {
    width: 18,
    backgroundColor: colors.yellow,
  },
  sectionBlock: {
    marginTop: 28,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 14,
  },
  albumFeatureCard: {
    minHeight: 128,
    flexDirection: "row",
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  albumFeatureImage: {
    width: 128,
    height: 128,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  albumFeatureContent: {
    flex: 1,
    padding: 14,
    justifyContent: "center",
  },
  albumFeatureTitle: {
    color: colors.white,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "800",
  },
  albumFeatureMeta: {
    color: colors.textMuted,
    marginTop: 6,
    fontSize: 13,
  },
  albumCard: {
    width: 142,
    marginRight: 14,
  },
  albumImage: {
    width: "100%",
    height: 142,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  albumTitle: {
    color: colors.white,
    marginTop: 8,
    fontSize: 14,
    fontWeight: "800",
  },
  albumMeta: {
    color: colors.textMuted,
    marginTop: 3,
    fontSize: 12,
  },
  eventCard: {
    width: 210,
    marginRight: 14,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  eventImage: {
    width: "100%",
    height: 170,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  eventTitle: {
    color: colors.white,
    padding: 12,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
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
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 10,
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
  actionsRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  externalActionText: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: "800",
  },
});
