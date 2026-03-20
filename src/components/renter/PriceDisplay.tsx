import { formatIdr } from "@/lib/utils/currency";

const SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", AUD: "A$", SGD: "S$", DKK: "kr",
};

export default function PriceDisplay({
  amountIdr,
  rate,
  currency,
  perNight,
  size = "md",
}: {
  amountIdr: number;
  rate: number | null;
  currency: string;
  perNight?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const symbol = SYMBOLS[currency] ?? currency;
  const converted = rate ? Math.round(amountIdr * rate) : null;

  const sizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
  };

  return (
    <div>
      {converted !== null && (
        <p className={`font-mono font-bold text-bumpr-orange ${sizeClasses[size]}`}>
          ≈ {symbol}{converted.toLocaleString()}
          {perNight && (
            <span className="text-warm-gray font-normal text-sm"> / night</span>
          )}
        </p>
      )}
      <p className="font-mono text-xs text-warm-gray">
        {formatIdr(amountIdr)}
        {perNight && !converted && " / night"}
      </p>
    </div>
  );
}
