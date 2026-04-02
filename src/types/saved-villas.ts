export interface SavedVillaItem {
  id: string;
  villa_id: string;
  villa: {
    id: string;
    title: string;
    slug: string;
    standby_rate: number;
    bedrooms: number;
    max_guests: number;
    location: {
      lat: number | null;
      lng: number | null;
      area: string;
    };
    images: { url: string; alt: string }[];
    rating: number | null;
    review_count: number;
    is_available: boolean;
  };
  saved_at: string;
}

export interface SavedVillasResponse {
  villas: SavedVillaItem[];
  total: number;
}
