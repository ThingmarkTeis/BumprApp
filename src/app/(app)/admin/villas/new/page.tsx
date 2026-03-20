import VillaForm from "@/components/admin/VillaForm";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function CreateVillaPage() {
  const supabase = createAdminClient();

  // Get owners for the dropdown
  const { data: owners } = await supabase
    .from("owner_profiles")
    .select("id, profiles(full_name, email)")
    .order("created_at", { ascending: false });

  const ownerOptions = (owners ?? []).map((o: { id: string; profiles: { full_name: string; email: string } | null }) => ({
    id: o.id,
    name: (o.profiles as { full_name: string } | null)?.full_name ?? "Unknown",
    email: (o.profiles as { email: string } | null)?.email ?? "",
  }));

  return (
    <div className="px-6 py-8 max-w-3xl">
      <h1 className="font-serif text-3xl font-bold text-teal mb-6">Create Villa</h1>
      <VillaForm owners={ownerOptions} />
    </div>
  );
}
