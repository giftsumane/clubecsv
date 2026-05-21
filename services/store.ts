import { api } from "@/src/api/client";
import type {
  StoreAlbum,
  StoreEvent,
  StoreHomeResponse,
  StoreMerch,
} from "@/src/types/store";

export async function getStoreHome(): Promise<StoreHomeResponse> {
  const { data } = await api.get("/store");

  return {
    events: Array.isArray(data?.events) ? data.events : [],
    albums: Array.isArray(data?.albums) ? data.albums : [],
    merch: Array.isArray(data?.merch) ? data.merch : [],
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

export async function getStoreAlbum(id: number): Promise<StoreAlbum> {
  const { data } = await api.get(`/store/albums/${id}`);
  return data.album;
}