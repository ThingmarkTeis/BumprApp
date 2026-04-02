"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatIdr } from "@/lib/utils/currency";
import { AMENITIES, AMENITY_KEYS } from "@/lib/amenities";

interface Owner {
  id: string;
  name: string;
  email: string;
}

interface VillaData {
  id?: string;
  title?: string;
  description?: string;
  area?: string;
  address?: string;
  bedrooms?: number;
  bathrooms?: number;
  max_guests?: number;
  standby_rate_idr?: number;
  bump_notice_hours?: number;
  earliest_check_in?: string;
  check_in_by?: string;
  check_out_time?: string;
  house_rules?: string;
  owner_id?: string;
  ical_url?: string;
  lng?: number;
  lat?: number;
  status?: string;
  amenities?: string[];
}

interface Photo {
  id: string;
  url: string;
  sort_order: number;
}

const AREAS = [
  "canggu", "seminyak", "ubud", "uluwatu", "jimbaran", "sanur", "nusa_dua", "other",
];

export default function VillaForm({
  owners,
  initial,
  photos: existingPhotos,
}: {
  owners: Owner[];
  initial?: VillaData;
  photos?: Photo[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewOwner, setShowNewOwner] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>(existingPhotos ?? []);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  const [form, setForm] = useState<VillaData>({
    title: "",
    description: "",
    area: "canggu",
    address: "",
    bedrooms: 1,
    bathrooms: 1,
    max_guests: 2,
    standby_rate_idr: 500000,
    bump_notice_hours: 18,
    earliest_check_in: "14:00",
    check_in_by: "20:00",
    check_out_time: "11:00",
    house_rules: "",
    owner_id: owners[0]?.id ?? "",
    ical_url: "",
    lng: 115.17,
    lat: -8.65,
    amenities: [],
    ...initial,
  });

  function update(key: string, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(status: string) {
    setSaving(true);
    setError(null);

    try {
      const isEdit = !!initial?.id;
      const url = isEdit
        ? `/api/admin/villas/${initial.id}`
        : "/api/admin/villas";

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save villa.");
      }

      const villa = await res.json();
      const villaId = villa.id ?? initial?.id;

      // Upload new photos
      if (newFiles.length > 0 && villaId) {
        const fd = new FormData();
        newFiles.forEach((f) => fd.append("photos", f));
        await fetch(`/api/admin/villas/${villaId}/photos`, {
          method: "POST",
          body: fd,
        });
      }

      router.push("/admin/villas");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePhoto(photoId: string) {
    if (!initial?.id) return;
    await fetch(`/api/admin/villas/${initial.id}/photos/${photoId}`, {
      method: "DELETE",
    });
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }

  async function handleSync() {
    if (!initial?.id) return;
    const res = await fetch(`/api/admin/villas/${initial.id}/sync`, {
      method: "POST",
    });
    const data = await res.json();
    alert(res.ok ? `Synced ${data.events} events.` : `Error: ${data.error}`);
  }

  async function handleCreateOwner(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/owners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd)),
    });
    if (res.ok) {
      const data = await res.json();
      update("owner_id", data.id);
      setShowNewOwner(false);
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error ?? "Failed to create owner.");
    }
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <section>
        <h2 className="font-serif text-lg font-semibold text-volcanic mb-4">Basic Info</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-volcanic mb-1">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              required
              className="w-full rounded-lg border border-volcanic/20 px-4 py-2.5 text-volcanic"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-volcanic mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-volcanic/20 px-4 py-2.5 text-volcanic"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-volcanic mb-1">Area *</label>
              <select
                value={form.area}
                onChange={(e) => update("area", e.target.value)}
                className="w-full rounded-lg border border-volcanic/20 px-4 py-2.5 text-volcanic"
              >
                {AREAS.map((a) => (
                  <option key={a} value={a} className="capitalize">{a.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-volcanic mb-1">Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                className="w-full rounded-lg border border-volcanic/20 px-4 py-2.5 text-volcanic"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-volcanic mb-1">Bedrooms *</label>
              <input type="number" min={1} value={form.bedrooms} onChange={(e) => update("bedrooms", parseInt(e.target.value))} className="w-full rounded-lg border border-volcanic/20 px-4 py-2.5 text-volcanic" />
            </div>
            <div>
              <label className="block text-sm font-medium text-volcanic mb-1">Bathrooms</label>
              <input type="number" min={0} value={form.bathrooms} onChange={(e) => update("bathrooms", parseInt(e.target.value))} className="w-full rounded-lg border border-volcanic/20 px-4 py-2.5 text-volcanic" />
            </div>
            <div>
              <label className="block text-sm font-medium text-volcanic mb-1">Max Guests *</label>
              <input type="number" min={1} value={form.max_guests} onChange={(e) => update("max_guests", parseInt(e.target.value))} className="w-full rounded-lg border border-volcanic/20 px-4 py-2.5 text-volcanic" />
            </div>
          </div>
        </div>
      </section>

      {/* Amenities */}
      <section>
        <h2 className="font-serif text-lg font-semibold text-volcanic mb-4">Amenities</h2>
        <div className="flex flex-wrap gap-2">
          {AMENITY_KEYS.map((key) => {
            const a = AMENITIES[key];
            const selected = form.amenities?.includes(key) ?? false;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  const current = form.amenities ?? [];
                  update(
                    "amenities",
                    selected
                      ? current.filter((v) => v !== key)
                      : [...current, key]
                  );
                }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium border transition-colors ${
                  selected
                    ? "bg-teal text-cream border-teal"
                    : "bg-white text-volcanic/70 border-volcanic/20 hover:border-teal/40"
                }`}
              >
                {a.icon}
                {a.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Pricing & Bump Rules */}
      <section>
        <h2 className="font-serif text-lg font-semibold text-volcanic mb-4">Pricing & Bump Rules</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-volcanic mb-1">Standby Rate (IDR/night) *</label>
            <input type="number" min={0} value={form.standby_rate_idr} onChange={(e) => update("standby_rate_idr", parseInt(e.target.value))} className="w-full rounded-lg border border-volcanic/20 px-4 py-2.5 text-volcanic font-mono" />
            <p className="mt-1 text-xs text-volcanic/50">{formatIdr(form.standby_rate_idr ?? 0)} / night</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-volcanic mb-1">Bump Notice (hrs) *</label>
              <input type="number" min={18} value={form.bump_notice_hours} onChange={(e) => update("bump_notice_hours", parseInt(e.target.value))} className="w-full rounded-lg border border-volcanic/20 px-4 py-2.5 text-volcanic" />
            </div>
            <div>
              <label className="block text-sm font-medium text-volcanic mb-1">Earliest Check-in</label>
              <input type="time" value={form.earliest_check_in} onChange={(e) => update("earliest_check_in", e.target.value)} className="w-full rounded-lg border border-volcanic/20 px-4 py-2.5 text-volcanic" />
            </div>
            <div>
              <label className="block text-sm font-medium text-volcanic mb-1">Latest Check-in</label>
              <input type="time" value={form.check_in_by} onChange={(e) => update("check_in_by", e.target.value)} className="w-full rounded-lg border border-volcanic/20 px-4 py-2.5 text-volcanic" />
            </div>
            <div>
              <label className="block text-sm font-medium text-volcanic mb-1">Check-out Time</label>
              <input type="time" value={form.check_out_time} onChange={(e) => update("check_out_time", e.target.value)} className="w-full rounded-lg border border-volcanic/20 px-4 py-2.5 text-volcanic" />
            </div>
          </div>
        </div>
      </section>

      {/* House Rules */}
      <section>
        <h2 className="font-serif text-lg font-semibold text-volcanic mb-4">House Rules</h2>
        <textarea
          value={form.house_rules}
          onChange={(e) => update("house_rules", e.target.value)}
          rows={4}
          placeholder="Enter house rules for guests..."
          className="w-full rounded-lg border border-volcanic/20 px-4 py-2.5 text-volcanic placeholder:text-volcanic/40 resize-none"
        />
      </section>

      {/* Owner */}
      <section>
        <h2 className="font-serif text-lg font-semibold text-volcanic mb-4">Owner</h2>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-volcanic mb-1">Select Owner *</label>
            <select
              value={form.owner_id}
              onChange={(e) => update("owner_id", e.target.value)}
              className="w-full rounded-lg border border-volcanic/20 px-4 py-2.5 text-volcanic"
            >
              <option value="">Select an owner...</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>{o.name} ({o.email})</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setShowNewOwner(!showNewOwner)}
            className="rounded-lg border border-teal px-3 py-2.5 text-sm text-teal hover:bg-teal/5"
          >
            {showNewOwner ? "Cancel" : "+ New Owner"}
          </button>
        </div>
        {showNewOwner && (
          <form onSubmit={handleCreateOwner} className="mt-4 rounded-lg border border-volcanic/10 bg-cream/50 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input name="full_name" placeholder="Full name *" required className="rounded-lg border border-volcanic/20 px-3 py-2 text-sm" />
              <input name="email" type="email" placeholder="Email *" required className="rounded-lg border border-volcanic/20 px-3 py-2 text-sm" />
              <input name="phone" placeholder="Phone (WhatsApp)" className="rounded-lg border border-volcanic/20 px-3 py-2 text-sm" />
              <input name="bank_name" placeholder="Bank code (BCA, MANDIRI...)" className="rounded-lg border border-volcanic/20 px-3 py-2 text-sm" />
              <input name="bank_account_number" placeholder="Account number" className="rounded-lg border border-volcanic/20 px-3 py-2 text-sm" />
              <input name="bank_account_holder" placeholder="Account holder name" className="rounded-lg border border-volcanic/20 px-3 py-2 text-sm" />
            </div>
            <button type="submit" className="rounded-lg bg-teal px-4 py-2 text-sm text-cream font-medium">
              Create Owner
            </button>
          </form>
        )}
      </section>

      {/* Location */}
      <section>
        <h2 className="font-serif text-lg font-semibold text-volcanic mb-4">Location</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-volcanic mb-1">Longitude (e.g. 115.26)</label>
            <input type="number" step="any" value={form.lng} onChange={(e) => update("lng", parseFloat(e.target.value))} placeholder="115.26" className="w-full rounded-lg border border-volcanic/20 px-4 py-2.5 text-volcanic font-mono text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-volcanic mb-1">Latitude (e.g. -8.51)</label>
            <input type="number" step="any" value={form.lat} onChange={(e) => update("lat", parseFloat(e.target.value))} placeholder="-8.51" className="w-full rounded-lg border border-volcanic/20 px-4 py-2.5 text-volcanic font-mono text-sm" />
          </div>
        </div>
        <p className="mt-2 text-xs text-volcanic/50">
          Bali coordinates: Longitude ~115 (east-west), Latitude ~-8.5 (north-south, negative = south of equator)
        </p>
      </section>

      {/* Photos */}
      <section>
        <h2 className="font-serif text-lg font-semibold text-volcanic mb-4">Photos</h2>
        {photos.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-4">
            {photos.map((p, i) => (
              <div key={p.id} className="relative rounded-lg overflow-hidden border border-volcanic/10">
                <img src={p.url} alt="" className="w-full h-24 object-cover" />
                <div className="absolute top-1 left-1 bg-volcanic/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                  {i === 0 ? "Hero" : `#${i + 1}`}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeletePhoto(p.id)}
                  className="absolute top-1 right-1 bg-red-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => setNewFiles(Array.from(e.target.files ?? []))}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border-2 border-dashed border-volcanic/20 px-6 py-4 text-sm text-volcanic/50 hover:border-teal/30 hover:text-teal"
          >
            {newFiles.length > 0
              ? `${newFiles.length} file(s) selected`
              : "Click to upload photos"}
          </button>
        </div>
      </section>

      {/* iCal */}
      <section>
        <h2 className="font-serif text-lg font-semibold text-volcanic mb-4">iCal Sync</h2>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-volcanic mb-1">iCal URL</label>
            <input
              type="url"
              value={form.ical_url}
              onChange={(e) => update("ical_url", e.target.value)}
              placeholder="https://www.airbnb.com/calendar/ical/..."
              className="w-full rounded-lg border border-volcanic/20 px-4 py-2.5 text-volcanic text-sm"
            />
          </div>
          {initial?.id && (
            <button
              type="button"
              onClick={handleSync}
              className="rounded-lg border border-teal px-3 py-2.5 text-sm text-teal hover:bg-teal/5"
            >
              Sync Now
            </button>
          )}
        </div>
      </section>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-volcanic/10">
        <button
          onClick={() => handleSubmit("draft")}
          disabled={saving}
          className="rounded-lg border border-volcanic/20 px-6 py-2.5 text-sm font-medium text-volcanic hover:bg-volcanic/5 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save as Draft"}
        </button>
        <button
          onClick={() => handleSubmit("active")}
          disabled={saving}
          className="rounded-lg bg-teal px-6 py-2.5 text-sm font-medium text-cream hover:bg-teal-dark disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save & Activate"}
        </button>
      </div>
    </div>
  );
}
