import { api } from "@/src/api/client";
import AppGradient from "@/src/components/AppGradient";
import { colors } from "@/src/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
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

  useEffect(() => {
    const fetchEventDetail = async () => {
      try {
        setLoading(true);
        const { data } = await api.get<StoreEventDetail>(`/store/events/${id}`);
        setEvent(data.event || null);
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
          {!!event.ticket_type && (
            <Text style={styles.body}>Tipo de bilhete: {event.ticket_type}</Text>
          )}

          {event.price_normal !== null && event.price_normal !== undefined && (
            <Text style={styles.body}>Preço normal: {event.price_normal} MZN</Text>
          )}

          {event.price_vip !== null && event.price_vip !== undefined && (
            <Text style={styles.body}>Preço VIP: {event.price_vip} MZN</Text>
          )}
        </View>

        {!!event.external_url && (
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
});