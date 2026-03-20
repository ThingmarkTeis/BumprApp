import { createAdminClient } from "@/lib/supabase/admin";
import StatusBadge from "@/components/admin/StatusBadge";
import FilterBar from "@/components/admin/FilterBar";
import Pagination from "@/components/admin/Pagination";
import AdminBumpActions from "@/components/admin/AdminBumpActions";
import { formatDeadline } from "@/lib/utils/dates";

const PER_PAGE = 20;

export default async function AdminBumpsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const statusFilter = sp.status;
  const verifiedFilter = sp.verified;
  const supabase = createAdminClient();

  let query = supabase.from("bumps").select("*", { count: "exact" });

  if (statusFilter) query = query.eq("status", statusFilter as "active" | "resolved" | "admin_review");
  if (verifiedFilter === "yes") query = query.eq("ical_verified", true);
  if (verifiedFilter === "no") query = query.eq("ical_verified", false);

  const { data: bumps, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

  const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

  // Resolve names
  const villaIds = [...new Set((bumps ?? []).map((b: { villa_id: string }) => b.villa_id))];
  const renterIds = [...new Set((bumps ?? []).map((b: { renter_id: string }) => b.renter_id))];

  const { data: villas } = villaIds.length > 0
    ? await supabase.from("villas").select("id, title").in("id", villaIds)
    : { data: [] };
  const { data: renters } = renterIds.length > 0
    ? await supabase.from("profiles").select("id, full_name").in("id", renterIds)
    : { data: [] };

  const villaMap = new Map((villas ?? []).map((v: { id: string; title: string }) => [v.id, v.title]));
  const renterMap = new Map((renters ?? []).map((r: { id: string; full_name: string }) => [r.id, r.full_name]));

  return (
    <div className="px-6 py-8">
      <h1 className="font-serif text-3xl font-bold text-teal mb-6">Bumps</h1>

      <div className="mb-4">
        <FilterBar
          filters={[
            {
              key: "status",
              label: "Status",
              options: [
                { label: "Active", value: "active" },
                { label: "Resolved", value: "resolved" },
                { label: "Admin Review", value: "admin_review" },
              ],
            },
            {
              key: "verified",
              label: "Verified",
              options: [
                { label: "Verified", value: "yes" },
                { label: "Unverified", value: "no" },
              ],
            },
          ]}
        />
      </div>

      <div className="rounded-xl border border-volcanic/10 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-teal/5 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-volcanic/70">Villa</th>
              <th className="px-4 py-3 font-medium text-volcanic/70">Renter</th>
              <th className="px-4 py-3 font-medium text-volcanic/70">Triggered</th>
              <th className="px-4 py-3 font-medium text-volcanic/70">Platform</th>
              <th className="px-4 py-3 font-medium text-volcanic/70">Deadline</th>
              <th className="px-4 py-3 font-medium text-volcanic/70">Verified</th>
              <th className="px-4 py-3 font-medium text-volcanic/70">Response</th>
              <th className="px-4 py-3 font-medium text-volcanic/70">Status</th>
              <th className="px-4 py-3 font-medium text-volcanic/70">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-volcanic/5">
            {(bumps ?? []).map((b: {
              id: string;
              villa_id: string;
              renter_id: string;
              triggered_at: string;
              external_platform: string | null;
              deadline: string;
              ical_verified: boolean;
              renter_response: string | null;
              status: string;
              admin_notes: string | null;
            }) => (
              <tr
                key={b.id}
                className={`hover:bg-cream/50 ${
                  !b.ical_verified && b.status === "active" ? "bg-amber/5" : ""
                }`}
              >
                <td className="px-4 py-3 text-volcanic">{villaMap.get(b.villa_id) ?? "—"}</td>
                <td className="px-4 py-3 text-volcanic/70">{renterMap.get(b.renter_id) ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">{formatDeadline(b.triggered_at)}</td>
                <td className="px-4 py-3 capitalize text-volcanic/60">{b.external_platform ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">{formatDeadline(b.deadline)}</td>
                <td className="px-4 py-3"><StatusBadge status={b.ical_verified ? "yes" : "no"} /></td>
                <td className="px-4 py-3 text-volcanic/60 text-xs capitalize">{b.renter_response ?? "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                <td className="px-4 py-3">
                  <AdminBumpActions bumpId={b.id} status={b.status} />
                </td>
              </tr>
            ))}
            {(bumps ?? []).length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-volcanic/40">No bumps found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} />
    </div>
  );
}
