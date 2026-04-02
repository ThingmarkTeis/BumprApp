import { createAdminClient } from "@/lib/supabase/admin";
import StatusBadge from "@/components/admin/StatusBadge";

export const dynamic = "force-dynamic";

export default async function AdminSystemPage() {
  const supabase = createAdminClient();

  // Table counts
  const [
    { count: profileCount },
    { count: villaCount },
    { count: bookingCount },
    { count: bumpCount },
    { count: paymentCount },
    { count: payoutCount },
    { count: notificationCount },
    { count: conversationCount },
    { count: messageCount },
    { count: savedVillaCount },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("villas").select("*", { count: "exact", head: true }),
    supabase.from("bookings").select("*", { count: "exact", head: true }),
    supabase.from("bumps").select("*", { count: "exact", head: true }),
    supabase.from("payments").select("*", { count: "exact", head: true }),
    supabase.from("payouts").select("*", { count: "exact", head: true }),
    supabase.from("notifications").select("*", { count: "exact", head: true }),
    supabase.from("conversations").select("*", { count: "exact", head: true }),
    supabase.from("messages").select("*", { count: "exact", head: true }),
    supabase.from("saved_villas").select("*", { count: "exact", head: true }),
  ]);

  // Exchange rates
  const { data: exchangeRates } = await supabase
    .from("exchange_rates")
    .select("*")
    .order("currency_code");

  // iCal sync overview
  const [
    { count: icalOk },
    { count: icalPending },
    { count: icalError },
    { count: noIcal },
  ] = await Promise.all([
    supabase.from("villas").select("*", { count: "exact", head: true }).eq("ical_sync_status", "ok").not("ical_url", "is", null),
    supabase.from("villas").select("*", { count: "exact", head: true }).eq("ical_sync_status", "pending").not("ical_url", "is", null),
    supabase.from("villas").select("*", { count: "exact", head: true }).eq("ical_sync_status", "error").not("ical_url", "is", null),
    supabase.from("villas").select("*", { count: "exact", head: true }).is("ical_url", null),
  ]);

  // Error villas
  const { data: errorVillas } = await supabase
    .from("villas")
    .select("id, title, ical_last_synced_at")
    .eq("ical_sync_status", "error")
    .not("ical_url", "is", null)
    .order("ical_last_synced_at", { ascending: true })
    .limit(10);

  // Notification delivery stats
  const [
    { count: notifPending },
    { count: notifSent },
    { count: notifDelivered },
    { count: notifFailed },
  ] = await Promise.all([
    supabase.from("notifications").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("notifications").select("*", { count: "exact", head: true }).eq("status", "sent"),
    supabase.from("notifications").select("*", { count: "exact", head: true }).eq("status", "delivered"),
    supabase.from("notifications").select("*", { count: "exact", head: true }).eq("status", "failed"),
  ]);

  const tableStats = [
    { name: "Profiles", count: profileCount },
    { name: "Villas", count: villaCount },
    { name: "Bookings", count: bookingCount },
    { name: "Bumps", count: bumpCount },
    { name: "Payments", count: paymentCount },
    { name: "Payouts", count: payoutCount },
    { name: "Notifications", count: notificationCount },
    { name: "Conversations", count: conversationCount },
    { name: "Messages", count: messageCount },
    { name: "Saved Villas", count: savedVillaCount },
  ];

  return (
    <div className="px-6 py-8">
      <h1 className="font-serif text-3xl font-bold text-volcanic mb-6">System Health</h1>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Database Stats */}
        <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5">
          <h3 className="font-serif text-lg font-semibold text-volcanic mb-4">Database</h3>
          <div className="space-y-2">
            {tableStats.map((t) => (
              <div key={t.name} className="flex justify-between text-sm">
                <span className="text-warm-gray-dark">{t.name}</span>
                <span className="font-mono font-medium text-volcanic">{t.count ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* iCal Sync */}
        <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5">
          <h3 className="font-serif text-lg font-semibold text-volcanic mb-4">iCal Sync</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-sm">
              <span className="text-warm-gray-dark">OK:</span>{" "}
              <span className="font-mono font-medium text-teal">{icalOk ?? 0}</span>
            </div>
            <div className="text-sm">
              <span className="text-warm-gray-dark">Pending:</span>{" "}
              <span className="font-mono font-medium text-bumpr-orange">{icalPending ?? 0}</span>
            </div>
            <div className="text-sm">
              <span className="text-warm-gray-dark">Error:</span>{" "}
              <span className="font-mono font-medium text-red-500">{icalError ?? 0}</span>
            </div>
            <div className="text-sm">
              <span className="text-warm-gray-dark">No iCal:</span>{" "}
              <span className="font-mono font-medium text-volcanic/50">{noIcal ?? 0}</span>
            </div>
          </div>
          {(errorVillas ?? []).length > 0 && (
            <>
              <h4 className="text-sm font-medium text-volcanic mb-2">Error Villas</h4>
              <div className="space-y-1.5">
                {(errorVillas ?? []).map((v: { id: string; title: string; ical_last_synced_at: string | null }) => (
                  <div key={v.id} className="flex justify-between text-xs">
                    <span className="text-volcanic">{v.title}</span>
                    <span className="text-warm-gray font-mono">
                      {v.ical_last_synced_at ? new Date(v.ical_last_synced_at).toLocaleString() : "Never"}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Exchange Rates */}
        <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5">
          <h3 className="font-serif text-lg font-semibold text-volcanic mb-4">Exchange Rates</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="pb-2 font-medium text-warm-gray-dark">Currency</th>
                <th className="pb-2 font-medium text-warm-gray-dark">Rate (from IDR)</th>
                <th className="pb-2 font-medium text-warm-gray-dark">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-gray-light">
              {(exchangeRates ?? []).map((r: { id: string; currency_code: string; rate_from_idr: number; fetched_at: string }) => (
                <tr key={r.id}>
                  <td className="py-2 font-mono font-medium text-volcanic">{r.currency_code}</td>
                  <td className="py-2 font-mono text-xs text-volcanic/70">{Number(r.rate_from_idr).toFixed(8)}</td>
                  <td className="py-2 text-xs text-warm-gray">{new Date(r.fetched_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Notification Delivery */}
        <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5">
          <h3 className="font-serif text-lg font-semibold text-volcanic mb-4">Notification Delivery</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-warm-gray-dark">Pending</span>
              <span className="flex items-center gap-2">
                <span className="font-mono font-medium">{notifPending ?? 0}</span>
                <StatusBadge status="pending" />
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-warm-gray-dark">Sent</span>
              <span className="flex items-center gap-2">
                <span className="font-mono font-medium">{notifSent ?? 0}</span>
                <StatusBadge status="sent" />
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-warm-gray-dark">Delivered</span>
              <span className="flex items-center gap-2">
                <span className="font-mono font-medium">{notifDelivered ?? 0}</span>
                <StatusBadge status="delivered" />
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-warm-gray-dark">Failed</span>
              <span className="flex items-center gap-2">
                <span className="font-mono font-medium">{notifFailed ?? 0}</span>
                <StatusBadge status="failed" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
