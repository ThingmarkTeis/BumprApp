const COLORS: Record<string, string> = {
  // Active states — teal
  confirmed: "bg-teal text-white",
  active: "bg-teal text-white",

  // Action needed — bumpr orange
  approved: "bg-bumpr-orange text-white",
  bumped: "bg-bumpr-orange text-white",
  processing: "bg-bumpr-orange text-white",

  // Neutral / waiting — warm gray
  requested: "bg-cream-dark text-volcanic",
  pending: "bg-cream-dark text-volcanic",
  draft: "bg-cream-dark text-warm-gray-dark",
  paused: "bg-cream-dark text-warm-gray-dark",

  // Completed — teal muted
  completed: "bg-teal/20 text-teal",
  resolved: "bg-teal/20 text-teal",
  ok: "bg-teal/20 text-teal",

  // Error / failed — red
  failed: "bg-red-500 text-white",
  error: "bg-red-500 text-white",
  admin_review: "bg-red-500 text-white",

  // Terminal — warm gray muted
  cancelled: "bg-warm-gray-light text-warm-gray-dark",
  expired: "bg-warm-gray-light text-warm-gray-dark",
  pre_checkin_cancelled: "bg-warm-gray-light text-warm-gray-dark",
  delisted: "bg-warm-gray-light text-warm-gray-dark",

  // Types
  charge: "bg-teal/20 text-teal",
  refund: "bg-bumpr-orange/20 text-bumpr-orange-dark",

  // Roles
  admin: "bg-bumpr-orange text-white",
  owner: "bg-teal text-white",
  renter: "bg-cream-dark text-volcanic",

  // Boolean
  yes: "bg-teal/20 text-teal",
  no: "bg-red-100 text-red-600",
};

export default function StatusBadge({ status }: { status: string }) {
  const color = COLORS[status] ?? "bg-cream-dark text-warm-gray-dark";
  const label = status.replace(/_/g, " ");

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${color}`}
    >
      {label}
    </span>
  );
}
