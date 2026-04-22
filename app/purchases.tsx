import { api } from "@/src/api/client";
import AppGradient from "@/src/components/AppGradient";
import { colors } from "@/src/theme/colors";
import type { Purchase } from "@/src/types";
import { formatPrice } from "@/src/utils/formatters";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function PurchasesScreen() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    try {
      const { data } = await api.get("/purchases/my");
      setPurchases(data.purchases || []);
    } catch (error) {
      console.log(error);
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
          <ActivityIndicator color={colors.yellow} />
          <Text style={styles.helperText}>A carregar compras...</Text>
        </View>
      </AppGradient>
    );
  }

  if (!purchases.length) {
    return (
      <AppGradient>
        <View style={styles.center}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </Pressable>
          <Text style={styles.emptyText}>Sem compras ainda.</Text>
        </View>
      </AppGradient>
    );
  }

  return (
    <AppGradient>
      <FlatList
        data={purchases}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.container}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.ref}>{item.reference}</Text>
            <Text style={styles.amount}>{formatPrice(item.amount)}</Text>
            <Text style={styles.status}>Estado: {item.status}</Text>
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color={colors.white} />
            </Pressable>

            <Text style={styles.kicker}>A tua conta</Text>
            <Text style={styles.title}>Histórico de compras</Text>
            <Text style={styles.subtitle}>
              Consulta as tuas compras de músicas e álbuns.
            </Text>
          </View>
        }
      />
    </AppGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 40,
    paddingBottom: 140,
    flexGrow: 1,
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  helperText: {
    marginTop: 10,
    color: colors.textMuted,
    fontSize: 14,
  },
  card: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  ref: {
    fontWeight: "800",
    color: colors.white,
    fontSize: 15,
  },
  amount: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "800",
    color: colors.yellow,
  },
  status: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 14,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
  },
});