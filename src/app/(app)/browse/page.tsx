import { createClient } from "@/lib/supabase/server";
import BrowseClient from "@/components/renter/BrowseClient";

export default async function BrowsePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let currency = "USD";
  let fxRate: number | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("preferred_currency")
      .eq("id", user.id)
      .single<{ preferred_currency: string }>();
    currency = profile?.preferred_currency ?? "USD";

    const { data: rate } = await supabase
      .from("exchange_rates")
      .select("rate_from_idr")
      .eq("currency_code", currency)
      .single<{ rate_from_idr: number }>();
    fxRate = rate?.rate_from_idr ?? null;
  }

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

  return (
    <BrowseClient
      mapboxToken={mapboxToken}
      currency={currency}
      fxRate={fxRate}
    />
  );
}
