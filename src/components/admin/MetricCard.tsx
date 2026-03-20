export default function MetricCard({
  label,
  value,
  warn,
}: {
  label: string;
  value: number | string;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-[16px] p-5 shadow-[0_2px_16px_rgba(26,26,26,0.06)] ${
        warn
          ? "bg-bumpr-orange/5 border border-bumpr-orange/20"
          : "bg-white"
      }`}
    >
      <p className="text-sm text-warm-gray-dark">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold text-bumpr-orange">
        {value}
      </p>
    </div>
  );
}
