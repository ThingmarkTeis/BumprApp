import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth/get-user-role";
import { createAdminClient } from "@/lib/supabase/admin";
import MetricCard from "@/components/admin/MetricCard";
import StatusBadge from "@/components/admin/StatusBadge";
import Pagination from "@/components/admin/Pagination";
import { formatIdr } from "@/lib/utils/currency";
import type { Database } from "@/lib/supabase/types";

type Payout = Database["public"]["Tables"]["payouts"]["Row"];

const PER_PAGE = 20;

export default async function EarningsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const result = await getUserRole();
  if (!result || result.role !== "owner") redirect("/login");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const supabase = createAdminClient();
  const ownerId = result.userId;

  // All payouts
  const { data: allPayouts } = await supabase
    .from("payouts")
    .select("amount_idr, status, created_at")
    .eq("owner_id", ownerId);

  const totalEarned = (allPayouts ?? [])
    .filter((p: { status: string }) => p.status === "completed")
    .reduce((s: number, p: { amount_idr: number }) => s + p.amount_idr, 0);

  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);

  const thisMonth = (allPayouts ?? [])
    .filter((p: { status: string; created_at: string }) =>
      p.status === "completed" && new Date(p.created_at) >= thisMonthStart
    )
    .reduce((s: number, p: { amount_idr: number }) => s + p.amount_idr, 0);

  const pendingAmount = (allPayouts ?? [])
    .filter((p: { status: string }) => p.status === "pending" || p.status === "processing")
    .reduce((s: number, p: { amount_idr: number }) => s + p.amount_idr, 0);

  // Paginated payouts
  const { data: payouts, count } = await supabase
    .from("payouts")
    .select("*", { count: "exact" })
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1)
    .returns<Payout[]>();

  const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

  // Resolve villa names
  const bookingIds = [...new Set((payouts ?? []).map((p) => p.booking_id))];
  const villaNames = new Map<string, string>();
  const bookingDates = new Map<string, { checkIn: string; checkOut: string }>();

  if (bookingIds.length > 0) {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, villa_id, check_in, check_out")
      .in("id", bookingIds);

    const villaIds = [...new Set((bookings ?? []).map((b: { villa_id: string }) => b.villa_id))];
    const { data: villas } = villaIds.length > 0
      ? await supabase.from("villas").select("id, title").in("id", villaIds)
      : { data: [] };
    const vMap = new Map((villas ?? []).map((v: { id: string; title: string }) => [v.id, v.title]));

    for (const b of bookings ?? []) {
      const bk = b as { id: string; villa_id: string; check_in: string; check_out: string };
      villaNames.set(bk.id, vMap.get(bk.villa_id) ?? "Villa");
      bookingDates.set(bk.id, { checkIn: bk.check_in, checkOut: bk.check_out });
    }
  }

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto md:max-w-none">
      <h1 className="font-serif text-3xl font-bold text-volcanic mb-6">
        Earnings
      </h1>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <MetricCard label="Total Earned" value={formatIdr(totalEarned)} />
        <MetricCard label="This Month" value={formatIdr(thisMonth)} />
        <MetricCard label="Pending" value={formatIdr(pendingAmount)} warn={pendingAmount > 0} />
      </div>

      <h2 className="font-serif text-xl font-semibold text-volcanic mb-4">
        Payout History
      </h2>

      <div className="space-y-3">
        {(payouts ?? []).length === 0 ? (
          <div className="rounded-[16px] bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-8 text-center text-warm-gray text-sm">
            No payouts yet
          </div>
        ) : (
          (payouts ?? []).map((p) => {
            const dates = bookingDates.get(p.booking_id);
            return (
              <div
                key={p.id}
                className="rounded-[16px] bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-volcanic">
                    {villaNames.get(p.booking_id) ?? "Villa"}
                  </p>
                  {dates && (
                    <p className="text-xs text-warm-gray-dark font-mono mt-0.5">
                      {dates.checkIn} → {dates.checkOut}
                    </p>
                  )}
                  <p className="text-xs text-warm-gray mt-1">
                    {p.nights_paid} nights
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-semibold text-volcanic">
                    {formatIdr(p.amount_idr)}
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} />
    </div>
  );
}
