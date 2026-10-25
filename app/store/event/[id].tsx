import { api } from "@/src/api/client";
import AppGradient from "@/src/components/AppGradient";
import { colors } from "@/src/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
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

type StoreEventDetail = {
  event: {
    id: number;
    title: string;
    description?: string | null;
    image_url?: string | null;
    ticket_type?: string | null;
    price_normal?: number | null;
    price_vip?: number | null;
    external_url?: string | null;
    created_at?: string | null;
    type: "event";
  };
};

type EventPromotion = {
  id: number;
  album_title?: string | null;
  ticket_name?: string | null;
  normal_price: number;
  special_price: number;
  starts_at: string;
  ends_at: string;
  owns_album: boolean;
  used: boolean;
  eligible: boolean;
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

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<StoreEventDetail["event"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [promotion, setPromotion] = useState<EventPromotion | null>(null);
  const [openingPromotion, setOpeningPromotion] = useState(false);

  useEffect(() => {
    const fetchEventDetail = async () => {
      try {
        setLoading(true);
        const { data } = await api.get<StoreEventDetail>(`/store/events/${id}`);
        setEvent(data.event || null);

        try {
          const promotionResponse = await api.get(`/store/events/${id}/promotion`);
          setPromotion(promotionResponse.data?.promotion || null);
        } catch {
          setPromotion(null);
        }
      } catch (error) {
        console.log("Erro ao carregar detalhe do evento:", error);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchEventDetail();
    }
  }, [id]);

  const handleOpenTickets = async () => {
    if (!event?.external_url) return;

    try {
      await Linking.openURL(event.external_url);
    } catch (error) {
      console.log("Erro ao abrir link do evento:", error);
    }
  };

  const handlePromotionCheckout = async () => {
    if (!event || openingPromotion) return;

    try {
      setOpeningPromotion(true);
      const { data } = await api.post(`/store/events/${event.id}/promotion-checkout`);
      if (!data?.url) throw new Error("Link de promoção indisponível.");
      await WebBrowser.openBrowserAsync(data.url);
    } catch (error: any) {
      console.log("Erro ao abrir promoção:", error?.response?.data || error);
    } finally {
      setOpeningPromotion(false);
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
          <Text style={styles.helper}>A carregar evento...</Text>
        </View>
      </AppGradient>
    );
  }

  if (!event) {
    return (
      <AppGradient>
        <View style={styles.center}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </Pressable>
          <Text style={styles.emptyTitle}>Evento não encontrado.</Text>
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

        {event.image_url ? (
          <Image source={{ uri: event.image_url }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Text style={styles.placeholderText}>Sem imagem</Text>
          </View>
        )}
        
        <Text style={styles.meta}>
          Club CSV
          {event.created_at ? ` • ${formatDate(event.created_at)}` : ""}
        </Text>

        <Text style={styles.title}>{event.title}</Text>

        {event.description ? (
          <Text style={styles.summary}>{event.description}</Text>
        ) : null}

        <View style={styles.bodyWrapper}>

          {event.price_normal !== null && event.price_normal !== undefined && (
            <Text style={styles.body}>Preço normal: {event.price_normal} MZN</Text>
          )}

          {event.price_vip !== null && event.price_vip !== undefined && (
            <Text style={styles.body}>Preço VIP: {event.price_vip} MZN</Text>
          )}
        </View>

        {promotion ? (
          <View style={styles.promotionCard}>
            <Text style={styles.promotionKicker}>BENEFÍCIO CLUBE CSV</Text>
            <Text style={styles.promotionTitle}>
              Preço especial para clientes do álbum {promotion.album_title || "associado"}
            </Text>
            <Text style={styles.promotionDates}>
              Válido até {formatDate(promotion.ends_at)}
            </Text>
            <View style={styles.promotionPriceRow}>
              <Text style={styles.oldPrice}>{promotion.normal_price} MZN</Text>
              <Text style={styles.specialPrice}>{promotion.special_price} MZN</Text>
            </View>
            {!promotion.owns_album ? (
              <Text style={styles.promotionHint}>Compra o álbum associado para desbloquear este benefício.</Text>
            ) : promotion.used ? (
              <Text style={styles.promotionHint}>Este benefício já foi utilizado.</Text>
            ) : (
              <Pressable
                style={[styles.promotionButton, openingPromotion && styles.buttonDisabled]}
                onPress={handlePromotionCheckout}
                disabled={openingPromotion}
              >
                {openingPromotion ? (
                  <ActivityIndicator color="#111" />
                ) : (
                  <Text style={styles.buttonText}>Comprar com preço especial</Text>
                )}
              </Pressable>
            )}
          </View>
        ) : null}

        {event.external_url && (
          <Pressable style={styles.button} onPress={handleOpenTickets}>
            <Text style={styles.buttonText}>Ver detalhes</Text>
          </Pressable>
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
    marginBottom: 8,
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
  buttonText: {
    color: "#111",
    fontSize: 16,
    fontWeight: "800",
  },
  buttonDisabled: { opacity: 0.7 },
  promotionCard: {
    marginTop: 22,
    padding: 18,
    borderRadius: 20,
    backgroundColor: "rgba(255,214,0,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,214,0,0.45)",
  },
  promotionKicker: { color: colors.yellow, fontSize: 12, fontWeight: "900", letterSpacing: 1 },
  promotionTitle: { color: colors.white, fontSize: 18, lineHeight: 24, fontWeight: "800", marginTop: 8 },
  promotionDates: { color: colors.textMuted, fontSize: 13, marginTop: 8 },
  promotionPriceRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14 },
  oldPrice: { color: colors.textMuted, fontSize: 16, textDecorationLine: "line-through" },
  specialPrice: { color: colors.yellow, fontSize: 24, fontWeight: "900" },
  promotionHint: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 14 },
  promotionButton: { marginTop: 16, backgroundColor: colors.yellow, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
});
