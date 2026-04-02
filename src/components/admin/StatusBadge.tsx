const COLORS: Record<string, string> = {
  // Active states
  confirmed: "bg-teal text-white",
  active: "bg-teal text-white",

  // Action needed
  approved: "bg-bumpr-orange text-white",
  bumped: "bg-bumpr-orange text-white",
  bumping: "bg-bumpr-orange text-white",
  processing: "bg-bumpr-orange text-white",

  // Neutral / waiting
  requested: "bg-cream-dark text-volcanic",
  pending: "bg-cream-dark text-volcanic",
  draft: "bg-cream-dark text-warm-gray-dark",
  paused: "bg-cream-dark text-warm-gray-dark",

  // Completed
  completed: "bg-teal/20 text-teal",
  resolved: "bg-teal/20 text-teal",
  ok: "bg-teal/20 text-teal",
  sent: "bg-teal/20 text-teal",
  delivered: "bg-teal/20 text-teal",
  read: "bg-teal/20 text-teal",

  // Error / failed
  failed: "bg-red-500 text-white",
  error: "bg-red-500 text-white",
  admin_review: "bg-red-500 text-white",

  // Terminal
  cancelled: "bg-warm-gray-light text-warm-gray-dark",
  expired: "bg-warm-gray-light text-warm-gray-dark",
  pre_checkin_cancelled: "bg-warm-gray-light text-warm-gray-dark",
  delisted: "bg-warm-gray-light text-warm-gray-dark",

  // Payment types
  charge: "bg-teal/20 text-teal",
  refund: "bg-bumpr-orange/20 text-bumpr-orange-dark",
  payout: "bg-teal/10 text-teal-dark",

  // Roles
  admin: "bg-bumpr-orange text-white",
  owner: "bg-teal text-white",
  renter: "bg-cream-dark text-volcanic",

  // Notification channels
  whatsapp: "bg-green-100 text-green-700",
  in_app: "bg-teal/10 text-teal",
  email: "bg-blue-100 text-blue-700",

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
