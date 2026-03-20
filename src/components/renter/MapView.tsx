"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export interface MapVilla {
  id: string;
  title: string;
  lat: number;
  lng: number;
  priceLabel: string;
}

interface MapViewProps {
  token: string;
  villas: MapVilla[];
  selectedId: string | null;
  onViewportChange: (bounds: { west: number; south: number; east: number; north: number }) => void;
  onSelectVilla: (id: string | null) => void;
}

export default function MapView({
  token,
  villas,
  selectedId,
  onViewportChange,
  onSelectVilla,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [ready, setReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [115.1889, -8.4095],
      zoom: 11,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("load", () => {
      setReady(true);
      const bounds = map.getBounds();
      if (bounds) {
        onViewportChange({
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
          onViewportChange({
            west: bounds.getWest(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            north: bounds.getNorth(),
          });
        }
      }, 300);
    });

    map.on("click", () => {
      onSelectVilla(null);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
        onSelectVilla(villa.id);
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
  }, [villas, selectedId, ready, onSelectVilla]);

  return (
    <div ref={containerRef} className="w-full h-full" />
  );
}
