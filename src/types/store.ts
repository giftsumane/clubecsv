export type StoreEvent = {
    id: number;
    title: string;
    description?: string | null;
    date?: string | null;
    time?: string | null;
    location?: string | null;
    city?: string | null;
    image_url?: string | null;
    external_url?: string | null;
    type: "event";
  };
  
  export type StoreMerch = {
    id: number;
    title: string;
    description?: string | null;
    price: number;
    currency?: string | null;
    image_url?: string | null;
    category?: string | null;
    stock?: number | null;
    external_url?: string | null;
    is_featured?: boolean;
    type: "merch";
  };
  
  export type StoreHomeResponse = {
    events: StoreEvent[];
    merch: StoreMerch[];
  };