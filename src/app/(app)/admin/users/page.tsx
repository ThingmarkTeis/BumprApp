import { createAdminClient } from "@/lib/supabase/admin";
import StatusBadge from "@/components/admin/StatusBadge";
import FilterBar from "@/components/admin/FilterBar";
import Pagination from "@/components/admin/Pagination";
import AdminUserActions from "@/components/admin/AdminUserActions";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const roleFilter = sp.role;
  const search = sp.q;
  const supabase = createAdminClient();

  // Get owner IDs for server-side role filtering
  let ownerIds: string[] = [];
  if (roleFilter === "owners" || roleFilter === "renters" || !roleFilter) {
    const { data: ownerProfiles } = await supabase.from("owner_profiles").select("id");
    ownerIds = (ownerProfiles ?? []).map((o: { id: string }) => o.id);
  }

  let query = supabase.from("profiles").select("*", { count: "exact" });

  // Server-side role filter
  if (roleFilter === "admins") {
    query = query.eq("is_admin", true);
  } else if (roleFilter === "owners") {
    if (ownerIds.length > 0) {
      query = query.in("id", ownerIds);
    } else {
      query = query.eq("id", "00000000-0000-0000-0000-000000000000"); // no owners
    }
  } else if (roleFilter === "renters") {
    query = query.eq("is_admin", false);
    if (ownerIds.length > 0) {
      query = query.not("id", "in", `(${ownerIds.join(",")})`);
    }
  }

  // Search
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data: profiles, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

  const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

  // Get owner profiles for display
  const userIds = (profiles ?? []).map((p: { id: string }) => p.id);
  const { data: ownerProfilesForDisplay } = userIds.length > 0
    ? await supabase.from("owner_profiles").select("id, verified").in("id", userIds)
    : { data: [] };
  const ownerMap = new Map(
    (ownerProfilesForDisplay ?? []).map((o: { id: string; verified: boolean }) => [o.id, o.verified])
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

  function getRole(p: { id: string; is_admin: boolean }): string {
    if (p.is_admin) return "admin";
    if (ownerMap.has(p.id)) return "owner";
    return "renter";
  }

  return (
    <div className="px-6 py-8">
      <h1 className="font-serif text-3xl font-bold text-volcanic mb-6">Users</h1>

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
          searchKey="q"
          searchPlaceholder="Search name or email..."
        />
      </div>

      <div className="rounded-2xl shadow-[0_2px_16px_rgba(26,26,26,0.06)] bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream-dark text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Name</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Email</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Phone</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Role</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Verified</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Bookings</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Joined</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-gray-light">
            {(profiles ?? []).map((p: {
              id: string;
              full_name: string;
              email: string;
              phone: string | null;
              is_admin: boolean;
              status: string | null;
              deleted_at: string | null;
              created_at: string;
            }) => {
              const role = getRole(p);
              const isOwner = ownerMap.has(p.id);
              const verified = ownerMap.get(p.id);
              return (
                <tr key={p.id} className={`hover:bg-cream-dark/50 ${p.deleted_at ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${p.id}`} className="text-volcanic font-medium hover:text-bumpr-orange">
                      {p.full_name || "—"}
                    </Link>
                    {p.deleted_at && <span className="ml-1 text-xs text-red-500">(deleted)</span>}
                  </td>
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
            {(profiles ?? []).length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-volcanic/40">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} />
    </div>
  );
}
