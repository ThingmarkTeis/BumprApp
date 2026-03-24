import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import PhotoGallery from "@/components/renter/PhotoGallery";
import VillaDetailClient from "@/components/renter/VillaDetailClient";
import { formatIdr } from "@/lib/utils/currency";
import type { Database } from "@/lib/supabase/types";

type Villa = Database["public"]["Tables"]["villas"]["Row"];
type VillaPhoto = Database["public"]["Tables"]["villa_photos"]["Row"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: villa } = await supabase
    .from("villas")
    .select("title, area, standby_rate_idr")
    .eq("id", id)
    .single<Pick<Villa, "title" | "area" | "standby_rate_idr">>();

  if (!villa) return { title: "Villa not found" };

  const { data: photo } = await supabase
    .from("villa_photos")
    .select("url")
    .eq("villa_id", id)
    .eq("sort_order", 0)
    .single<{ url: string }>();

  return {
    title: `${villa.title} — Bumpr`,
    description: `Standby villa in ${villa.area}. ${formatIdr(villa.standby_rate_idr)}/night with bump notice.`,
    openGraph: {
      title: `${villa.title} — Standby Villa in Bali`,
      description: `From ${formatIdr(villa.standby_rate_idr)}/night in ${villa.area}. Accept the bump, enjoy the lifestyle.`,
      images: photo?.url ? [photo.url] : [],
    },
  };
}

export default async function VillaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: villa } = await admin
    .from("villas")
    .select("*")
    .eq("id", id)
    .eq("status", "active")
    .single<Villa>();

  if (!villa) notFound();

  const { data: photos } = await admin
    .from("villa_photos")
    .select("*")
    .eq("villa_id", id)
    .order("sort_order", { ascending: true })
    .returns<VillaPhoto[]>();

  // Get user currency/rate
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let currency = "USD";
  let fxRate: number | null = null;

  if (user) {
    const { data: profile } = await admin
      .from("profiles")
      .select("preferred_currency")
      .eq("id", user.id)
      .single<{ preferred_currency: string }>();
    currency = profile?.preferred_currency ?? "USD";

    const { data: rate } = await admin
      .from("exchange_rates")
      .select("rate_from_idr")
      .eq("currency_code", currency)
      .single<{ rate_from_idr: number }>();
    fxRate = rate?.rate_from_idr ?? null;
  }

  const amenities: string[] = Array.isArray(villa.amenities)
    ? villa.amenities
    : [];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Photos */}
      <PhotoGallery photos={(photos ?? []).map((p) => ({ url: p.url }))} />

      {/* Content */}
      <div className="px-6 py-6 md:flex md:gap-8">
        {/* Info */}
        <div className="flex-1">
          <h1 className="font-serif text-3xl font-bold text-volcanic">{villa.title}</h1>
          <p className="text-warm-gray-dark capitalize mt-1">{villa.area}</p>

          {/* Quick stats */}
          <div className="flex gap-6 mt-4 text-sm text-warm-gray-dark">
            <span>{villa.bedrooms} bedroom{villa.bedrooms !== 1 && "s"}</span>
            {villa.bathrooms && <span>{villa.bathrooms} bathroom{villa.bathrooms !== 1 && "s"}</span>}
            <span>{villa.max_guests} guest{villa.max_guests !== 1 && "s"} max</span>
          </div>

          {/* Description */}
          {villa.description && (
            <div className="mt-6">
              <p className="text-volcanic leading-relaxed whitespace-pre-line">
                {villa.description}
              </p>
            </div>
          )}

          {/* Amenities */}
          {amenities.length > 0 && (
            <div className="mt-6">
              <h2 className="font-serif text-lg font-semibold text-volcanic mb-3">
                Amenities
              </h2>
              <div className="flex flex-wrap gap-2">
                {amenities.map((a) => (
                  <span
                    key={a}
                    className="rounded-full bg-cream-dark px-3 py-1 text-sm text-warm-gray-dark"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bump notice explanation */}
          <div className="mt-8 rounded-[16px] bg-cream-dark p-5">
            <h3 className="font-serif font-semibold text-volcanic mb-2">
              {villa.bump_notice_hours}-hour bump notice
            </h3>
            <p className="text-sm text-warm-gray-dark leading-relaxed">
              This is a standby booking. The villa owner may need the villa for a
              full-price guest. If that happens, you&apos;ll get at least{" "}
              {villa.bump_notice_hours} hours notice to find a new place.
              That&apos;s the deal — and it&apos;s why the price is this good.
            </p>
          </div>
        </div>

        {/* Booking sidebar */}
        <div className="mt-8 md:mt-0 md:w-80 shrink-0">
          <VillaDetailClient
            villaId={villa.id}
            rateIdr={villa.standby_rate_idr}
            bumpNoticeHours={villa.bump_notice_hours}
            earliestCheckIn={villa.earliest_check_in ?? "14:00"}
            checkInBy={villa.check_in_by ?? "20:00"}
            fxRate={fxRate}
            currency={currency}
          />
        </div>
      </div>
    </div>
  );
}
