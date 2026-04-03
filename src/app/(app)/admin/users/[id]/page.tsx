import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import StatusBadge from "@/components/admin/StatusBadge";
import AdminUserActions from "@/components/admin/AdminUserActions";
import AdminProfileEditor from "@/components/admin/AdminProfileEditor";
import { formatIdr } from "@/lib/utils/currency";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (!profile) notFound();

  const p = profile as Record<string, unknown>;

  const [{ data: ownerProfile }, { data: bookings }, { data: bumps }, { data: villas }] = await Promise.all([
    supabase.from("owner_profiles").select("*").eq("id", id).single(),
    supabase.from("bookings").select("id, villa_id, check_in, check_out, nights, total_charged_idr, status, created_at").eq("renter_id", id).order("created_at", { ascending: false }).limit(20),
    supabase.from("bumps").select("id, villa_id, status, triggered_at, renter_response").or(`renter_id.eq.${id},owner_id.eq.${id}`).order("created_at", { ascending: false }).limit(10),
    supabase.from("villas").select("id, title, area, status").eq("owner_id", id).order("created_at", { ascending: false }),
  ]);

  const isOwner = !!ownerProfile;
  const isAdmin = p.is_admin as boolean;

  // Resolve villa names for bookings
  const villaIds = [...new Set([
    ...(bookings ?? []).map((b: { villa_id: string }) => b.villa_id),
    ...(bumps ?? []).map((b: { villa_id: string }) => b.villa_id),
  ])];
  const { data: villaNames } = villaIds.length > 0
    ? await supabase.from("villas").select("id, title").in("id", villaIds)
    : { data: [] };
  const villaMap = new Map((villaNames ?? []).map((v: { id: string; title: string }) => [v.id, v.title]));

  function getRole(): string {
    if (isAdmin) return "admin";
    if (isOwner) return "owner";
    return "renter";
  }

  return (
    <div className="px-6 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/users" className="text-warm-gray-dark hover:text-volcanic text-sm">&larr; Users</Link>
        <span className="text-warm-gray-light">/</span>
        <h1 className="font-serif text-2xl font-bold text-volcanic">{(p.full_name as string) || "Unnamed User"}</h1>
        <StatusBadge status={getRole()} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5">
          <h3 className="font-serif text-lg font-semibold text-volcanic mb-4">Profile</h3>
          <dl className="space-y-2 text-sm">
            <Row label="ID" value={<span className="font-mono text-xs">{id}</span>} />
            <Row label="Name" value={(p.full_name as string) || "—"} />
            <Row label="Email" value={(p.email as string) || "—"} />
            <Row label="Phone" value={(p.phone as string) || "—"} />
            <Row label="Currency" value={(p.preferred_currency as string) || "—"} />
            <Row label="Language" value={(p.language as string) || "—"} />
            <Row label="Status" value={<StatusBadge status={(p.status as string) ?? "active"} />} />
            <Row label="Joined" value={new Date(p.created_at as string).toLocaleDateString()} />
            {p.deleted_at ? <Row label="Deleted" value={new Date(p.deleted_at as string).toLocaleString()} /> : null}
          </dl>
        </div>

        {isOwner && ownerProfile && (
          <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5">
            <h3 className="font-serif text-lg font-semibold text-volcanic mb-4">Owner Profile</h3>
            <dl className="space-y-2 text-sm">
              <Row label="Business Name" value={(ownerProfile as { business_name: string | null }).business_name ?? "—"} />
              <Row label="Bank" value={(ownerProfile as { bank_name: string | null }).bank_name ?? "—"} />
              <Row label="Account Holder" value={(ownerProfile as { bank_account_holder: string | null }).bank_account_holder ?? "—"} />
              <Row label="ID Type" value={(ownerProfile as { id_type: string | null }).id_type ?? "—"} />
              <Row label="Verified" value={<StatusBadge status={(ownerProfile as { verified: boolean }).verified ? "yes" : "no"} />} />
            </dl>
          </div>
        )}
      </div>

      {/* Edit Profile */}
      <div className="mb-8">
        <AdminProfileEditor
          userId={id}
          profile={{
            full_name: (p.full_name as string) || "",
            email: (p.email as string) || "",
            phone: (p.phone as string) || "",
            preferred_currency: (p.preferred_currency as string) || "USD",
            language: (p.language as string) || "en",
          }}
          ownerProfile={isOwner ? {
            business_name: (ownerProfile as { business_name: string | null }).business_name ?? "",
            bank_name: (ownerProfile as { bank_name: string | null }).bank_name ?? "",
            bank_account_number: (ownerProfile as { bank_account_number: string | null }).bank_account_number ?? "",
            bank_account_holder: (ownerProfile as { bank_account_holder: string | null }).bank_account_holder ?? "",
            id_type: (ownerProfile as { id_type: string | null }).id_type ?? "",
            id_number: (ownerProfile as { id_number: string | null }).id_number ?? "",
          } : null}
        />
      </div>

      {/* Actions */}
      <div className="mb-8">
        <AdminUserActions
          userId={id}
          isAdmin={isAdmin}
          isOwner={isOwner}
          isVerified={(ownerProfile as { verified: boolean } | null)?.verified ?? false}
        />
      </div>

      {/* Owned Villas */}
      {isOwner && (villas ?? []).length > 0 && (
        <div className="mb-8">
          <h3 className="font-serif text-lg font-semibold text-volcanic mb-4">Owned Villas</h3>
          <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-cream-dark text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium text-warm-gray-dark">Title</th>
                  <th className="px-4 py-2.5 font-medium text-warm-gray-dark">Area</th>
                  <th className="px-4 py-2.5 font-medium text-warm-gray-dark">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-gray-light">
                {(villas ?? []).map((v: { id: string; title: string; area: string; status: string }) => (
                  <tr key={v.id} className="hover:bg-cream-dark/50">
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/villas/${v.id}/edit`} className="text-bumpr-orange hover:underline">{v.title}</Link>
                    </td>
                    <td className="px-4 py-2.5 capitalize text-warm-gray-dark">{v.area}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={v.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bookings */}
      <div className="mb-8">
        <h3 className="font-serif text-lg font-semibold text-volcanic mb-4">Bookings ({(bookings ?? []).length})</h3>
        <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-cream-dark text-left">
              <tr>
                <th className="px-4 py-2.5 font-medium text-warm-gray-dark">Villa</th>
                <th className="px-4 py-2.5 font-medium text-warm-gray-dark">Dates</th>
                <th className="px-4 py-2.5 font-medium text-warm-gray-dark">Amount</th>
                <th className="px-4 py-2.5 font-medium text-warm-gray-dark">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-gray-light">
              {(bookings ?? []).map((b: { id: string; villa_id: string; check_in: string; check_out: string; total_charged_idr: number; status: string }) => (
                <tr key={b.id} className="hover:bg-cream-dark/50">
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/bookings/${b.id}`} className="text-bumpr-orange hover:underline">
                      {villaMap.get(b.villa_id) ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{b.check_in} &rarr; {b.check_out}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{formatIdr(Number(b.total_charged_idr))}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={b.status} /></td>
                </tr>
              ))}
              {(bookings ?? []).length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-warm-gray">No bookings</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bumps */}
      {(bumps ?? []).length > 0 && (
        <div>
          <h3 className="font-serif text-lg font-semibold text-volcanic mb-4">Bumps ({(bumps ?? []).length})</h3>
          <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-cream-dark text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium text-warm-gray-dark">Villa</th>
                  <th className="px-4 py-2.5 font-medium text-warm-gray-dark">Triggered</th>
                  <th className="px-4 py-2.5 font-medium text-warm-gray-dark">Response</th>
                  <th className="px-4 py-2.5 font-medium text-warm-gray-dark">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-gray-light">
                {(bumps ?? []).map((b: { id: string; villa_id: string; triggered_at: string; renter_response: string | null; status: string }) => (
                  <tr key={b.id} className="hover:bg-cream-dark/50">
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/bumps/${b.id}`} className="text-bumpr-orange hover:underline">
                        {villaMap.get(b.villa_id) ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-xs">{new Date(b.triggered_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 capitalize text-xs">{b.renter_response ?? "—"}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <dt className="text-warm-gray-dark shrink-0">{label}</dt>
      <dd className="text-volcanic text-right">{value}</dd>
    </div>
  );
}
