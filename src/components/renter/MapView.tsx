"use client";

import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export interface MapVilla {
  id: string;
  title: string;
  lat: number;
  lng: number;
  priceLabel: string;
}

const AREA_CENTERS: Record<string, { lng: number; lat: number; zoom: number }> = {
  canggu:   { lng: 115.1320, lat: -8.6450, zoom: 13 },
  ubud:     { lng: 115.2650, lat: -8.5060, zoom: 12.5 },
  uluwatu:  { lng: 115.0930, lat: -8.8120, zoom: 13 },
  seminyak: { lng: 115.1600, lat: -8.6900, zoom: 13.5 },
  jimbaran: { lng: 115.1650, lat: -8.7700, zoom: 13 },
  sanur:    { lng: 115.2600, lat: -8.6900, zoom: 13 },
};

// Default: center of southern Bali showing all main areas
const DEFAULT_CENTER: [number, number] = [115.17, -8.65];
const DEFAULT_ZOOM = 10;

interface MapViewProps {
  token: string;
  villas: MapVilla[];
  selectedId: string | null;
  area: string;
  onViewportChange: (bounds: { west: number; south: number; east: number; north: number }) => void;
  onSelectVilla: (id: string | null) => void;
}

export default function MapView({
  token,
  villas,
  selectedId,
  area,
  onViewportChange,
  onSelectVilla,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const prevAreaRef = useRef(area);
  const [ready, setReady] = useState(false);

  // Keep callbacks in refs so map event handlers always use the latest version
  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;
  const onSelectVillaRef = useRef(onSelectVilla);
  onSelectVillaRef.current = onSelectVilla;

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = token;

    // If an area is already selected (e.g. from URL), start there
    const initial = AREA_CENTERS[area.toLowerCase()];

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: initial ? [initial.lng, initial.lat] : DEFAULT_CENTER,
      zoom: initial ? initial.zoom : DEFAULT_ZOOM,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("load", () => {
      setReady(true);
      const bounds = map.getBounds();
      if (bounds) {
        onViewportChangeRef.current({
          west: bounds.getWest(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          north: bounds.getNorth(),
        });
      }
    });

    map.on("moveend", () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const bounds = map.getBounds();
        if (bounds) {
          onViewportChangeRef.current({
            west: bounds.getWest(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            north: bounds.getNorth(),
          });
        }
      }, 300);
    });

    map.on("click", () => {
      onSelectVillaRef.current(null);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Fly to area when area filter changes
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    if (area === prevAreaRef.current) return;
    prevAreaRef.current = area;

    const target = AREA_CENTERS[area.toLowerCase()];
    if (target) {
      mapRef.current.flyTo({ center: [target.lng, target.lat], zoom: target.zoom, speed: 1.5 });
    } else {
      // "All areas" — zoom out
      mapRef.current.flyTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM, speed: 1.5 });
    }
  }, [area, ready]);

  // Update markers
  useEffect(() => {
    if (!mapRef.current || !ready) return;

    const currentIds = new Set(villas.map((v) => v.id));
    const existing = markersRef.current;

    // Remove old markers
    for (const [id, marker] of existing) {
      if (!currentIds.has(id)) {
        marker.remove();
        existing.delete(id);
      }
    }

    // Add/update markers
    for (const villa of villas) {
      if (existing.has(villa.id)) continue;

      const el = document.createElement("div");
      el.className = "bumpr-marker";
      el.style.cssText = `
        background: #FFA314;
        color: #FFFFFF;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        font-weight: 600;
        padding: 4px 8px;
        border-radius: 8px;
        cursor: pointer;
        white-space: nowrap;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      `;
      el.textContent = villa.priceLabel;

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectVillaRef.current(villa.id);
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([villa.lng, villa.lat])
        .addTo(mapRef.current!);

      existing.set(villa.id, marker);
    }

    // Highlight selected
    for (const [id, marker] of existing) {
      const el = marker.getElement();
      if (id === selectedId) {
        el.style.background = "#E68A00";
        el.style.transform = "scale(1.15)";
        el.style.zIndex = "10";
      } else {
        el.style.background = "#FFA314";
        el.style.transform = "scale(1)";
        el.style.zIndex = "1";
      }
    }
  }, [villas, selectedId, ready]);

  return (
    <div ref={containerRef} className="w-full h-full" />
  );
}
