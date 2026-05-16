import { api } from "@/src/api/client";
import * as Linking from "expo-linking";

export async function openRealCheckout(type: "album" | "event" | "merch", id: number) {
  const { data } = await api.post("/web-checkout-link", {
    type,
    id,
  });

  if (!data?.url) {
    throw new Error("Não foi possível obter o link de checkout.");
  }

  await Linking.openURL(data.url);
}