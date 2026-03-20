import { createAdminClient } from "@/lib/supabase/admin";
import StatusBadge from "@/components/admin/StatusBadge";
import FilterBar from "@/components/admin/FilterBar";
import Pagination from "@/components/admin/Pagination";
import { formatIdr } from "@/lib/utils/currency";
import Link from "next/link";

// Force dynamic rendering — no caching
export const dynamic = "force-dynamic";

const PER_PAGE = 20;

export default async function AdminVillasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const statusFilter = sp.status;
  const areaFilter = sp.area;
  const icalFilter = sp.ical;
  const search = sp.q;

  const supabase = createAdminClient();

  let query = supabase
    .from("villas")
    .select("*", { count: "exact" });

  if (statusFilter) query = query.eq("status", statusFilter as "draft" | "active" | "paused" | "delisted");
  if (areaFilter) query = query.eq("area", areaFilter);
  if (icalFilter) query = query.eq("ical_sync_status", icalFilter as "ok" | "pending" | "error");
  if (search) query = query.ilike("title", `%${search}%`);

  const { data: villas, count, error: villasError } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

  console.log("=== ADMIN VILLAS DEBUG ===");
  console.log("Villas count:", count);
  console.log("Villas data:", JSON.stringify(villas?.map((v: { id: string; title: string; status: string }) => ({ id: v.id, title: v.title, status: v.status }))));
  console.log("Error:", villasError);
  console.log("Filters:", { statusFilter, areaFilter, icalFilter, search, page });

  const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

  // Get booking counts per villa
  const villaIds = (villas ?? []).map((v: { id: string }) => v.id);
  const bookingCounts = new Map<string, number>();

  if (villaIds.length > 0) {
    const { data: counts } = await supabase
      .from("bookings")
      .select("villa_id")
      .in("villa_id", villaIds)
      .in("status", ["confirmed", "active"]);

    for (const row of counts ?? []) {
      const vid = (row as { villa_id: string }).villa_id;
      bookingCounts.set(vid, (bookingCounts.get(vid) ?? 0) + 1);
    }
  }

  // Get owner names
  const ownerIds = [...new Set((villas ?? []).map((v: { owner_id: string }) => v.owner_id))];
  const { data: owners } = ownerIds.length > 0
    ? await supabase.from("profiles").select("id, full_name").in("id", ownerIds)
    : { data: [] };
  const ownerMap = new Map((owners ?? []).map((o: { id: string; full_name: string }) => [o.id, o.full_name]));

  return (
    <div className="px-6 py-8">
      {/* DEBUG — remove after fixing */}
      <div className="mb-4 p-3 bg-yellow-100 rounded text-xs font-mono">
        Villas found: {(villas ?? []).length} | Count: {count ?? "null"} | Error: {villasError?.message ?? "none"}
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl font-bold text-volcanic">Villas</h1>
        <Link
          href="/admin/villas/new"
          className="rounded-lg bg-bumpr-orange px-4 py-2 text-sm font-medium text-white hover:bg-bumpr-orange-dark"
        >
          + Create Villa
        </Link>
      </div>

      <div className="mb-4">
        <FilterBar
          filters={[
            {
              key: "status",
              label: "Status",
              options: [
                { label: "Draft", value: "draft" },
                { label: "Active", value: "active" },
                { label: "Paused", value: "paused" },
                { label: "Delisted", value: "delisted" },
              ],
            },
            {
              key: "area",
              label: "Area",
              options: [
                { label: "Canggu", value: "canggu" },
                { label: "Seminyak", value: "seminyak" },
                { label: "Ubud", value: "ubud" },
                { label: "Uluwatu", value: "uluwatu" },
                { label: "Jimbaran", value: "jimbaran" },
                { label: "Sanur", value: "sanur" },
              ],
            },
            {
              key: "ical",
              label: "iCal",
              options: [
                { label: "OK", value: "ok" },
                { label: "Pending", value: "pending" },
                { label: "Error", value: "error" },
              ],
            },
          ]}
          searchKey="q"
          searchPlaceholder="Search villas..."
        />
      </div>

      <div className="rounded-[16px] shadow-[0_2px_16px_rgba(26,26,26,0.06)] bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream-dark text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Title</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Owner</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Area</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Bed</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Rate</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Status</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">iCal</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Book.</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-gray-light">
            {(villas ?? []).map((v: {
              id: string;
              title: string;
              owner_id: string;
              area: string;
              bedrooms: number;
              standby_rate_idr: number;
              status: string;
              ical_sync_status: string;
              ical_url: string | null;
              ical_last_synced_at: string | null;
            }) => (
              <tr key={v.id} className="hover:bg-cream-dark/50">
                <td className="px-4 py-3">
                  <Link href={`/admin/villas/${v.id}/edit`} className="text-bumpr-orange font-medium hover:underline">
                    {v.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-warm-gray-dark">{ownerMap.get(v.owner_id) ?? "—"}</td>
                <td className="px-4 py-3 capitalize text-warm-gray-dark">{v.area}</td>
                <td className="px-4 py-3 text-warm-gray-dark font-mono">{v.bedrooms}</td>
                <td className="px-4 py-3 text-warm-gray-dark font-mono text-xs">{formatIdr(v.standby_rate_idr)}</td>
                <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                <td className="px-4 py-3">
                  {v.ical_url ? (
                    <span title={v.ical_last_synced_at ? `Last: ${new Date(v.ical_last_synced_at).toLocaleString()}` : "Never synced"}>
                      <StatusBadge status={v.ical_sync_status} />
                    </span>
                  ) : (
                    <span className="text-warm-gray text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-warm-gray-dark">{bookingCounts.get(v.id) ?? 0}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/villas/${v.id}/edit`}
                    className="text-xs text-bumpr-orange hover:underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {(villas ?? []).length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-warm-gray">
                  No villas found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} />
    </div>
  );
}
