export type User = {
  id: number;
  name: string;
  email: string;
};

export type Artist = {
  id: number;
  name: string;
  photo_url?: string | null;
};

export type Music = {
  id: number;
  album_id?: number | null;
  artist_id: number;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  media_url?: string | null;
  hls_master_url?: string | null;
  preview_url?: string | null;
  duration?: number | null;
  price?: number;
  type?: "audio" | "video";
  artist?: Artist | null;
};

export type AlbumContent = {
  id: number;
  album_id?: number | null;
  artist_id?: number | null;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  media_url?: string | null;
  hls_master_url?: string | null;
  preview_url?: string | null;
  duration?: number | null;
  price?: number;
  type?: "audio" | "video";
  artist?: Artist | null;
};

export type Album = {
  id: number;
  artist_id: number;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  price: number;
  artist?: Artist | null;
  tracks?: Music[];
  contents?: AlbumContent[];
};

export type Purchase = {
  id: number;
  reference: string;
  amount: number;
  status: "pending" | "paid" | "failed" | "canceled";
  created_at?: string;
};