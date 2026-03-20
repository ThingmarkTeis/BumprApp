import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth/get-user-role";
import { createAdminClient } from "@/lib/supabase/admin";
import BumpFlow from "@/components/owner/BumpFlow";
import type { Database } from "@/lib/supabase/types";

type Villa = Database["public"]["Tables"]["villas"]["Row"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"];

export default async function BumpPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id: villaId } = await params;
  const sp = await searchParams;
  const preselectedBookingId = sp.booking;

  const result = await getUserRole();
  if (!result) redirect("/login");

  const supabase = createAdminClient();

  const { data: villa } = await supabase
    .from("villas")
    .select("*")
    .eq("id", villaId)
    .single<Villa>();

  if (!villa || villa.owner_id !== result.userId) redirect("/dashboard");

  // Get bumpable bookings (active + past protection)
  const now = new Date().toISOString();
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("villa_id", villaId)
    .eq("status", "active")
    .lt("protection_ends_at", now)
    .returns<Booking[]>();

  // Resolve renter names
  const renterIds = (bookings ?? []).map((b) => b.renter_id);
  const { data: renters } = renterIds.length > 0
    ? await supabase.from("profiles").select("id, full_name").in("id", renterIds)
    : { data: [] };
  const renterMap = Object.fromEntries(
    (renters ?? []).map((r: { id: string; full_name: string }) => [r.id, r.full_name])
  );

  const bumpableBookings = (bookings ?? []).map((b) => ({
    id: b.id,
    renterName: renterMap[b.renter_id] ?? "Guest",
    checkIn: b.check_in,
    checkOut: b.check_out,
    checkedInAt: b.checked_in_at,
  }));

  return (
    <div className="px-6 py-8 max-w-lg mx-auto">
      <BumpFlow
        villaId={villaId}
        villaName={villa.title}
        bumpNoticeHours={villa.bump_notice_hours}
        bumpableBookings={bumpableBookings}
        preselectedBookingId={preselectedBookingId}
      />
    </div>
  );
}
