import { api } from "@/src/api/client";
import type { StoreEvent, StoreHomeResponse, StoreMerch } from "@/src/types/store";

export async function getStoreHome(): Promise<StoreHomeResponse> {
  const { data } = await api.get("/store");
  return {
    events: data?.events || [],
    merch: data?.merch || [],
  };
}

export async function getStoreEvent(id: number): Promise<StoreEvent> {
  const { data } = await api.get(`/store/events/${id}`);
  return data.event;
}

export async function getStoreMerch(id: number): Promise<StoreMerch> {
  const { data } = await api.get(`/store/merch/${id}`);
  return data.merch;
}