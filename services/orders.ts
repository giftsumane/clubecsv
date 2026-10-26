import { api } from "@/src/api/client";

export type MerchOrderInput = {
  merch_id: number;
  quantity: number;
  customer_name: string;
  phone: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  province?: string;
  delivery_zone: "pickup" | "maputo_center" | "outside_maputo_center";
  delivery_notes?: string;
};

export async function createMerchOrder(input: MerchOrderInput) {
  const { data } = await api.post("/orders", input);
  return data;
}

export async function getMyOrders() {
  const { data } = await api.get("/orders");
  return Array.isArray(data?.orders) ? data.orders : [];
}
