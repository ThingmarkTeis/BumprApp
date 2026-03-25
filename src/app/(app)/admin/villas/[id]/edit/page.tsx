import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import VillaForm from "@/components/admin/VillaForm";
import StatusBadge from "@/components/admin/StatusBadge";
import type { Database } from "@/lib/supabase/types";

type Villa = Database["public"]["Tables"]["villas"]["Row"];
type VillaPhoto = Database["public"]["Tables"]["villa_photos"]["Row"];

export default async function EditVillaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: villa } = await supabase
    .from("villas")
    .select("*")
    .eq("id", id)
    .single<Villa>();

  if (!villa) notFound();

  const { data: photos } = await supabase
    .from("villa_photos")
    .select("*")
    .eq("villa_id", id)
    .order("sort_order", { ascending: true })
    .returns<VillaPhoto[]>();

  const { data: owners } = await supabase
    .from("owner_profiles")
    .select("id, profiles(full_name, email)")
    .order("created_at", { ascending: false });

  const ownerOptions = (owners ?? []).map((o: { id: string; profiles: { full_name: string; email: string } | null }) => ({
    id: o.id,
    name: (o.profiles as { full_name: string } | null)?.full_name ?? "Unknown",
    email: (o.profiles as { email: string } | null)?.email ?? "",
  }));

  // Quick stats
  const [
    { count: bookingCount },
    { count: bumpCount },
  ] = await Promise.all([
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("villa_id", id),
    supabase.from("bumps").select("*", { count: "exact", head: true }).eq("villa_id", id),
  ]);

  return (
    <div className="px-6 py-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="font-serif text-3xl font-bold text-teal">Edit Villa</h1>
        <StatusBadge status={villa.status} />
      </div>

      <div className="flex gap-4 mb-6 text-sm">
        <div className="rounded-lg bg-white border border-volcanic/10 px-4 py-2">
          <span className="text-volcanic/50">Bookings:</span>{" "}
          <span className="font-mono font-medium">{bookingCount ?? 0}</span>
        </div>
        <div className="rounded-lg bg-white border border-volcanic/10 px-4 py-2">
          <span className="text-volcanic/50">Bumps:</span>{" "}
          <span className="font-mono font-medium">{bumpCount ?? 0}</span>
        </div>
        {villa.ical_last_synced_at && (
          <div className="rounded-lg bg-white border border-volcanic/10 px-4 py-2">
            <span className="text-volcanic/50">Last sync:</span>{" "}
            <span className="text-xs">{new Date(villa.ical_last_synced_at).toLocaleString()}</span>
          </div>
        )}
      </div>

      <VillaForm
        owners={ownerOptions}
        initial={{
          id: villa.id,
          title: villa.title,
          description: villa.description ?? "",
          area: villa.area,
          address: villa.address ?? "",
          bedrooms: villa.bedrooms,
          bathrooms: villa.bathrooms ?? undefined,
          max_guests: villa.max_guests,
          standby_rate_idr: villa.standby_rate_idr,
          bump_notice_hours: villa.bump_notice_hours,
          earliest_check_in: villa.earliest_check_in ?? "14:00",
          check_in_by: villa.check_in_by ?? "20:00",
          owner_id: villa.owner_id,
          ical_url: villa.ical_url ?? "",
          status: villa.status,
          amenities: (villa.amenities as string[]) ?? [],
        }}
        photos={(photos ?? []).map((p) => ({
          id: p.id,
          url: p.url,
          sort_order: p.sort_order,
        }))}
      />
    </div>
  );
}
