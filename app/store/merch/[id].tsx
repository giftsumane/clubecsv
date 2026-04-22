import { getStoreMerch } from "@/services/store";
import AppGradient from "@/src/components/AppGradient";
import { colors } from "@/src/theme/colors";
import type { StoreMerch } from "@/src/types/store";
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

export default function MerchDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<StoreMerch | null>(null);
  const [loading, setLoading] = useState(true);

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

  const openLink = async () => {
    if (!item?.external_url) return;
    await Linking.openURL(item.external_url);
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

        {!!item.external_url && (
          <Pressable style={styles.button} onPress={openLink}>
            <Text style={styles.buttonText}>Ver detalhes</Text>
          </Pressable>
        )}

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
});