import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth/get-user-role";
import { createAdminClient } from "@/lib/supabase/admin";
import MetricCard from "@/components/admin/MetricCard";
import VillaOwnerCard from "@/components/owner/VillaOwnerCard";
import ActivityItem from "@/components/owner/ActivityItem";
import { formatIdr } from "@/lib/utils/currency";
import type { Database } from "@/lib/supabase/types";

type Villa = Database["public"]["Tables"]["villas"]["Row"];
type VillaPhoto = Database["public"]["Tables"]["villa_photos"]["Row"];

export default async function DashboardPage() {
  const result = await getUserRole();
  if (!result || result.role !== "owner") redirect("/login");

  const supabase = createAdminClient();
  const ownerId = result.userId;

  // Get owner's villas
  const { data: villas } = await supabase
    .from("villas")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .returns<Villa[]>();

  const villaIds = (villas ?? []).map((v) => v.id);

  // Stats
  const { count: activeBookings } = villaIds.length > 0
    ? await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .in("villa_id", villaIds)
        .in("status", ["confirmed", "active"])
    : { count: 0 };

  const { data: payoutData } = await supabase
    .from("payouts")
    .select("amount_idr")
    .eq("owner_id", ownerId)
    .eq("status", "completed");

  const totalEarnings = (payoutData ?? []).reduce(
    (sum: number, p: { amount_idr: number }) => sum + p.amount_idr,
    0
  );

  const { count: totalBumps } = villaIds.length > 0
    ? await supabase
        .from("bumps")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", ownerId)
    : { count: 0 };

  // Hero photos per villa
  const { data: photos } = villaIds.length > 0
    ? await supabase
        .from("villa_photos")
        .select("villa_id, url")
        .in("villa_id", villaIds)
        .eq("sort_order", 0)
        .returns<Pick<VillaPhoto, "villa_id" | "url">[]>()
    : { data: [] };
  const photoMap = new Map((photos ?? []).map((p) => [p.villa_id, p.url]));

  // Active booking status per villa
  const { data: activeBookingRows } = villaIds.length > 0
    ? await supabase
        .from("bookings")
        .select("villa_id, status")
        .in("villa_id", villaIds)
        .in("status", ["confirmed", "active", "bumped"])
    : { data: [] };

  const villaStatusMap = new Map<string, "guest_staying" | "bump_in_progress" | "no_guest">();
  for (const b of activeBookingRows ?? []) {
    const row = b as { villa_id: string; status: string };
    if (row.status === "bumped") {
      villaStatusMap.set(row.villa_id, "bump_in_progress");
    } else if (!villaStatusMap.has(row.villa_id) || villaStatusMap.get(row.villa_id) === "no_guest") {
      villaStatusMap.set(row.villa_id, "guest_staying");
    }
  }

  // Recent activity
  const { data: recentBookings } = villaIds.length > 0
    ? await supabase
        .from("bookings")
        .select("id, villa_id, renter_id, check_in, check_out, status, created_at")
        .in("villa_id", villaIds)
        .order("created_at", { ascending: false })
        .limit(5)
    : { data: [] };

  const renterIds = [...new Set((recentBookings ?? []).map((b: { renter_id: string }) => b.renter_id))];
  const { data: renters } = renterIds.length > 0
    ? await supabase.from("profiles").select("id, full_name").in("id", renterIds)
    : { data: [] };
  const renterMap = new Map((renters ?? []).map((r: { id: string; full_name: string }) => [r.id, r.full_name]));
  const villaNameMap = new Map((villas ?? []).map((v) => [v.id, v.title]));

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto md:max-w-none">
      <h1 className="font-serif text-3xl font-bold text-volcanic mb-6">
        Dashboard
      </h1>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <MetricCard label="Active Bookings" value={activeBookings ?? 0} />
        <MetricCard label="Total Earned" value={formatIdr(totalEarnings)} />
        <MetricCard label="Total Bumps" value={totalBumps ?? 0} />
      </div>

      {/* My Villas */}
      <h2 className="font-serif text-xl font-semibold text-volcanic mb-4">
        My Villas
      </h2>
      {(villas ?? []).length === 0 ? (
        <div className="rounded-xl bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-8 text-center text-warm-gray">
          No villas assigned yet. Contact Bumpr to get started.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {(villas ?? []).map((v) => (
            <VillaOwnerCard
              key={v.id}
              id={v.id}
              title={v.title}
              area={v.area}
              standbyRateIdr={v.standby_rate_idr}
              heroPhotoUrl={photoMap.get(v.id) ?? null}
              icalSyncStatus={v.ical_sync_status}
              activeBookingStatus={villaStatusMap.get(v.id) ?? "no_guest"}
            />
          ))}
        </div>
      )}

      {/* Recent Activity */}
      <h2 className="font-serif text-xl font-semibold text-volcanic mb-4">
        Recent Activity
      </h2>
      <div className="rounded-xl bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] divide-y divide-warm-gray-light">
        {(recentBookings ?? []).length === 0 ? (
          <div className="p-6 text-center text-warm-gray text-sm">
            No activity yet
          </div>
        ) : (
          <div className="px-4">
            {(recentBookings ?? []).map((b: {
              id: string;
              villa_id: string;
              renter_id: string;
              check_in: string;
              check_out: string;
              status: string;
              created_at: string;
            }) => {
              const renterName = renterMap.get(b.renter_id) ?? "A renter";
              const villaName = villaNameMap.get(b.villa_id) ?? "your villa";
              let icon = "📋";
              let text = `${renterName} booked ${villaName} (${b.check_in} → ${b.check_out})`;
              if (b.status === "bumped") {
                icon = "⚡";
                text = `${renterName} was bumped from ${villaName}`;
              } else if (b.status === "completed") {
                icon = "✓";
                text = `Booking completed at ${villaName}`;
              } else if (b.status === "cancelled" || b.status === "expired") {
                icon = "✗";
                text = `Booking ${b.status} for ${villaName}`;
              }
              return (
                <ActivityItem
                  key={b.id}
                  icon={icon}
                  text={text}
                  time={new Date(b.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
