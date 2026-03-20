import { createAdminClient } from "@/lib/supabase/admin";
import StatusBadge from "@/components/admin/StatusBadge";
import FilterBar from "@/components/admin/FilterBar";
import Pagination from "@/components/admin/Pagination";
import AdminBookingActions from "@/components/admin/AdminBookingActions";
import type { BookingStatus } from "@/lib/supabase/types";
import { formatIdr } from "@/lib/utils/currency";

const PER_PAGE = 20;

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const statusFilter = sp.status;
  const supabase = createAdminClient();

  let query = supabase
    .from("bookings")
    .select("*", { count: "exact" });

  if (statusFilter) query = query.eq("status", statusFilter as BookingStatus);

  const { data: bookings, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

  const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

  // Resolve villa & renter names
  const villaIds = [...new Set((bookings ?? []).map((b: { villa_id: string }) => b.villa_id))];
  const renterIds = [...new Set((bookings ?? []).map((b: { renter_id: string }) => b.renter_id))];

  const { data: villas } = villaIds.length > 0
    ? await supabase.from("villas").select("id, title").in("id", villaIds)
    : { data: [] };
  const { data: renters } = renterIds.length > 0
    ? await supabase.from("profiles").select("id, full_name").in("id", renterIds)
    : { data: [] };

  const villaMap = new Map((villas ?? []).map((v: { id: string; title: string }) => [v.id, v.title]));
  const renterMap = new Map((renters ?? []).map((r: { id: string; full_name: string }) => [r.id, r.full_name]));

  // Payment statuses per booking
  const bookingIds = (bookings ?? []).map((b: { id: string }) => b.id);
  const paymentMap = new Map<string, string>();
  if (bookingIds.length > 0) {
    const { data: payments } = await supabase
      .from("payments")
      .select("booking_id, status")
      .in("booking_id", bookingIds)
      .eq("type", "charge");
    for (const p of payments ?? []) {
      const pm = p as { booking_id: string; status: string };
      paymentMap.set(pm.booking_id, pm.status);
    }
  }

  return (
    <div className="px-6 py-8">
      <h1 className="font-serif text-3xl font-bold text-volcanic mb-6">Bookings</h1>

      <div className="mb-4">
        <FilterBar
          filters={[
            {
              key: "status",
              label: "Status",
              options: [
                { label: "Requested", value: "requested" },
                { label: "Approved", value: "approved" },
                { label: "Confirmed", value: "confirmed" },
                { label: "Active", value: "active" },
                { label: "Bumped", value: "bumped" },
                { label: "Completed", value: "completed" },
                { label: "Cancelled", value: "cancelled" },
                { label: "Expired", value: "expired" },
              ],
            },
          ]}
        />
      </div>

      <div className="rounded-[16px] shadow-[0_2px_16px_rgba(26,26,26,0.06)] bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream-dark text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">ID</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Villa</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Renter</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Check-in</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Check-out</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">N</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Amount</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Status</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Pay</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-gray-light">
            {(bookings ?? []).map((b: {
              id: string;
              villa_id: string;
              renter_id: string;
              check_in: string;
              check_out: string;
              nights: number;
              total_charged_idr: number;
              status: string;
            }) => (
              <tr key={b.id} className="hover:bg-cream-dark/50">
                <td className="px-4 py-3 font-mono text-xs text-warm-gray-dark">{b.id.slice(0, 8)}</td>
                <td className="px-4 py-3 text-volcanic">{villaMap.get(b.villa_id) ?? "—"}</td>
                <td className="px-4 py-3 text-volcanic/70">{renterMap.get(b.renter_id) ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">{b.check_in}</td>
                <td className="px-4 py-3 font-mono text-xs">{b.check_out}</td>
                <td className="px-4 py-3 font-mono">{b.nights}</td>
                <td className="px-4 py-3 font-mono text-xs">{formatIdr(b.total_charged_idr)}</td>
                <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                <td className="px-4 py-3">
                  {paymentMap.get(b.id) ? (
                    <StatusBadge status={paymentMap.get(b.id)!} />
                  ) : (
                    <span className="text-volcanic/30 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <AdminBookingActions bookingId={b.id} status={b.status} />
                </td>
              </tr>
            ))}
            {(bookings ?? []).length === 0 && (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-volcanic/40">No bookings found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} />
    </div>
  );
}
