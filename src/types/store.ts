export type StoreEvent = {
  id: number;
  title: string;
  description?: string | null;
  image_url?: string | null;
  ticket_type?: string | null;
  price_normal?: number | null;
  price_vip?: number | null;
  external_url?: string | null;
  created_at?: string | null;
  type?: "event";
};

export type StoreAlbum = {
  id: number;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  image_url?: string | null;
  artist_name?: string | null;
  price?: number | null;
  external_url?: string | null;
  release_date?: string | null;
  created_at?: string | null;
  type?: "album";
};

export type StoreMerch = {
  id: number;
  title: string;
  description?: string | null;
  image_url?: string | null;
  category?: string | null;
  stock?: number | null;
  price: number;
  currency?: string | null;
  external_url?: string | null;
  created_at?: string | null;
  type?: "merch";
};

export type StoreHomeResponse = {
  events: StoreEvent[];
  albums: StoreAlbum[];
  merch: StoreMerch[];
};