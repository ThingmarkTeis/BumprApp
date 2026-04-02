import { createAdminClient } from "@/lib/supabase/admin";
import MetricCard from "@/components/admin/MetricCard";
import StatusBadge from "@/components/admin/StatusBadge";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = createAdminClient();

  const today = new Date().toISOString().split("T")[0];

  const [
    { count: totalUsers },
    { count: activeVillas },
    { count: activeBookings },
    { count: todayBookings },
    { count: pendingRequests },
    { count: activeBumps },
    { count: pendingPayouts },
    { count: unverifiedBumps },
    { count: failedPayments },
    { count: staleIcal },
    { count: failedNotifications },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("villas").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("bookings").select("*", { count: "exact", head: true }).in("status", ["confirmed", "active"]),
    supabase.from("bookings").select("*", { count: "exact", head: true }).gte("created_at", `${today}T00:00:00`),
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "requested"),
    supabase.from("bumps").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("payouts").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("bumps").select("*", { count: "exact", head: true }).eq("status", "active").eq("ical_verified", false),
    supabase.from("payments").select("*", { count: "exact", head: true }).eq("status", "failed"),
    supabase.from("villas").select("*", { count: "exact", head: true }).eq("ical_sync_status", "error").not("ical_url", "is", null),
    supabase.from("notifications").select("*", { count: "exact", head: true }).eq("status", "failed"),
  ]);

  // Revenue (completed payments)
  const { data: revenueData } = await supabase
    .from("payments")
    .select("amount_idr")
    .eq("type", "charge")
    .eq("status", "completed");
  const totalRevenue = (revenueData ?? []).reduce((sum, p) => sum + Number((p as { amount_idr: number }).amount_idr), 0);

  // Recent bookings
  const { data: recentBookings } = await supabase
    .from("bookings")
    .select("id, check_in, check_out, status, guests, created_at, villa_id, renter_id")
    .order("created_at", { ascending: false })
    .limit(10);

  const villaIds = [...new Set((recentBookings ?? []).map((b: { villa_id: string }) => b.villa_id))];
  const renterIds = [...new Set((recentBookings ?? []).map((b: { renter_id: string }) => b.renter_id))];

  const [{ data: villas }, { data: renters }] = await Promise.all([
    villaIds.length > 0
      ? supabase.from("villas").select("id, title").in("id", villaIds)
      : Promise.resolve({ data: [] }),
    renterIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", renterIds)
      : Promise.resolve({ data: [] }),
  ]);

  const villaMap = new Map((villas ?? []).map((v: { id: string; title: string }) => [v.id, v.title]));
  const renterMap = new Map((renters ?? []).map((r: { id: string; full_name: string }) => [r.id, r.full_name]));

  // Recent bumps
  const { data: recentBumps } = await supabase
    .from("bumps")
    .select("id, villa_id, renter_id, status, ical_verified, triggered_at, external_platform, deadline")
    .order("created_at", { ascending: false })
    .limit(5);

  // Exchange rates
  const { data: exchangeRates } = await supabase
    .from("exchange_rates")
    .select("currency_code, rate_from_idr, fetched_at")
    .order("currency_code");

  const flaggedCount = (unverifiedBumps ?? 0) + (failedPayments ?? 0) + (staleIcal ?? 0) + (failedNotifications ?? 0);

  return (
    <div className="px-6 py-8">
      <h1 className="font-serif text-3xl font-bold text-volcanic mb-6">
        Dashboard
      </h1>

      {/* Primary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
        <MetricCard label="Total Users" value={totalUsers ?? 0} href="/admin/users" />
        <MetricCard label="Active Villas" value={activeVillas ?? 0} href="/admin/villas?status=active" />
        <MetricCard label="Active Bookings" value={activeBookings ?? 0} href="/admin/bookings?status=active" />
        <MetricCard label="Today's Bookings" value={todayBookings ?? 0} href="/admin/bookings" />
        <MetricCard
          label="Pending Requests"
          value={pendingRequests ?? 0}
          warn={(pendingRequests ?? 0) > 0}
          href="/admin/bookings?status=requested"
          sub={(pendingRequests ?? 0) > 0 ? "15-min expiry" : undefined}
        />
      </div>

      {/* Operational metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <MetricCard
          label="Active Bumps"
          value={activeBumps ?? 0}
          warn={(activeBumps ?? 0) > 0}
          href="/admin/bumps?status=active"
        />
        <MetricCard
          label="Pending Payouts"
          value={pendingPayouts ?? 0}
          warn={(pendingPayouts ?? 0) > 0}
          href="/admin/payments?tab=payouts&status=pending"
        />
        <MetricCard
          label="Flagged Items"
          value={flaggedCount}
          warn={flaggedCount > 0}
        />
        <MetricCard
          label="Total Revenue"
          value={totalRevenue > 0 ? `IDR ${(totalRevenue / 1_000_000).toFixed(1)}M` : "IDR 0"}
          href="/admin/payments"
        />
        <MetricCard label="Exchange Rates" value={(exchangeRates ?? []).length} href="/admin/system" sub="currencies tracked" />
      </div>

      {/* Alerts */}
      {flaggedCount > 0 && (
        <div className="mb-8 rounded-2xl border border-bumpr-orange/30 bg-bumpr-orange/5 p-5">
          <h2 className="font-serif text-lg font-semibold text-volcanic mb-3">Alerts</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(failedPayments ?? 0) > 0 && (
              <Link href="/admin/payments?status=failed" className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm hover:shadow-sm">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-volcanic">{failedPayments} failed payment{(failedPayments ?? 0) > 1 ? "s" : ""}</span>
              </Link>
            )}
            {(unverifiedBumps ?? 0) > 0 && (
              <Link href="/admin/bumps?verified=no" className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm hover:shadow-sm">
                <span className="h-2 w-2 rounded-full bg-bumpr-orange" />
                <span className="text-volcanic">{unverifiedBumps} unverified bump{(unverifiedBumps ?? 0) > 1 ? "s" : ""}</span>
              </Link>
            )}
            {(staleIcal ?? 0) > 0 && (
              <Link href="/admin/villas?ical=error" className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm hover:shadow-sm">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-volcanic">{staleIcal} stale iCal feed{(staleIcal ?? 0) > 1 ? "s" : ""}</span>
              </Link>
            )}
            {(failedNotifications ?? 0) > 0 && (
              <Link href="/admin/notifications?status=failed" className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm hover:shadow-sm">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-volcanic">{failedNotifications} failed notification{(failedNotifications ?? 0) > 1 ? "s" : ""}</span>
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Bookings */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-semibold text-volcanic">Recent Bookings</h2>
            <Link href="/admin/bookings" className="text-sm text-bumpr-orange hover:underline">View all</Link>
          </div>
          <div className="rounded-2xl shadow-[0_2px_16px_rgba(26,26,26,0.06)] bg-white overflow-hidden">
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
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/bookings/${b.id}`} className="text-volcanic hover:text-bumpr-orange">
                        {villaMap.get(b.villa_id) ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-warm-gray-dark">{renterMap.get(b.renter_id) ?? "—"}</td>
                    <td className="px-4 py-2.5 text-warm-gray-dark font-mono text-xs">{b.check_in} &rarr; {b.check_out}</td>
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
          <div className="rounded-2xl shadow-[0_2px_16px_rgba(26,26,26,0.06)] bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-cream-dark text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium text-warm-gray-dark">Villa</th>
                  <th className="px-4 py-2.5 font-medium text-warm-gray-dark">Platform</th>
                  <th className="px-4 py-2.5 font-medium text-warm-gray-dark">Verified</th>
                  <th className="px-4 py-2.5 font-medium text-warm-gray-dark">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-gray-light">
                {(recentBumps ?? []).map((b: { id: string; villa_id: string; external_platform: string | null; ical_verified: boolean; status: string }) => (
                  <tr key={b.id} className={`hover:bg-cream-dark/50 ${!b.ical_verified && b.status === "active" ? "bg-bumpr-orange/5" : ""}`}>
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/bumps/${b.id}`} className="text-volcanic hover:text-bumpr-orange">
                        {villaMap.get(b.villa_id) ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 capitalize text-volcanic/60 text-xs">{b.external_platform ?? "—"}</td>
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

      {/* Exchange Rates */}
      {(exchangeRates ?? []).length > 0 && (
        <div className="mt-8">
          <h2 className="font-serif text-xl font-semibold text-volcanic mb-4">Exchange Rates</h2>
          <div className="rounded-2xl shadow-[0_2px_16px_rgba(26,26,26,0.06)] bg-white p-5">
            <div className="flex flex-wrap gap-4">
              {(exchangeRates ?? []).map((r: { currency_code: string; rate_from_idr: number; fetched_at: string }) => (
                <div key={r.currency_code} className="text-sm">
                  <span className="font-mono font-medium text-volcanic">{r.currency_code}</span>
                  <span className="text-warm-gray-dark ml-2">{Number(r.rate_from_idr).toFixed(6)}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-warm-gray">
              Last updated: {(exchangeRates as { fetched_at: string }[])?.[0]?.fetched_at
                ? new Date((exchangeRates as { fetched_at: string }[])[0].fetched_at).toLocaleString()
                : "—"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
