import { openRealCheckout } from "@/services/checkout";
import { api } from "@/src/api/client";
import AppGradient from "@/src/components/AppGradient";
import { colors } from "@/src/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
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

type StoreAlbumDetail = {
  album: {
    id: number;
    title: string;
    description?: string | null;
    image_url?: string | null;
    artist_name?: string | null;
    price?: number | null;
    external_url?: string | null;
    release_date?: string | null;
    created_at?: string | null;
    type: "album";
  };
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

export default function AlbumDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [album, setAlbum] = useState<StoreAlbumDetail["album"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    const fetchAlbumDetail = async () => {
      try {
        setLoading(true);
        const { data } = await api.get<StoreAlbumDetail>(`/store/albums/${id}`);
        setAlbum(data.album || null);
      } catch (error) {
        console.log("Erro ao carregar detalhe do álbum:", error);
        setAlbum(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchAlbumDetail();
    }
  }, [id]);

  const handleBuyAlbum = async () => {
    if (!album?.id) return;

    try {
      setBuying(true);
      await openRealCheckout("album", Number(album.id));
    } catch (error: any) {
      console.log("Erro ao abrir checkout do álbum:", error);
      Alert.alert("Erro", error?.message || "Não foi possível iniciar a compra.");
    } finally {
      setBuying(false);
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
          <Text style={styles.helper}>A carregar álbum...</Text>
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

        {album.image_url ? (
          <Image source={{ uri: album.image_url }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Text style={styles.placeholderText}>Sem capa</Text>
          </View>
        )}

        <Text style={styles.meta}>
          Clube CSV
          {album.release_date ? ` • ${formatDate(album.release_date)}` : ""}
        </Text>

        <Text style={styles.title}>{album.title}</Text>

        {!!album.artist_name && (
          <Text style={styles.artist}>Artista: {album.artist_name}</Text>
        )}

        {album.description ? (
          <Text style={styles.summary}>{album.description}</Text>
        ) : null}

        <View style={styles.bodyWrapper}>
          {album.price !== null && album.price !== undefined && (
            <Text style={styles.body}>
              Preço: {Number(album.price).toFixed(2)} MZN
            </Text>
          )}

          <Text style={styles.note}>
            A compra será concluída numa página web segura, sem precisares de introduzir novamente os teus dados.
          </Text>
        </View>

        <Pressable
          style={[styles.button, buying && styles.buttonDisabled]}
          onPress={handleBuyAlbum}
          disabled={buying}
        >
          <Text style={styles.buttonText}>
            {buying ? "A abrir checkout..." : "Adquirir álbum"}
          </Text>
        </Pressable>
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
  artist: {
    marginTop: 12,
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
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
    marginBottom: 8,
  },
  note: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  button: {
    marginTop: 24,
    backgroundColor: colors.yellow,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#111",
    fontSize: 16,
    fontWeight: "800",
  },
});