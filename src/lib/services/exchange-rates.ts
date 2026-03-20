import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { formatIdr } from "@/lib/utils/currency";

type ExchangeRate = Database["public"]["Tables"]["exchange_rates"]["Row"];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  AUD: "A$",
  SGD: "S$",
  DKK: "kr",
};

export async function getRate(currencyCode: string): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("exchange_rates")
    .select("rate_from_idr")
    .eq("currency_code", currencyCode)
    .single<{ rate_from_idr: number }>();

  if (error || !data) {
    throw new Error(`Exchange rate not found for ${currencyCode}.`);
  }

  return data.rate_from_idr;
}

export async function convertFromIdr(
  amountIdr: number,
  currencyCode: string
): Promise<number> {
  const rate = await getRate(currencyCode);
  return Math.round(amountIdr * rate * 100) / 100;
}

export async function formatPriceForRenter(
  amountIdr: number,
  currencyCode: string
): Promise<string> {
  const rate = await getRate(currencyCode);
  const converted = Math.round(amountIdr * rate);
  const symbol = CURRENCY_SYMBOLS[currencyCode] ?? currencyCode;
  return `${formatIdr(amountIdr)} (≈ ${symbol}${converted.toLocaleString()} ${currencyCode})`;
}

export async function getAllRates(): Promise<ExchangeRate[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("exchange_rates")
    .select("*")
    .order("currency_code")
    .returns<ExchangeRate[]>();

  if (error) throw new Error(`Failed to fetch rates: ${error.message}`);
  return data ?? [];
}
