import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth/get-user-role";
import { createAdminClient } from "@/lib/supabase/admin";
import StatusBadge from "@/components/admin/StatusBadge";
import VillaManageClient from "@/components/owner/VillaManageClient";
import { formatIdr } from "@/lib/utils/currency";
import type { Database } from "@/lib/supabase/types";
import Link from "next/link";

type Villa = Database["public"]["Tables"]["villas"]["Row"];
type VillaPhoto = Database["public"]["Tables"]["villa_photos"]["Row"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"];

export default async function VillaManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: villaId } = await params;
  const result = await getUserRole();
  if (!result) redirect("/login");

  const supabase = createAdminClient();

  const { data: villa } = await supabase
    .from("villas")
    .select("*")
    .eq("id", villaId)
    .single<Villa>();

  if (!villa || villa.owner_id !== result.userId) redirect("/dashboard");

  // Hero photo
  const { data: photos } = await supabase
    .from("villa_photos")
    .select("url")
    .eq("villa_id", villaId)
    .eq("sort_order", 0)
    .limit(1)
    .returns<Pick<VillaPhoto, "url">[]>();

  const heroUrl = photos?.[0]?.url ?? null;

  // Current and upcoming bookings
  const today = new Date().toISOString().split("T")[0];
  const { data: activeBookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("villa_id", villaId)
    .in("status", ["confirmed", "active", "bumped"])
    .order("check_in", { ascending: true })
    .returns<Booking[]>();

  // Past bookings
  const { data: pastBookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("villa_id", villaId)
    .in("status", ["completed", "cancelled"])
    .order("check_out", { ascending: false })
    .limit(10)
    .returns<Booking[]>();

  // External availability for calendar
  const { data: externalAvail } = await supabase
    .from("external_availability")
    .select("blocked_start, blocked_end, source")
    .eq("villa_id", villaId);

  // All Bumpr bookings for calendar
  const { data: allBookings } = await supabase
    .from("bookings")
    .select("check_in, check_out, status")
    .eq("villa_id", villaId)
    .in("status", ["confirmed", "active", "bumped"]);

  // Renter names
  const renterIds = [...new Set(
    [...(activeBookings ?? []), ...(pastBookings ?? [])].map((b) => b.renter_id)
  )];
  const { data: renters } = renterIds.length > 0
    ? await supabase.from("profiles").select("id, full_name").in("id", renterIds)
    : { data: [] };
  const renterMap = Object.fromEntries(
    (renters ?? []).map((r: { id: string; full_name: string }) => [r.id, r.full_name])
  );

  // Build calendar day data
  const calendarDays: { date: string; type: string; label?: string }[] = [];

  for (const b of allBookings ?? []) {
    const bk = b as { check_in: string; check_out: string; status: string };
    const start = new Date(bk.check_in);
    const end = new Date(bk.check_out);
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().split("T")[0];
      calendarDays.push({
        date: ds,
        type: bk.status === "bumped" ? "bump_active" : "bumpr",
        label: bk.status,
      });
    }
  }

  for (const ea of externalAvail ?? []) {
    const ext = ea as { blocked_start: string; blocked_end: string; source: string };
    const start = new Date(ext.blocked_start);
    const end = new Date(ext.blocked_end);
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().split("T")[0];
      // Don't overwrite Bumpr bookings
      if (!calendarDays.some((cd) => cd.date === ds)) {
        calendarDays.push({ date: ds, type: "external", label: ext.source });
      }
    }
  }

  const now = new Date();

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto md:max-w-none">
      {/* Villa header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="h-20 w-20 rounded-xl bg-volcanic/5 overflow-hidden shrink-0">
          {heroUrl ? (
            <img src={heroUrl} alt={villa.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-volcanic/20 text-2xl">⌂</div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-bold text-teal">{villa.title}</h1>
            <StatusBadge status={villa.status} />
          </div>
          <p className="text-sm text-volcanic/50 capitalize">{villa.area}</p>
          <p className="font-mono text-sm text-volcanic/70 mt-1">
            {formatIdr(villa.standby_rate_idr)} / night
          </p>
          {villa.ical_last_synced_at && (
            <p className="text-xs text-volcanic/40 mt-1">
              iCal synced {new Date(villa.ical_last_synced_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Calendar + bookings */}
      <VillaManageClient
        villaId={villaId}
        villaBumpNoticeHours={villa.bump_notice_hours}
        calendarDays={calendarDays}
        activeBookings={(activeBookings ?? []).map((b) => ({
          id: b.id,
          renterName: renterMap[b.renter_id] ?? "Guest",
          checkIn: b.check_in,
          checkOut: b.check_out,
          status: b.status,
          protectionEndsAt: b.protection_ends_at,
          checkedInAt: b.checked_in_at,
        }))}
        pastBookings={(pastBookings ?? []).map((b) => ({
          id: b.id,
          renterName: renterMap[b.renter_id] ?? "Guest",
          checkIn: b.check_in,
          checkOut: b.check_out,
          status: b.status,
          nightlyRateIdr: b.nightly_rate_idr,
          nights: b.nights,
        }))}
        initialYear={now.getFullYear()}
        initialMonth={now.getMonth()}
      />
    </div>
  );
}
