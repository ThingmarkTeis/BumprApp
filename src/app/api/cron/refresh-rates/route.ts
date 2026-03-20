import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/auth/verify-cron";
import { createAdminClient } from "@/lib/supabase/admin";

const TARGET_CURRENCIES = ["USD", "EUR", "GBP", "AUD", "SGD", "DKK"];

const PRIMARY_API = "https://open.er-api.com/v6/latest/IDR";
const FALLBACK_API = "https://api.exchangerate-api.com/v4/latest/IDR";

async function fetchRates(
  url: string
): Promise<Record<string, number> | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();
    // Both APIs return { rates: { USD: number, ... } }
    return data.rates ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    // Try primary API, fall back to backup
    let rates = await fetchRates(PRIMARY_API);
    let source = "open.er-api.com";

    if (!rates) {
      rates = await fetchRates(FALLBACK_API);
      source = "exchangerate-api.com";
    }

    if (!rates) {
      console.error("Both exchange rate APIs failed. Keeping existing rates.");
      return NextResponse.json({
        error: "Failed to fetch rates from all sources",
        updated: 0,
      });
    }

    let updatedCount = 0;
    const updatedRates: Record<string, number> = {};

    for (const currency of TARGET_CURRENCIES) {
      const rate = rates[currency];
      if (rate === undefined) continue;

      // rate is IDR → target currency (1 IDR = X target)
      const { error } = await supabase.from("exchange_rates").upsert(
        {
          currency_code: currency,
          rate_from_idr: rate,
          source,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "currency_code" }
      );

      if (!error) {
        updatedCount++;
        updatedRates[currency] = rate;
      }
    }

    return NextResponse.json({ updated: updatedCount, rates: updatedRates });
  } catch (err) {
    console.error("Refresh rates cron error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
