import { createAdminClient } from "@/lib/supabase/admin";
import StatusBadge from "@/components/admin/StatusBadge";
import FilterBar from "@/components/admin/FilterBar";
import Pagination from "@/components/admin/Pagination";
import AdminPaymentRetry from "@/components/admin/AdminPaymentRetry";
import { formatIdr } from "@/lib/utils/currency";

const PER_PAGE = 20;

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const statusFilter = sp.status;
  const tab = sp.tab ?? "payments";
  const supabase = createAdminClient();

  if (tab === "payouts") {
    // Payouts tab
    let query = supabase.from("payouts").select("*", { count: "exact" });
    if (statusFilter) query = query.eq("status", statusFilter as "pending" | "processing" | "completed" | "failed");

    const { data: payouts, count } = await query
      .order("created_at", { ascending: false })
      .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

    const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

    // Resolve names
    const ownerIds = [...new Set((payouts ?? []).map((p: { owner_id: string }) => p.owner_id))];
    const bookingIds = [...new Set((payouts ?? []).map((p: { booking_id: string }) => p.booking_id))];

    const { data: owners } = ownerIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", ownerIds)
      : { data: [] };
    const ownerMap = new Map((owners ?? []).map((o: { id: string; full_name: string }) => [o.id, o.full_name]));

    const villaMap = new Map<string, string>();
    if (bookingIds.length > 0) {
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, villa_id")
        .in("id", bookingIds);
      const vIds = [...new Set((bookings ?? []).map((b: { villa_id: string }) => b.villa_id))];
      if (vIds.length > 0) {
        const { data: villas } = await supabase.from("villas").select("id, title").in("id", vIds);
        const vMap = new Map((villas ?? []).map((v: { id: string; title: string }) => [v.id, v.title]));
        for (const b of bookings ?? []) {
          const bk = b as { id: string; villa_id: string };
          villaMap.set(bk.id, vMap.get(bk.villa_id) ?? "—");
        }
      }
    }

    return (
      <div className="px-6 py-8">
        <h1 className="font-serif text-3xl font-bold text-teal mb-6">Payments</h1>
        <TabSwitcher tab={tab} />
        <div className="mb-4">
          <FilterBar filters={[{ key: "status", label: "Status", options: statusOptions }]} />
        </div>
        <div className="rounded-xl border border-volcanic/10 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-teal/5 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-volcanic/70">Owner</th>
                <th className="px-4 py-3 font-medium text-volcanic/70">Villa</th>
                <th className="px-4 py-3 font-medium text-volcanic/70">Nights</th>
                <th className="px-4 py-3 font-medium text-volcanic/70">Amount</th>
                <th className="px-4 py-3 font-medium text-volcanic/70">Xendit ID</th>
                <th className="px-4 py-3 font-medium text-volcanic/70">Status</th>
                <th className="px-4 py-3 font-medium text-volcanic/70">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-volcanic/5">
              {(payouts ?? []).map((p: {
                id: string;
                owner_id: string;
                booking_id: string;
                nights_paid: number;
                amount_idr: number;
                xendit_disbursement_id: string | null;
                status: string;
              }) => (
                <tr key={p.id} className={`hover:bg-cream/50 ${p.status === "failed" ? "bg-red-50" : ""}`}>
                  <td className="px-4 py-3 text-volcanic">{ownerMap.get(p.owner_id) ?? "—"}</td>
                  <td className="px-4 py-3 text-volcanic/70">{villaMap.get(p.booking_id) ?? "—"}</td>
                  <td className="px-4 py-3 font-mono">{p.nights_paid}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatIdr(p.amount_idr)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-volcanic/50">{p.xendit_disbursement_id?.slice(0, 12) ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3">
                    <AdminPaymentRetry id={p.id} status={p.status} />
                  </td>
                </tr>
              ))}
              {(payouts ?? []).length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-volcanic/40">No payouts found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} />
      </div>
    );
  }

  // Payments tab (default)
  let query = supabase.from("payments").select("*", { count: "exact" });
  if (statusFilter) query = query.eq("status", statusFilter as "pending" | "processing" | "completed" | "failed");

  const { data: payments, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

  const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

  return (
    <div className="px-6 py-8">
      <h1 className="font-serif text-3xl font-bold text-teal mb-6">Payments</h1>
      <TabSwitcher tab={tab} />
      <div className="mb-4">
        <FilterBar filters={[{ key: "status", label: "Status", options: statusOptions }]} />
      </div>
      <div className="rounded-xl border border-volcanic/10 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-teal/5 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-volcanic/70">Booking</th>
              <th className="px-4 py-3 font-medium text-volcanic/70">Type</th>
              <th className="px-4 py-3 font-medium text-volcanic/70">Amount</th>
              <th className="px-4 py-3 font-medium text-volcanic/70">Xendit ID</th>
              <th className="px-4 py-3 font-medium text-volcanic/70">Status</th>
              <th className="px-4 py-3 font-medium text-volcanic/70">Created</th>
              <th className="px-4 py-3 font-medium text-volcanic/70">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-volcanic/5">
            {(payments ?? []).map((p: {
              id: string;
              booking_id: string;
              type: string;
              amount_idr: number;
              xendit_payment_id: string | null;
              status: string;
              created_at: string;
            }) => (
              <tr key={p.id} className={`hover:bg-cream/50 ${p.status === "failed" ? "bg-red-50" : ""}`}>
                <td className="px-4 py-3 font-mono text-xs">{p.booking_id.slice(0, 8)}</td>
                <td className="px-4 py-3"><StatusBadge status={p.type} /></td>
                <td className="px-4 py-3 font-mono text-xs">{formatIdr(p.amount_idr)}</td>
                <td className="px-4 py-3 font-mono text-xs text-volcanic/50">{p.xendit_payment_id?.slice(0, 12) ?? "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3 text-xs text-volcanic/50">{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <AdminPaymentRetry id={p.id} status={p.status} />
                </td>
              </tr>
            ))}
            {(payments ?? []).length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-volcanic/40">No payments found</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} />
    </div>
  );
}

const statusOptions = [
  { label: "Pending", value: "pending" },
  { label: "Processing", value: "processing" },
  { label: "Completed", value: "completed" },
  { label: "Failed", value: "failed" },
];

function TabSwitcher({ tab }: { tab: string }) {
  return (
    <div className="flex gap-1 mb-4 border-b border-volcanic/10">
      <a
        href="?tab=payments"
        className={`px-4 py-2 text-sm font-medium border-b-2 ${
          tab === "payments"
            ? "border-teal text-teal"
            : "border-transparent text-volcanic/50 hover:text-volcanic"
        }`}
      >
        Payments
      </a>
      <a
        href="?tab=payouts"
        className={`px-4 py-2 text-sm font-medium border-b-2 ${
          tab === "payouts"
            ? "border-teal text-teal"
            : "border-transparent text-volcanic/50 hover:text-volcanic"
        }`}
      >
        Payouts
      </a>
    </div>
  );
}
