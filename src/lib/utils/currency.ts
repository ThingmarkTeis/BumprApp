const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  AUD: "A$",
  SGD: "S$",
  DKK: "kr",
};

export function formatIdr(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

export function formatWithConversion(
  amountIdr: number,
  rate: number,
  currencyCode: string
): string {
  const converted = Math.round(amountIdr * rate);
  const symbol = CURRENCY_SYMBOLS[currencyCode] ?? currencyCode;
  return `${formatIdr(amountIdr)} (≈ ${symbol}${converted.toLocaleString()} ${currencyCode})`;
}
