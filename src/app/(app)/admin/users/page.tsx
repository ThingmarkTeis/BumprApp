import { createAdminClient } from "@/lib/supabase/admin";
import StatusBadge from "@/components/admin/StatusBadge";
import FilterBar from "@/components/admin/FilterBar";
import Pagination from "@/components/admin/Pagination";
import AdminUserActions from "@/components/admin/AdminUserActions";

const PER_PAGE = 20;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const roleFilter = sp.role;
  const supabase = createAdminClient();

  let query = supabase
    .from("profiles")
    .select("*", { count: "exact" });

  const { data: profiles, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

  // Get owner profiles
  const userIds = (profiles ?? []).map((p: { id: string }) => p.id);
  const { data: ownerProfiles } = userIds.length > 0
    ? await supabase.from("owner_profiles").select("id, verified").in("id", userIds)
    : { data: [] };
  const ownerMap = new Map(
    (ownerProfiles ?? []).map((o: { id: string; verified: boolean }) => [o.id, o.verified])
  );

  // Get booking counts
  const bookingCounts = new Map<string, number>();
  if (userIds.length > 0) {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("renter_id")
      .in("renter_id", userIds);
    for (const b of bookings ?? []) {
      const rid = (b as { renter_id: string }).renter_id;
      bookingCounts.set(rid, (bookingCounts.get(rid) ?? 0) + 1);
    }
  }

  // Apply role filter client-side (simpler than complex joins)
  let filtered = (profiles ?? []) as {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    is_admin: boolean;
    created_at: string;
  }[];

  if (roleFilter === "admins") filtered = filtered.filter((p) => p.is_admin);
  if (roleFilter === "owners") filtered = filtered.filter((p) => ownerMap.has(p.id));
  if (roleFilter === "renters") filtered = filtered.filter((p) => !ownerMap.has(p.id) && !p.is_admin);

  const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

  function getRole(p: { id: string; is_admin: boolean }): string {
    if (p.is_admin) return "admin";
    if (ownerMap.has(p.id)) return "owner";
    return "renter";
  }

  return (
    <div className="px-6 py-8">
      <h1 className="font-serif text-3xl font-bold text-teal mb-6">Users</h1>

      <div className="mb-4">
        <FilterBar
          filters={[
            {
              key: "role",
              label: "Role",
              options: [
                { label: "Renters", value: "renters" },
                { label: "Owners", value: "owners" },
                { label: "Admins", value: "admins" },
              ],
            },
          ]}
        />
      </div>

      <div className="rounded-xl border border-volcanic/10 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-teal/5 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-volcanic/70">Name</th>
              <th className="px-4 py-3 font-medium text-volcanic/70">Email</th>
              <th className="px-4 py-3 font-medium text-volcanic/70">Phone</th>
              <th className="px-4 py-3 font-medium text-volcanic/70">Role</th>
              <th className="px-4 py-3 font-medium text-volcanic/70">Verified</th>
              <th className="px-4 py-3 font-medium text-volcanic/70">Bookings</th>
              <th className="px-4 py-3 font-medium text-volcanic/70">Joined</th>
              <th className="px-4 py-3 font-medium text-volcanic/70">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-volcanic/5">
            {filtered.map((p) => {
              const role = getRole(p);
              const isOwner = ownerMap.has(p.id);
              const verified = ownerMap.get(p.id);
              return (
                <tr key={p.id} className="hover:bg-cream/50">
                  <td className="px-4 py-3 text-volcanic font-medium">{p.full_name}</td>
                  <td className="px-4 py-3 text-volcanic/70">{p.email}</td>
                  <td className="px-4 py-3 text-volcanic/60 font-mono text-xs">{p.phone ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={role} /></td>
                  <td className="px-4 py-3">
                    {isOwner ? (
                      <StatusBadge status={verified ? "yes" : "no"} />
                    ) : (
                      <span className="text-volcanic/30 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono">{bookingCounts.get(p.id) ?? 0}</td>
                  <td className="px-4 py-3 text-xs text-volcanic/50">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <AdminUserActions
                      userId={p.id}
                      isAdmin={p.is_admin}
                      isOwner={isOwner}
                      isVerified={verified ?? false}
                    />
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-volcanic/40">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} />
    </div>
  );
}
