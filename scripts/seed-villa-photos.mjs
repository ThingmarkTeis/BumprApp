import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Unsplash photo IDs — tropical villas, pools, Bali interiors, ocean views
const PHOTO_SETS = {
  // ── Ubud ──
  "Villa Sawah Ubud": [
    "photo-1602002418816-5c0aeef426aa", // rice terrace pool
    "photo-1582610116397-edb318620f90", // tropical villa exterior
    "photo-1540541338287-41700c6e5e49", // lush garden villa
  ],
  "Jungle Hideaway Ubud": [
    "photo-1596394516093-501ba68a0ba6", // jungle pool
    "photo-1615571022219-eb45cf7faa36", // bamboo interior
    "photo-1559599238-308793637427", // tropical bedroom
  ],
  "Uma Sari Retreat": [
    "photo-1600585154340-be6161a56a0c", // luxury villa pool
    "photo-1600607687939-ce8a6c25118c", // elegant living room
    "photo-1600566753086-00f18f6b422b", // villa courtyard
  ],
  "Padi Terrace Loft": [
    "photo-1518733057094-95b53143d2a7", // modern loft
    "photo-1600585154526-990dced4db0d", // cozy bedroom
    "photo-1600573472592-401b489a3cdc", // rice paddy view
  ],
  "Tirta Naga Estate": [
    "photo-1613490493576-7fde63acd811", // luxury estate pool
    "photo-1600607687644-c7171b42498f", // spacious interior
    "photo-1600566753190-17f0baa2a6c3", // grand entrance
  ],

  // ── Canggu ──
  "Echo Beach Surf House": [
    "photo-1499793983394-12a2f4d01232", // beach sunset
    "photo-1600585154340-be6161a56a0c", // pool area
    "photo-1564013799919-ab600027ffc6", // surf house exterior
  ],
  "Berawa Luxe Pavilion": [
    "photo-1600596542815-ffad4c1539a9", // minimalist pool
    "photo-1600210492493-0946911f159a", // modern interior
    "photo-1600585154526-990dced4db0d", // bedroom
  ],
  "Villa Nusa Canggu": [
    "photo-1600607687939-ce8a6c25118c", // family living room
    "photo-1600566753086-00f18f6b422b", // garden pool
    "photo-1600573472592-401b489a3cdc", // kids play area
  ],
  "Batu Bolong Studio": [
    "photo-1522708323590-d24dbb6b0267", // compact studio
    "photo-1502672260266-1c1ef2d93688", // cozy interior
    "photo-1600585154340-be6161a56a0c", // small pool
  ],
  "Seseh Cliff Villa": [
    "photo-1613490493576-7fde63acd811", // infinity pool ocean
    "photo-1600607687644-c7171b42498f", // grand interior
    "photo-1507525428034-b723cf961d3e", // ocean panoramic
  ],

  // ── Uluwatu ──
  "Cliff Edge Uluwatu": [
    "photo-1537953773345-d172ccf13cf4", // cliffside pool
    "photo-1600607687939-ce8a6c25118c", // interior ocean view
    "photo-1544551763-46a013bb70d5", // cliff sunset
  ],
  "Bingin Surf Bungalow": [
    "photo-1499793983394-12a2f4d01232", // surf beach
    "photo-1559599238-308793637427", // bungalow bedroom
    "photo-1540541338287-41700c6e5e49", // tropical exterior
  ],
  "Padang Padang Retreat": [
    "photo-1600596542815-ffad4c1539a9", // white villa pool
    "photo-1600585154526-990dced4db0d", // bedroom
    "photo-1600210492493-0946911f159a", // rooftop terrace
  ],
  "Dreamland Heights": [
    "photo-1600585154340-be6161a56a0c", // modern pool
    "photo-1600607687644-c7171b42498f", // cinema room
    "photo-1600566753190-17f0baa2a6c3", // terrace view
  ],
  "The Temple House Uluwatu": [
    "photo-1613490493576-7fde63acd811", // grand pool
    "photo-1600566753086-00f18f6b422b", // stone entrance
    "photo-1600607687939-ce8a6c25118c", // luxury interior
  ],
};

function unsplashUrl(photoId) {
  return `https://images.unsplash.com/${photoId}?w=800&h=600&fit=crop&q=80`;
}

async function seed() {
  // Get all seeded villas
  const { data: villas, error } = await supabase
    .from("villas")
    .select("id, title")
    .eq("status", "active");

  if (error || !villas) {
    console.error("Failed to fetch villas:", error);
    process.exit(1);
  }

  let total = 0;

  for (const villa of villas) {
    const photoIds = PHOTO_SETS[villa.title];
    if (!photoIds) continue;

    // Check if photos already exist
    const { data: existing } = await supabase
      .from("villa_photos")
      .select("id")
      .eq("villa_id", villa.id)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`  ⏭ ${villa.title} — already has photos`);
      continue;
    }

    const rows = photoIds.map((photoId, i) => ({
      villa_id: villa.id,
      url: unsplashUrl(photoId),
      sort_order: i,
      caption: i === 0 ? villa.title : null,
    }));

    const { error: insertError } = await supabase
      .from("villa_photos")
      .insert(rows);

    if (insertError) {
      console.error(`  ✗ ${villa.title}: ${insertError.message}`);
    } else {
      console.log(`  ✓ ${villa.title} — ${rows.length} photos`);
      total += rows.length;
    }
  }

  console.log(`\nDone — added ${total} photos across ${villas.length} villas`);
}

seed();
