import { getStoreMerch } from "@/services/store";
import { createMerchOrder } from "@/services/orders";
import AppGradient from "@/src/components/AppGradient";
import { colors } from "@/src/theme/colors";
import type { StoreMerch } from "@/src/types/store";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
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
  TextInput,
  View,
} from "react-native";

export default function MerchDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<StoreMerch | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("Maputo");
  const [province, setProvince] = useState("Maputo Cidade");
  const [deliveryZone, setDeliveryZone] = useState<"pickup" | "maputo_center" | "outside_maputo_center">("pickup");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  useEffect(() => {
    const fetchMerch = async () => {
      try {
        if (!params.id) return;
        const data = await getStoreMerch(Number(params.id));
        setItem(data);
      } catch (error) {
        console.log("Erro ao carregar merch:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMerch();
  }, [params.id]);

  const submitOrder = async () => {
    if (!item || submitting) return;

    try {
      setSubmitting(true);
      const result = await createMerchOrder({
        merch_id: item.id,
        quantity: Math.max(1, Number(quantity) || 1),
        customer_name: customerName.trim(),
        phone: phone.trim(),
        address: deliveryZone === "pickup" ? undefined : address.trim(),
        neighborhood: deliveryZone === "pickup" ? undefined : neighborhood.trim() || undefined,
        city: deliveryZone === "pickup" ? undefined : city.trim(),
        province: deliveryZone === "pickup" ? undefined : province.trim(),
        delivery_zone: deliveryZone,
        delivery_notes: deliveryNotes.trim() || undefined,
      });

      if (result.checkout_url) {
        await WebBrowser.openBrowserAsync(result.checkout_url);
        Alert.alert("Encomenda criada", "Consulta o estado da encomenda no histórico de compras.");
        return;
      }

      if (result.whatsapp_url) {
        Alert.alert(
          "Delivery sob consulta",
          "Para entregas fora de Maputo, confirma o preço pelo WhatsApp.",
          [
            { text: "Mais tarde", style: "cancel" },
            { text: "Abrir WhatsApp", onPress: () => Linking.openURL(result.whatsapp_url) },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert("Não foi possível encomendar", error?.response?.data?.message || "Verifica os dados e tenta novamente.");
    } finally {
      setSubmitting(false);
    }
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

  if (!item) {
    return (
      <AppGradient>
        <View style={styles.center}>
          <Text style={styles.empty}>Artigo não encontrado.</Text>
        </View>
      </AppGradient>
    );
  }

  return (
    <AppGradient>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </Pressable>

        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholder]} />
        )}

        <Text style={styles.title}>{item.title}</Text>

        <Text style={styles.price}>
          {(item.currency || "MZN")} {Number(item.price).toFixed(2)}
        </Text>

        {!!item.category && (
          <Text style={styles.meta}>Categoria: {item.category}</Text>
        )}

        {typeof item.stock === "number" && (
          <Text style={styles.meta}>Stock: {item.stock}</Text>
        )}

        {!!item.description && (
          <Text style={styles.description}>{item.description}</Text>
        )}

        <View style={styles.orderCard}>
          <Text style={styles.orderTitle}>Dados da encomenda</Text>
          <Text style={styles.deliveryInfo}>Podes levantar gratuitamente na CSV. No centro da Cidade de Maputo, o delivery custa 100 MZN. Fora do centro, o preço é confirmado por WhatsApp.</Text>
          <View style={styles.zoneRow}>
            <Pressable style={[styles.zoneOption, deliveryZone === "pickup" && styles.zoneOptionActive]} onPress={() => setDeliveryZone("pickup")}>
              <Text style={[styles.zoneText, deliveryZone === "pickup" && styles.zoneTextActive]}>Levantar na CSV · Grátis</Text>
            </Pressable>
            <Pressable style={[styles.zoneOption, deliveryZone === "maputo_center" && styles.zoneOptionActive]} onPress={() => setDeliveryZone("maputo_center")}>
              <Text style={[styles.zoneText, deliveryZone === "maputo_center" && styles.zoneTextActive]}>Centro de Maputo · 100 MZN</Text>
            </Pressable>
            <Pressable style={[styles.zoneOption, deliveryZone === "outside_maputo_center" && styles.zoneOptionActive]} onPress={() => setDeliveryZone("outside_maputo_center")}>
              <Text style={[styles.zoneText, deliveryZone === "outside_maputo_center" && styles.zoneTextActive]}>Fora do centro · Consultar</Text>
            </Pressable>
          </View>
          <TextInput style={styles.input} placeholder="Quantidade" placeholderTextColor={colors.textMuted} keyboardType="number-pad" value={quantity} onChangeText={setQuantity} />
          <TextInput style={styles.input} placeholder="Nome completo" placeholderTextColor={colors.textMuted} value={customerName} onChangeText={setCustomerName} />
          <TextInput style={styles.input} placeholder="WhatsApp" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          {deliveryZone !== "pickup" ? (
            <>
              <TextInput style={styles.input} placeholder="Endereço" placeholderTextColor={colors.textMuted} value={address} onChangeText={setAddress} />
              <TextInput style={styles.input} placeholder="Bairro" placeholderTextColor={colors.textMuted} value={neighborhood} onChangeText={setNeighborhood} />
              <TextInput style={styles.input} placeholder="Cidade" placeholderTextColor={colors.textMuted} value={city} onChangeText={setCity} />
              <TextInput style={styles.input} placeholder="Província" placeholderTextColor={colors.textMuted} value={province} onChangeText={setProvince} />
            </>
          ) : null}
          <TextInput style={[styles.input, styles.notesInput]} placeholder={deliveryZone === "pickup" ? "Notas para o levantamento (opcional)" : "Referências ou notas de entrega"} placeholderTextColor={colors.textMuted} multiline value={deliveryNotes} onChangeText={setDeliveryNotes} />
          <Pressable style={[styles.button, submitting && styles.disabled]} onPress={submitOrder} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#111" /> : <Text style={styles.buttonText}>Encomendar</Text>}
          </Pressable>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </AppGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    padding: 16,
    paddingTop: 48,
    paddingBottom: 120,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
  image: {
    width: "100%",
    height: 420,
    borderRadius: 24,
    resizeMode: "cover",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  placeholder: {},
  title: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 18,
    marginBottom: 10,
  },
  price: {
    color: colors.yellow,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 12,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 6,
  },
  description: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 18,
  },
  button: {
    marginTop: 24,
    backgroundColor: colors.yellow,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "#111",
    fontWeight: "800",
    fontSize: 16,
  },
  empty: {
    color: colors.white,
  },
  disabled: { opacity: 0.7 },
  orderCard: { marginTop: 26, padding: 18, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  orderTitle: { color: colors.white, fontSize: 20, fontWeight: "800", marginBottom: 8 },
  deliveryInfo: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 14 },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", backgroundColor: "rgba(255,255,255,0.06)", color: colors.white, paddingHorizontal: 14, marginBottom: 10 },
  notesInput: { minHeight: 84, paddingTop: 12, textAlignVertical: "top" },
  zoneRow: { gap: 8, marginBottom: 12 },
  zoneOption: { borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", padding: 12 },
  zoneOptionActive: { borderColor: colors.yellow, backgroundColor: "rgba(255,214,0,0.12)" },
  zoneText: { color: colors.textMuted, fontSize: 13, fontWeight: "700" },
  zoneTextActive: { color: colors.yellow },
});
