import Link from "next/link";

export default function MetricCard({
  label,
  value,
  warn,
  href,
  sub,
}: {
  label: string;
  value: number | string;
  warn?: boolean;
  href?: string;
  sub?: string;
}) {
  const content = (
    <div
      className={`rounded-2xl p-5 shadow-[0_2px_16px_rgba(26,26,26,0.06)] transition-colors ${
        warn
          ? "bg-bumpr-orange/5 border border-bumpr-orange/20"
          : "bg-white"
      } ${href ? "hover:shadow-md cursor-pointer" : ""}`}
    >
      <p className="text-sm text-warm-gray-dark">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold text-volcanic">
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-xs text-warm-gray">{sub}</p>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
