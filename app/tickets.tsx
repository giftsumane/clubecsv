import { api } from "@/src/api/client";
import AppGradient from "@/src/components/AppGradient";
import { colors } from "@/src/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Ticket = {
  id: number;
  codigoBilhete: string;
  qrcode_path: string;
  evento_nome: string;
  data_evento: string;
  tipo_bilhete: string;
};

export default function TicketsScreen() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const { data } = await api.get("/tickets/my");
      setTickets(data.tickets || []);
    } catch (error) {
      console.log("Erro ao carregar bilhetes:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppGradient>
        <View style={styles.center}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </Pressable>
          <ActivityIndicator color={colors.white} />
        </View>
      </AppGradient>
    );
  }

  if (!tickets.length) {
    return (
      <AppGradient>
        <View style={styles.center}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </Pressable>
          <Text style={styles.empty}>Sem bilhetes ainda 🎟️</Text>
        </View>
      </AppGradient>
    );
  }

  return (
    <AppGradient>
      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color={colors.white} />
            </Pressable>

            <Text style={styles.kicker}>A tua conta</Text>
            <Text style={styles.title}>Meus Bilhetes</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.eventTitle}>{item.evento_nome}</Text>

            <Text style={styles.subtitle}>
              {item.tipo_bilhete} • {item.data_evento}
            </Text>

            <Image
              source={{ uri: item.qrcode_path }}
              style={styles.qr}
              resizeMode="contain"
            />

            <Text style={styles.code}>{item.codigoBilhete}</Text>
          </View>
        )}
      />
    </AppGradient>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingTop: 40,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 20,
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
  kicker: {
    color: colors.yellow,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.white,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  eventTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 12,
  },
  qr: {
    width: "100%",
    height: 180,
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  code: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    fontWeight: "700",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 16,
    textAlign: "center",
  },
});