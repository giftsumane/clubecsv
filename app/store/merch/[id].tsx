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
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const DELIVERY_DESTINATIONS = [
  { province: "Cabo Delgado", city: "Pemba" },
  { province: "Gaza", city: "Xai-Xai" },
  { province: "Inhambane", city: "Inhambane" },
  { province: "Manica", city: "Chimoio" },
  { province: "Província de Maputo", city: "Matola" },
  { province: "Cidade de Maputo", city: "Maputo" },
  { province: "Nampula", city: "Nampula" },
  { province: "Niassa", city: "Lichinga" },
  { province: "Sofala", city: "Beira" },
  { province: "Tete", city: "Tete" },
  { province: "Zambézia", city: "Quelimane" },
] as const;

const MERCH_SIZES = ["S", "M", "L", "XL", "XXL"] as const;
type MerchSize = (typeof MERCH_SIZES)[number];

type PickerField = "province" | "city";

export default function MerchDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<StoreMerch | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [size, setSize] = useState<MerchSize | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("Maputo");
  const [province, setProvince] = useState("Cidade de Maputo");
  const [deliveryZone, setDeliveryZone] = useState<"pickup" | "maputo_center" | "outside_maputo_center">("pickup");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [pickerField, setPickerField] = useState<PickerField | null>(null);

  const availableDestinations = deliveryZone === "maputo_center"
    ? DELIVERY_DESTINATIONS.filter((destination) => destination.province === "Cidade de Maputo")
    : DELIVERY_DESTINATIONS.filter((destination) => destination.province !== "Cidade de Maputo");

  const chooseDeliveryZone = (zone: "pickup" | "maputo_center" | "outside_maputo_center") => {
    setDeliveryZone(zone);

    if (zone === "maputo_center") {
      setProvince("Cidade de Maputo");
      setCity("Maputo");
    } else if (zone === "outside_maputo_center" && province === "Cidade de Maputo") {
      setProvince("Província de Maputo");
      setCity("Matola");
    }
  };

  const selectDestination = (destination: (typeof DELIVERY_DESTINATIONS)[number]) => {
    setProvince(destination.province);
    setCity(destination.city);
    setPickerField(null);
  };

  useEffect(() => {
    const fetchMerch = async () => {
      try {
        if (!params.id) return;
        const data = await getStoreMerch(Number(params.id));
        setItem(data);
        const firstSize = data.available_sizes?.find((value): value is MerchSize =>
          MERCH_SIZES.includes(value as MerchSize)
        );
        setSize(firstSize || null);
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

    if (!size) {
      Alert.alert("Escolhe o tamanho", "Selecciona um tamanho disponível antes de encomendar.");
      return;
    }

    try {
      setSubmitting(true);
      const result = await createMerchOrder({
        merch_id: item.id,
        quantity: Math.max(1, Number(quantity) || 1),
        size,
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
        Alert.alert(
          "Pagamento iniciado",
          "A encomenda só será criada e aparecerá no histórico depois da confirmação do pagamento."
        );
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
      const status = error?.response?.status;
      const message = status && status < 500
        ? error?.response?.data?.message
        : null;

      Alert.alert("Não foi possível encomendar", message || "Verifica os dados e tenta novamente.");
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
            <Pressable style={[styles.zoneOption, deliveryZone === "pickup" && styles.zoneOptionActive]} onPress={() => chooseDeliveryZone("pickup")}>
              <Text style={[styles.zoneText, deliveryZone === "pickup" && styles.zoneTextActive]}>Levantar na CSV · Grátis</Text>
            </Pressable>
            <Pressable style={[styles.zoneOption, deliveryZone === "maputo_center" && styles.zoneOptionActive]} onPress={() => chooseDeliveryZone("maputo_center")}>
              <Text style={[styles.zoneText, deliveryZone === "maputo_center" && styles.zoneTextActive]}>Centro de Maputo · 100 MZN</Text>
            </Pressable>
            <Pressable style={[styles.zoneOption, deliveryZone === "outside_maputo_center" && styles.zoneOptionActive]} onPress={() => chooseDeliveryZone("outside_maputo_center")}>
              <Text style={[styles.zoneText, deliveryZone === "outside_maputo_center" && styles.zoneTextActive]}>Fora do centro · Consultar</Text>
            </Pressable>
          </View>
          <Text style={styles.fieldLabel}>Tamanho</Text>
          <View style={styles.sizeRow}>
            {MERCH_SIZES.map((option) => {
              const available = item.available_sizes?.includes(option) ?? false;
              const selected = size === option;

              return (
                <Pressable
                  key={option}
                  style={[styles.sizeOption, selected && styles.sizeOptionActive, !available && styles.sizeOptionDisabled]}
                  onPress={() => available && setSize(option)}
                  disabled={!available}
                >
                  <Text style={[styles.sizeText, selected && styles.sizeTextActive, !available && styles.sizeTextDisabled]}>{option}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput style={styles.input} placeholder="Quantidade" placeholderTextColor={colors.textMuted} keyboardType="number-pad" value={quantity} onChangeText={setQuantity} />
          <TextInput style={styles.input} placeholder="Nome completo" placeholderTextColor={colors.textMuted} value={customerName} onChangeText={setCustomerName} />
          <TextInput style={styles.input} placeholder="WhatsApp" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          {deliveryZone !== "pickup" ? (
            <>
              <TextInput style={styles.input} placeholder="Endereço" placeholderTextColor={colors.textMuted} value={address} onChangeText={setAddress} />
              <TextInput style={styles.input} placeholder="Bairro" placeholderTextColor={colors.textMuted} value={neighborhood} onChangeText={setNeighborhood} />
              <Pressable style={styles.selectInput} onPress={() => setPickerField("province")}>
                <Text style={styles.selectLabel}>Província</Text>
                <View style={styles.selectValueRow}>
                  <Text style={styles.selectValue}>{province}</Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                </View>
              </Pressable>
              <Pressable style={styles.selectInput} onPress={() => setPickerField("city")}>
                <Text style={styles.selectLabel}>Cidade</Text>
                <View style={styles.selectValueRow}>
                  <Text style={styles.selectValue}>{city}</Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                </View>
              </Pressable>
            </>
          ) : null}
          <TextInput style={[styles.input, styles.notesInput]} placeholder={deliveryZone === "pickup" ? "Notas para o levantamento (opcional)" : "Referências ou notas de entrega"} placeholderTextColor={colors.textMuted} multiline value={deliveryNotes} onChangeText={setDeliveryNotes} />
          <Pressable style={[styles.button, submitting && styles.disabled]} onPress={submitOrder} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#111" /> : <Text style={styles.buttonText}>Encomendar</Text>}
          </Pressable>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>

      <Modal visible={pickerField !== null} transparent animationType="fade" onRequestClose={() => setPickerField(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPickerField(null)}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>Selecionar {pickerField === "province" ? "província" : "cidade"}</Text>
            <ScrollView style={styles.modalList}>
              {availableDestinations.map((destination) => {
                const value = pickerField === "province" ? destination.province : destination.city;
                const selected = destination.province === province && destination.city === city;

                return (
                  <Pressable key={`${destination.province}-${destination.city}`} style={[styles.modalOption, selected && styles.modalOptionActive]} onPress={() => selectDestination(destination)}>
                    <Text style={[styles.modalOptionText, selected && styles.modalOptionTextActive]}>{value}</Text>
                    <Text style={styles.modalOptionHint}>{pickerField === "province" ? destination.city : destination.province}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
  selectInput: { minHeight: 58, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 14, paddingVertical: 9, marginBottom: 10 },
  selectLabel: { color: colors.textMuted, fontSize: 11, marginBottom: 4 },
  selectValueRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  selectValue: { color: colors.white, fontSize: 15, fontWeight: "700" },
  notesInput: { minHeight: 84, paddingTop: 12, textAlignVertical: "top" },
  zoneRow: { gap: 8, marginBottom: 12 },
  zoneOption: { borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", padding: 12 },
  zoneOptionActive: { borderColor: colors.yellow, backgroundColor: "rgba(255,214,0,0.12)" },
  zoneText: { color: colors.textMuted, fontSize: 13, fontWeight: "700" },
  zoneTextActive: { color: colors.yellow },
  fieldLabel: { color: colors.white, fontSize: 14, fontWeight: "800", marginBottom: 9 },
  sizeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  sizeOption: { minWidth: 48, height: 44, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  sizeOptionActive: { borderColor: colors.yellow, backgroundColor: "rgba(255,214,0,0.14)" },
  sizeOptionDisabled: { opacity: 0.3 },
  sizeText: { color: colors.white, fontSize: 14, fontWeight: "800" },
  sizeTextActive: { color: colors.yellow },
  sizeTextDisabled: { textDecorationLine: "line-through" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.68)" },
  modalCard: { maxHeight: "72%", borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: "#17122b", padding: 20, paddingBottom: 34 },
  modalTitle: { color: colors.white, fontSize: 19, fontWeight: "800", marginBottom: 14 },
  modalList: { flexGrow: 0 },
  modalOption: { paddingVertical: 13, paddingHorizontal: 14, borderRadius: 12, marginBottom: 7, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" },
  modalOptionActive: { borderColor: colors.yellow, backgroundColor: "rgba(255,214,0,0.10)" },
  modalOptionText: { color: colors.white, fontSize: 15, fontWeight: "700" },
  modalOptionTextActive: { color: colors.yellow },
  modalOptionHint: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
});
