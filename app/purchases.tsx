import { api } from "@/src/api/client";
import { getMyOrders } from "@/services/orders";
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
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    try {
      const [{ data }, merchOrders] = await Promise.all([
        api.get("/purchases/my"),
        getMyOrders(),
      ]);
      setPurchases(data.purchases || []);
      setOrders(merchOrders);
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

  if (!purchases.length && !orders.length) {
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
        data={[
          ...orders.map((order) => ({ ...order, historyType: "order" as const })),
          ...purchases.map((purchase) => ({ ...purchase, historyType: "purchase" as const })),
        ]}
        keyExtractor={(item) => `${item.historyType}-${item.id}`}
        contentContainerStyle={styles.container}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.typeLabel}>{item.historyType === "order" ? "ENCOMENDA MERCH" : "COMPRA DIGITAL"}</Text>
            <Text style={styles.ref}>{item.reference}</Text>
            <Text style={styles.amount}>{formatPrice(Number(item.historyType === "order" ? item.total || item.subtotal : item.amount))}</Text>
            <Text style={styles.status}>Estado: {formatStatus(item.status)}</Text>
            {item.historyType === "order" && item.items?.[0] ? (
              <Text style={styles.itemTitle}>{item.items[0].quantity} × {item.items[0].title}</Text>
            ) : null}
            {item.historyType === "order" && item.delivery_zone === "pickup" ? (
              <Text style={styles.itemTitle}>Levantamento na CSV · Sem delivery</Text>
            ) : null}
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
              Consulta compras digitais e acompanha encomendas de merch.
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
  typeLabel: { color: colors.yellow, fontSize: 11, fontWeight: "900", letterSpacing: 0.8, marginBottom: 6 },
  itemTitle: { marginTop: 8, color: colors.white, fontSize: 14 },
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

function formatStatus(status?: string) {
  const labels: Record<string, string> = {
    pending_payment: "Aguarda pagamento",
    awaiting_delivery_quote: "Aguarda preço de delivery",
    paid: "Paga",
    processing: "Em preparação",
    ready: "Pronta",
    shipped: "Enviada",
    delivered: "Entregue",
    cancelled: "Cancelada",
    pending: "Pendente",
    failed: "Falhada",
    canceled: "Cancelada",
  };
  return labels[status || ""] || status || "—";
}
