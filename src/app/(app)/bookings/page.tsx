import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth/get-user-role";
import { createAdminClient } from "@/lib/supabase/admin";
import StatusBadge from "@/components/admin/StatusBadge";
import Link from "next/link";
import type { Database } from "@/lib/supabase/types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];

export default async function BookingsPage() {
  const result = await getUserRole();
  if (!result) redirect("/login");

  const supabase = createAdminClient();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("renter_id", result.userId)
    .order("created_at", { ascending: false })
    .returns<Booking[]>();

  // Resolve villa names and photos
  const villaIds = [...new Set((bookings ?? []).map((b) => b.villa_id))];
  const { data: villas } = villaIds.length > 0
    ? await supabase.from("villas").select("id, title, area").in("id", villaIds)
    : { data: [] };
  const villaMap = new Map(
    (villas ?? []).map((v: { id: string; title: string; area: string }) => [v.id, v])
  );

  const { data: photos } = villaIds.length > 0
    ? await supabase.from("villa_photos").select("villa_id, url").in("villa_id", villaIds).eq("sort_order", 0)
    : { data: [] };
  const photoMap = new Map(
    (photos ?? []).map((p: { villa_id: string; url: string }) => [p.villa_id, p.url])
  );

  const active = (bookings ?? []).filter((b) =>
    ["confirmed", "active", "bumped"].includes(b.status)
  );
  const upcoming = (bookings ?? []).filter((b) =>
    ["requested", "approved"].includes(b.status)
  );
  const past = (bookings ?? []).filter((b) =>
    ["completed", "cancelled", "expired", "pre_checkin_cancelled"].includes(b.status)
  );

  function renderBooking(b: Booking) {
    const villa = villaMap.get(b.villa_id) as { title: string; area: string } | undefined;
    const heroUrl = photoMap.get(b.villa_id);
    const href = b.status === "bumped" ? `/booking/${b.id}/bumped` : `/booking/${b.id}`;

    return (
      <Link
        key={b.id}
        href={href}
        className="flex items-center gap-4 rounded-[16px] bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-4 hover:shadow-md transition-shadow"
      >
        <div className="h-16 w-16 rounded-xl bg-volcanic/5 overflow-hidden shrink-0">
          {heroUrl ? (
            <img src={heroUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-warm-gray-light text-xl">⌂</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-serif font-semibold text-volcanic truncate">
            {villa?.title ?? "Villa"}
          </h3>
          <p className="text-xs text-warm-gray-dark capitalize">{villa?.area}</p>
          <p className="text-xs text-warm-gray-dark font-mono mt-1">
            {b.check_in} → {b.check_out}
          </p>
        </div>
        <StatusBadge status={b.status} />
      </Link>
    );
  }

  if ((bookings ?? []).length === 0) {
    return (
      <div className="px-6 py-12 text-center max-w-sm mx-auto">
        <div className="text-5xl mb-4">🏝</div>
        <h1 className="font-serif text-2xl font-bold text-volcanic mb-2">
          No bookings yet
        </h1>
        <p className="text-warm-gray-dark mb-6">
          Find your first standby villa and start living the Bali dream.
        </p>
        <Link
          href="/browse"
          className="inline-block rounded-lg bg-bumpr-orange px-6 py-2.5 text-sm font-semibold text-white"
        >
          Browse villas
        </Link>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 max-w-lg mx-auto md:max-w-none">
      <h1 className="font-serif text-3xl font-bold text-volcanic mb-6">
        My Bookings
      </h1>

      {/* Active */}
      {active.length > 0 && (
        <section className="mb-8">
          <h2 className="font-serif text-lg font-semibold text-volcanic mb-3">
            Active
          </h2>
          <div className="space-y-3">{active.map(renderBooking)}</div>
        </section>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section className="mb-8">
          <h2 className="font-serif text-lg font-semibold text-volcanic mb-3">
            Upcoming
          </h2>
          <div className="space-y-3">{upcoming.map(renderBooking)}</div>
        </section>
      )}

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="font-serif text-lg font-semibold text-warm-gray-dark mb-3">
            Past
          </h2>
          <div className="space-y-2">{past.map(renderBooking)}</div>
        </section>
      )}
    </div>
  );
}
