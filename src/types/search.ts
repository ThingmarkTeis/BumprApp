export interface VillaSearchResult {
  id: string;
  title: string;
  slug: string;
  standby_rate: number;
  currency: "IDR";
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  location: {
    lat: number;
    lng: number;
    area: string;
  };
  images: {
    url: string;
    alt: string;
  }[];
  amenities: string[];
  rating: number | null;
  review_count: number;
  is_available: boolean;
  is_saved: boolean;
  distance_km: number | null;
  owner: {
    id: string;
    display_name: string;
    is_verified: boolean;
  };
}

export interface SearchResponse {
  villas: VillaSearchResult[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface SearchErrorResponse {
  error: string;
  details?: Record<string, string[]>;
}
