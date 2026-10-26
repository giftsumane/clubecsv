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
        renderItem={({ item }) => {
          const status = getStatusMeta(item.status);

          return (
            <View style={styles.card}>
            <Text style={styles.typeLabel}>{item.historyType === "order" ? "ENCOMENDA MERCH" : "COMPRA DIGITAL"}</Text>
            <Text style={styles.ref}>{item.reference}</Text>
            <Text style={styles.amount}>{formatPrice(Number(item.historyType === "order" ? item.total || item.subtotal : item.amount))}</Text>
            <View style={[styles.statusBadge, { backgroundColor: status.backgroundColor }]}>
              <Text style={[styles.statusText, { color: status.textColor }]}>{status.label}</Text>
            </View>
            {item.historyType === "order" && item.items?.[0] ? (
              <Text style={styles.itemTitle}>{item.items[0].quantity} × {item.items[0].title}</Text>
            ) : null}
            {item.historyType === "order" && item.delivery_zone === "pickup" ? (
              <Text style={styles.itemTitle}>Levantamento na CSV · Sem delivery</Text>
            ) : null}
            {item.historyType === "order" && ["paid", "processing"].includes(item.status) ? (
              <View style={styles.trackingBox}>
                <Text style={styles.trackingText}>A produção demora normalmente 24h e pode levar até 48h.</Text>
                {item.production_due_at ? (
                  <Text style={styles.trackingStrong}>Limite previsto: {formatDateTime(item.production_due_at)}</Text>
                ) : null}
              </View>
            ) : null}
            {item.historyType === "order" && item.delivery_zone === "outside_maputo_center" && item.estimated_delivery_at ? (
              <View style={styles.deliveryEstimate}>
                <Ionicons name="calendar-outline" size={17} color={colors.yellow} />
                <Text style={styles.deliveryEstimateText}>Previsão de chegada: {formatDateTime(item.estimated_delivery_at)}</Text>
              </View>
            ) : null}
            </View>
          );
        }}
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
  statusBadge: { alignSelf: "flex-start", marginTop: 10, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  statusText: { fontSize: 12, fontWeight: "800" },
  trackingBox: { marginTop: 12, padding: 11, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)" },
  trackingText: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  trackingStrong: { color: colors.white, fontSize: 13, fontWeight: "700", marginTop: 5 },
  deliveryEstimate: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 12 },
  deliveryEstimateText: { flex: 1, color: colors.yellow, fontSize: 13, fontWeight: "700" },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
  },
});

function getStatusMeta(status?: string) {
  const statuses: Record<string, { label: string; backgroundColor: string; textColor: string }> = {
    pending_payment: { label: "Aguarda pagamento", backgroundColor: "#F59E0B", textColor: "#17100A" },
    awaiting_delivery_quote: { label: "Aguarda preço de delivery", backgroundColor: "#38BDF8", textColor: "#082F49" },
    paid: { label: "Para entrar em produção", backgroundColor: "#6366F1", textColor: "#FFFFFF" },
    processing: { label: "Em produção", backgroundColor: "#A855F7", textColor: "#FFFFFF" },
    ready: { label: "Pronta", backgroundColor: "#22C55E", textColor: "#052E16" },
    shipped: { label: "Enviada", backgroundColor: "#0EA5E9", textColor: "#FFFFFF" },
    delivered: { label: "Entregue", backgroundColor: "#15803D", textColor: "#FFFFFF" },
    cancelled: { label: "Cancelada", backgroundColor: "#DC2626", textColor: "#FFFFFF" },
    pending: { label: "Pendente", backgroundColor: "#F59E0B", textColor: "#17100A" },
    failed: { label: "Falhada", backgroundColor: "#DC2626", textColor: "#FFFFFF" },
    canceled: { label: "Cancelada", backgroundColor: "#DC2626", textColor: "#FFFFFF" },
  };

  return statuses[status || ""] || {
    label: status || "—",
    backgroundColor: "#475569",
    textColor: "#FFFFFF",
  };
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}
