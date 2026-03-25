import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const VILLAS = [
  // ── Ubud (5) ──────────────────────────────────────────
  {
    title: "Villa Sawah Ubud",
    description:
      "Stunning rice-field retreat with infinity pool overlooking the Tegallalang terraces. Open-air living, teak interiors, and a private yoga shala.",
    area: "Ubud",
    address: "Jl. Raya Tegallalang, Ubud",
    bedrooms: 3,
    bathrooms: 3,
    max_guests: 6,
    standby_rate_idr: 2_800_000,
    bump_notice_hours: 18,
    check_in_by: "18:00",
    earliest_check_in: "14:00",
    amenities: ["wifi", "pool", "ac", "kitchen", "yoga_shala", "parking"],
    status: "active",
    lat: -8.4195,
    lng: 115.2792,
  },
  {
    title: "Jungle Hideaway Ubud",
    description:
      "A two-bedroom bamboo villa nestled in the Campuhan ridge jungle. Wake to birdsong and a plunge pool surrounded by tropical greenery.",
    area: "Ubud",
    address: "Jl. Raya Campuhan, Ubud",
    bedrooms: 2,
    bathrooms: 2,
    max_guests: 4,
    standby_rate_idr: 1_900_000,
    bump_notice_hours: 18,
    check_in_by: "20:00",
    earliest_check_in: "15:00",
    amenities: ["wifi", "pool", "ac", "kitchen", "parking"],
    status: "active",
    lat: -8.5028,
    lng: 115.2476,
  },
  {
    title: "Uma Sari Retreat",
    description:
      "Traditional Balinese compound with four poster beds, an outdoor stone bath, and lush garden courtyard. Minutes from Ubud Palace.",
    area: "Ubud",
    address: "Jl. Suweta, Ubud",
    bedrooms: 4,
    bathrooms: 4,
    max_guests: 8,
    standby_rate_idr: 4_200_000,
    bump_notice_hours: 18,
    check_in_by: "17:00",
    earliest_check_in: "14:00",
    amenities: ["wifi", "pool", "ac", "kitchen", "parking", "garden", "staff"],
    status: "active",
    lat: -8.5042,
    lng: 115.2615,
  },
  {
    title: "Padi Terrace Loft",
    description:
      "Modern loft-style villa perched above terraced rice paddies. Floor-to-ceiling glass, rooftop jacuzzi, and complimentary mountain bikes.",
    area: "Ubud",
    address: "Jl. Subak Sok Wayah, Ubud",
    bedrooms: 1,
    bathrooms: 1,
    max_guests: 2,
    standby_rate_idr: 1_400_000,
    bump_notice_hours: 18,
    check_in_by: "21:00",
    earliest_check_in: "14:00",
    amenities: ["wifi", "pool", "ac", "kitchen", "bicycles"],
    status: "active",
    lat: -8.5133,
    lng: 115.2718,
  },
  {
    title: "Tirta Naga Estate",
    description:
      "Luxury five-bedroom estate with private chef, spa room, and a 20-metre lap pool. Set within a gated Balinese garden on the Petanu river.",
    area: "Ubud",
    address: "Jl. Raya Goa Gajah, Ubud",
    bedrooms: 5,
    bathrooms: 5,
    max_guests: 10,
    standby_rate_idr: 6_500_000,
    bump_notice_hours: 18,
    check_in_by: "16:00",
    earliest_check_in: "14:00",
    amenities: ["wifi", "pool", "ac", "kitchen", "parking", "spa", "staff", "gym"],
    status: "active",
    lat: -8.5225,
    lng: 115.2872,
  },

  // ── Canggu (5) ─────────────────────────────────────────
  {
    title: "Echo Beach Surf House",
    description:
      "Laid-back surf villa steps from Echo Beach. Board racks, outdoor shower, rooftop sunset bar, and a plunge pool for post-surf cool-downs.",
    area: "Canggu",
    address: "Jl. Batu Mejan, Canggu",
    bedrooms: 3,
    bathrooms: 2,
    max_guests: 6,
    standby_rate_idr: 2_500_000,
    bump_notice_hours: 18,
    check_in_by: "19:00",
    earliest_check_in: "15:00",
    amenities: ["wifi", "pool", "ac", "kitchen", "parking", "surfboard_storage"],
    status: "active",
    lat: -8.6538,
    lng: 115.1285,
  },
  {
    title: "Berawa Luxe Pavilion",
    description:
      "Minimalist three-bedroom pavilion on Berawa's café strip. Polished concrete, private pool, and a gourmet kitchen for entertaining.",
    area: "Canggu",
    address: "Jl. Pantai Berawa, Canggu",
    bedrooms: 3,
    bathrooms: 3,
    max_guests: 6,
    standby_rate_idr: 3_200_000,
    bump_notice_hours: 18,
    check_in_by: "18:00",
    earliest_check_in: "14:00",
    amenities: ["wifi", "pool", "ac", "kitchen", "parking", "smart_tv"],
    status: "active",
    lat: -8.6612,
    lng: 115.1412,
  },
  {
    title: "Villa Nusa Canggu",
    description:
      "Family-friendly four-bedroom villa with a kids' pool, trampoline garden, and open-plan living. Quiet lane off Jl. Pantai Pererenan.",
    area: "Canggu",
    address: "Jl. Pantai Pererenan, Canggu",
    bedrooms: 4,
    bathrooms: 3,
    max_guests: 8,
    standby_rate_idr: 3_800_000,
    bump_notice_hours: 18,
    check_in_by: "17:00",
    earliest_check_in: "14:00",
    amenities: ["wifi", "pool", "ac", "kitchen", "parking", "kids_pool", "garden"],
    status: "active",
    lat: -8.6445,
    lng: 115.1168,
  },
  {
    title: "Batu Bolong Studio",
    description:
      "Compact designer studio for solo travellers or couples. Walk to Batu Bolong beach, co-working cafés, and Canggu's best restaurants.",
    area: "Canggu",
    address: "Jl. Batu Bolong, Canggu",
    bedrooms: 1,
    bathrooms: 1,
    max_guests: 2,
    standby_rate_idr: 1_100_000,
    bump_notice_hours: 18,
    check_in_by: "22:00",
    earliest_check_in: "14:00",
    amenities: ["wifi", "ac", "kitchen", "coworking_desk"],
    status: "active",
    lat: -8.6502,
    lng: 115.1355,
  },
  {
    title: "Seseh Cliff Villa",
    description:
      "Dramatic cliff-top villa between Canggu and Tanah Lot. Panoramic ocean views, 15-metre infinity pool, and direct beach access.",
    area: "Canggu",
    address: "Jl. Pantai Seseh, Canggu",
    bedrooms: 5,
    bathrooms: 5,
    max_guests: 10,
    standby_rate_idr: 7_000_000,
    bump_notice_hours: 18,
    check_in_by: "16:00",
    earliest_check_in: "14:00",
    amenities: ["wifi", "pool", "ac", "kitchen", "parking", "staff", "beach_access", "bbq"],
    status: "active",
    lat: -8.6288,
    lng: 115.0985,
  },

  // ── Uluwatu (5) ────────────────────────────────────────
  {
    title: "Cliff Edge Uluwatu",
    description:
      "Perched 70 metres above the Indian Ocean on the Bukit limestone cliffs. Glass-floor viewing deck, infinity pool, and private funicular to the beach.",
    area: "Uluwatu",
    address: "Jl. Labuan Sait, Pecatu",
    bedrooms: 4,
    bathrooms: 4,
    max_guests: 8,
    standby_rate_idr: 5_500_000,
    bump_notice_hours: 18,
    check_in_by: "17:00",
    earliest_check_in: "14:00",
    amenities: ["wifi", "pool", "ac", "kitchen", "parking", "staff", "beach_access"],
    status: "active",
    lat: -8.8092,
    lng: 115.0892,
  },
  {
    title: "Bingin Surf Bungalow",
    description:
      "Rustic-chic bungalow overlooking Bingin's famous left-hand break. Wake up, grab your board, and paddle out in under two minutes.",
    area: "Uluwatu",
    address: "Jl. Pantai Bingin, Pecatu",
    bedrooms: 2,
    bathrooms: 1,
    max_guests: 4,
    standby_rate_idr: 1_600_000,
    bump_notice_hours: 18,
    check_in_by: "20:00",
    earliest_check_in: "14:00",
    amenities: ["wifi", "ac", "kitchen", "surfboard_storage", "ocean_view"],
    status: "active",
    lat: -8.8105,
    lng: 115.1002,
  },
  {
    title: "Padang Padang Retreat",
    description:
      "Whitewashed Mediterranean-style villa minutes from Padang Padang beach. Rooftop terrace with 360° views of the southern peninsula.",
    area: "Uluwatu",
    address: "Jl. Labuansait, Pecatu",
    bedrooms: 3,
    bathrooms: 3,
    max_guests: 6,
    standby_rate_idr: 3_000_000,
    bump_notice_hours: 18,
    check_in_by: "18:00",
    earliest_check_in: "14:00",
    amenities: ["wifi", "pool", "ac", "kitchen", "parking", "rooftop_terrace"],
    status: "active",
    lat: -8.8148,
    lng: 115.0945,
  },
  {
    title: "Dreamland Heights",
    description:
      "Modern minimalist villa on the Dreamland plateau. Private cinema room, sun-drenched terraces, and a chef's kitchen with ocean vistas.",
    area: "Uluwatu",
    address: "Jl. Raya Uluwatu, Pecatu",
    bedrooms: 3,
    bathrooms: 2,
    max_guests: 6,
    standby_rate_idr: 2_800_000,
    bump_notice_hours: 18,
    check_in_by: "18:00",
    earliest_check_in: "15:00",
    amenities: ["wifi", "pool", "ac", "kitchen", "parking", "cinema", "smart_tv"],
    status: "active",
    lat: -8.7958,
    lng: 115.0988,
  },
  {
    title: "The Temple House Uluwatu",
    description:
      "Grand five-bedroom estate inspired by Balinese temple architecture. Stone-carved entrance, lotus pond, and a 25-metre pool with ocean backdrop.",
    area: "Uluwatu",
    address: "Jl. Uluwatu Temple Road, Pecatu",
    bedrooms: 5,
    bathrooms: 5,
    max_guests: 10,
    standby_rate_idr: 8_500_000,
    bump_notice_hours: 18,
    check_in_by: "16:00",
    earliest_check_in: "14:00",
    amenities: ["wifi", "pool", "ac", "kitchen", "parking", "staff", "spa", "gym", "garden"],
    status: "active",
    lat: -8.8295,
    lng: 115.0852,
  },
];

export async function POST() {
  const supabase = createAdminClient();

  // Find owner to assign villas to
  const { data: owner, error: ownerError } = await supabase
    .from("owner_profiles")
    .select("id")
    .limit(1)
    .single<{ id: string }>();

  if (ownerError || !owner) {
    return NextResponse.json(
      { error: "No owner found. Run /api/setup first." },
      { status: 400 }
    );
  }

  const rows = VILLAS.map(({ lat, lng, ...rest }) => ({
    ...rest,
    owner_id: owner.id,
    location: `SRID=4326;POINT(${lng} ${lat})`,
    status: rest.status as "draft" | "active" | "paused" | "delisted",
  }));

  const { data, error } = await supabase
    .from("villas")
    .insert(rows)
    .select("id, title, area");

  if (error) {
    console.error("Seed villas error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: `Seeded ${data.length} villas`,
    villas: data,
  });
}
