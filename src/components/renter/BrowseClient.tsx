"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MapView, { type MapVilla } from "./MapView";
import VillaPreviewCard, { type VillaPreview } from "./VillaPreviewCard";
import VillaCard from "./VillaCard";

const SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", AUD: "A$", SGD: "S$", DKK: "kr",
};

interface ApiVilla {
  id: string;
  title: string;
  area: string;
  bedrooms: number;
  bathrooms: number | null;
  max_guests: number;
  standby_rate_idr: number;
  bump_notice_hours: number;
  lat: number | null;
  lng: number | null;
  heroUrl: string | null;
}

export default function BrowseClient({
  mapboxToken,
  currency,
  fxRate,
}: {
  mapboxToken: string;
  currency: string;
  fxRate: number | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [villas, setVillas] = useState<ApiVilla[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters from URL
  const checkIn = searchParams.get("checkIn") ?? "";
  const checkOut = searchParams.get("checkOut") ?? "";
  const area = searchParams.get("area") ?? "";
  const bedrooms = searchParams.get("bedrooms") ?? "";

  const symbol = SYMBOLS[currency] ?? currency;

  const fetchVillas = useCallback(
    async (bounds: { west: number; south: number; east: number; north: number }) => {
      setLoading(true);
      const params = new URLSearchParams({
        west: String(bounds.west),
        south: String(bounds.south),
        east: String(bounds.east),
        north: String(bounds.north),
      });
      if (checkIn) params.set("checkIn", checkIn);
      if (checkOut) params.set("checkOut", checkOut);
      if (area && area !== "all") params.set("area", area);
      if (bedrooms && bedrooms !== "any") params.set("minBedrooms", bedrooms);

      try {
        const res = await fetch(`/api/villas/viewport?${params}`);
        if (res.ok) {
          const data = await res.json();
          setVillas(data);
        }
      } finally {
        setLoading(false);
      }
    },
    [checkIn, checkOut, area, bedrooms]
  );

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/browse?${params.toString()}`);
  }

  function getMapVillas(): MapVilla[] {
    return villas
      .filter((v) => v.lat != null && v.lng != null)
      .map((v) => {
        const converted = fxRate ? Math.round(v.standby_rate_idr * fxRate) : null;
        const priceLabel = converted !== null
          ? `≈${symbol}${converted}`
          : `Rp${Math.round(v.standby_rate_idr / 1000)}k`;

        return { id: v.id, title: v.title, lat: v.lat!, lng: v.lng!, priceLabel };
      });
  }

  const selectedVilla = villas.find((v) => v.id === selectedId);

  return (
    <div className="h-[calc(100vh-5rem)] md:h-screen md:flex">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-[40%] flex-col border-r border-warm-gray-light bg-cream overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-warm-gray-light space-y-3">
          <div className="flex gap-2">
            <input
              type="date"
              value={checkIn}
              onChange={(e) => updateFilter("checkIn", e.target.value)}
              className="flex-1 rounded-lg border border-warm-gray-light px-3 py-2 text-sm"
              placeholder="Check-in"
            />
            <input
              type="date"
              value={checkOut}
              onChange={(e) => updateFilter("checkOut", e.target.value)}
              className="flex-1 rounded-lg border border-warm-gray-light px-3 py-2 text-sm"
              placeholder="Check-out"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={area}
              onChange={(e) => updateFilter("area", e.target.value)}
              className="flex-1 rounded-lg border border-warm-gray-light px-3 py-2 text-sm"
            >
              <option value="">All areas</option>
              <option value="canggu">Canggu</option>
              <option value="seminyak">Seminyak</option>
              <option value="ubud">Ubud</option>
              <option value="uluwatu">Uluwatu</option>
              <option value="jimbaran">Jimbaran</option>
              <option value="sanur">Sanur</option>
            </select>
            <select
              value={bedrooms}
              onChange={(e) => updateFilter("bedrooms", e.target.value)}
              className="flex-1 rounded-lg border border-warm-gray-light px-3 py-2 text-sm"
            >
              <option value="">Bedrooms</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
            </select>
          </div>
        </div>

        {/* Villa list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && villas.length === 0 && (
            <p className="text-center text-warm-gray text-sm py-8">Loading villas...</p>
          )}
          {!loading && villas.length === 0 && (
            <div className="text-center py-12">
              <p className="text-warm-gray-dark mb-2">No villas found in this area</p>
              <p className="text-xs text-warm-gray">Try zooming out or adjusting your filters</p>
            </div>
          )}
          {villas.map((v) => (
            <VillaCard
              key={v.id}
              id={v.id}
              title={v.title}
              area={v.area}
              rateIdr={v.standby_rate_idr}
              bedrooms={v.bedrooms}
              bathrooms={v.bathrooms}
              maxGuests={v.max_guests}
              bumpNoticeHours={v.bump_notice_hours}
              heroUrl={v.heroUrl}
              fxRate={fxRate}
              currency={currency}
            />
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="relative flex-1 h-full">
        {/* Mobile filters */}
        <div className="md:hidden absolute top-0 left-0 right-0 z-10 bg-cream/90 backdrop-blur-sm border-b border-warm-gray-light px-3 py-2">
          <div className="flex gap-2 overflow-x-auto">
            <input
              type="date"
              value={checkIn}
              onChange={(e) => updateFilter("checkIn", e.target.value)}
              className="shrink-0 rounded-lg border border-warm-gray-light bg-white px-2 py-1.5 text-xs w-28"
            />
            <input
              type="date"
              value={checkOut}
              onChange={(e) => updateFilter("checkOut", e.target.value)}
              className="shrink-0 rounded-lg border border-warm-gray-light bg-white px-2 py-1.5 text-xs w-28"
            />
            <select
              value={area}
              onChange={(e) => updateFilter("area", e.target.value)}
              className="shrink-0 rounded-lg border border-warm-gray-light bg-white px-2 py-1.5 text-xs"
            >
              <option value="">Area</option>
              <option value="canggu">Canggu</option>
              <option value="seminyak">Seminyak</option>
              <option value="ubud">Ubud</option>
              <option value="uluwatu">Uluwatu</option>
            </select>
            <select
              value={bedrooms}
              onChange={(e) => updateFilter("bedrooms", e.target.value)}
              className="shrink-0 rounded-lg border border-warm-gray-light bg-white px-2 py-1.5 text-xs"
            >
              <option value="">Beds</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
            </select>
          </div>
        </div>

        <MapView
          token={mapboxToken}
          villas={getMapVillas()}
          selectedId={selectedId}
          onViewportChange={fetchVillas}
          onSelectVilla={setSelectedId}
        />

        {/* Mobile preview card */}
        {selectedVilla && (
          <div className="md:hidden absolute bottom-4 left-4 right-4 z-10">
            <VillaPreviewCard
              villa={{
                id: selectedVilla.id,
                title: selectedVilla.title,
                area: selectedVilla.area,
                rateIdr: selectedVilla.standby_rate_idr,
                bedrooms: selectedVilla.bedrooms,
                bumpNoticeHours: selectedVilla.bump_notice_hours,
                heroUrl: selectedVilla.heroUrl,
              }}
              fxRate={fxRate}
              currency={currency}
              onClick={() => router.push(`/villa/${selectedVilla.id}`)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
