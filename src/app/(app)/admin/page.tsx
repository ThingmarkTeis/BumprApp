import { createAdminClient } from "@/lib/supabase/admin";
import MetricCard from "@/components/admin/MetricCard";
import StatusBadge from "@/components/admin/StatusBadge";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const supabase = createAdminClient();

  // Fetch metrics
  const [
    { count: activeVillas },
    { count: activeBookings },
    { count: activeBumps },
    { count: pendingPayouts },
    { count: unverifiedBumps },
    { count: failedPayments },
    { count: staleIcal },
  ] = await Promise.all([
    supabase.from("villas").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("bookings").select("*", { count: "exact", head: true }).in("status", ["confirmed", "active"]),
    supabase.from("bumps").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("payouts").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("bumps").select("*", { count: "exact", head: true }).eq("status", "active").eq("ical_verified", false),
    supabase.from("payments").select("*", { count: "exact", head: true }).eq("status", "failed"),
    supabase.from("villas").select("*", { count: "exact", head: true }).eq("ical_sync_status", "error").not("ical_url", "is", null),
  ]);

  const flaggedCount = (unverifiedBumps ?? 0) + (failedPayments ?? 0) + (staleIcal ?? 0);

  // Recent bookings
  const { data: recentBookings } = await supabase
    .from("bookings")
    .select("id, check_in, check_out, status, created_at, villa_id, renter_id")
    .order("created_at", { ascending: false })
    .limit(10);

  // Get villa titles and renter names for recent bookings
  const villaIds = [...new Set((recentBookings ?? []).map((b: { villa_id: string }) => b.villa_id))];
  const renterIds = [...new Set((recentBookings ?? []).map((b: { renter_id: string }) => b.renter_id))];

  const { data: villas } = villaIds.length > 0
    ? await supabase.from("villas").select("id, title").in("id", villaIds)
    : { data: [] };
  const { data: renters } = renterIds.length > 0
    ? await supabase.from("profiles").select("id, full_name").in("id", renterIds)
    : { data: [] };

  const villaMap = new Map((villas ?? []).map((v: { id: string; title: string }) => [v.id, v.title]));
  const renterMap = new Map((renters ?? []).map((r: { id: string; full_name: string }) => [r.id, r.full_name]));

  // Recent bumps
  const { data: recentBumps } = await supabase
    .from("bumps")
    .select("id, villa_id, renter_id, status, ical_verified, triggered_at")
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="px-6 py-8">
      <h1 className="font-serif text-3xl font-bold text-volcanic mb-6">
        Admin Dashboard
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <MetricCard label="Active Villas" value={activeVillas ?? 0} />
        <MetricCard label="Active Bookings" value={activeBookings ?? 0} />
        <MetricCard label="Active Bumps" value={activeBumps ?? 0} warn={(activeBumps ?? 0) > 0} />
        <MetricCard label="Pending Payouts" value={pendingPayouts ?? 0} warn={(pendingPayouts ?? 0) > 0} />
        <MetricCard label="Flagged Items" value={flaggedCount} warn={flaggedCount > 0} />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Bookings */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-semibold text-volcanic">Recent Bookings</h2>
            <Link href="/admin/bookings" className="text-sm text-bumpr-orange hover:underline">View all</Link>
          </div>
          <div className="rounded-[16px] shadow-[0_2px_16px_rgba(26,26,26,0.06)] bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-cream-dark text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium text-warm-gray-dark">Villa</th>
                  <th className="px-4 py-2.5 font-medium text-warm-gray-dark">Renter</th>
                  <th className="px-4 py-2.5 font-medium text-warm-gray-dark">Dates</th>
                  <th className="px-4 py-2.5 font-medium text-warm-gray-dark">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-gray-light">
                {(recentBookings ?? []).map((b: { id: string; villa_id: string; renter_id: string; check_in: string; check_out: string; status: string }) => (
                  <tr key={b.id} className="hover:bg-cream-dark/50">
                    <td className="px-4 py-2.5 text-volcanic">{villaMap.get(b.villa_id) ?? "—"}</td>
                    <td className="px-4 py-2.5 text-warm-gray-dark">{renterMap.get(b.renter_id) ?? "—"}</td>
                    <td className="px-4 py-2.5 text-warm-gray-dark font-mono text-xs">{b.check_in} → {b.check_out}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
                {(recentBookings ?? []).length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-warm-gray">No bookings yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Bumps */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-semibold text-volcanic">Recent Bumps</h2>
            <Link href="/admin/bumps" className="text-sm text-bumpr-orange hover:underline">View all</Link>
          </div>
          <div className="rounded-[16px] shadow-[0_2px_16px_rgba(26,26,26,0.06)] bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-cream-dark text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium text-warm-gray-dark">Villa</th>
                  <th className="px-4 py-2.5 font-medium text-warm-gray-dark">Renter</th>
                  <th className="px-4 py-2.5 font-medium text-warm-gray-dark">Verified</th>
                  <th className="px-4 py-2.5 font-medium text-warm-gray-dark">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-gray-light">
                {(recentBumps ?? []).map((b: { id: string; villa_id: string; renter_id: string; ical_verified: boolean; status: string }) => (
                  <tr key={b.id} className={`hover:bg-cream-dark/50 ${!b.ical_verified && b.status === "active" ? "bg-bumpr-orange/5" : ""}`}>
                    <td className="px-4 py-2.5 text-volcanic">{villaMap.get(b.villa_id) ?? "—"}</td>
                    <td className="px-4 py-2.5 text-warm-gray-dark">{renterMap.get(b.renter_id) ?? "—"}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={b.ical_verified ? "yes" : "no"} /></td>
                    <td className="px-4 py-2.5"><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
                {(recentBumps ?? []).length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-warm-gray">No bumps yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
