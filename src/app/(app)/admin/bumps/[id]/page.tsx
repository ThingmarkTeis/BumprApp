import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import StatusBadge from "@/components/admin/StatusBadge";
import AdminBumpActions from "@/components/admin/AdminBumpActions";
import BumpNotesEditor from "@/components/admin/BumpNotesEditor";
import { formatIdr } from "@/lib/utils/currency";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BumpDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: bump } = await supabase
    .from("bumps")
    .select("*")
    .eq("id", id)
    .single();

  if (!bump) notFound();

  const bmp = bump as Record<string, unknown>;

  const [{ data: villa }, { data: renter }, { data: owner }, { data: booking }] = await Promise.all([
    supabase.from("villas").select("id, title, area").eq("id", bmp.villa_id as string).single(),
    supabase.from("profiles").select("id, full_name, email, phone").eq("id", bmp.renter_id as string).single(),
    supabase.from("profiles").select("id, full_name").eq("id", bmp.owner_id as string).single(),
    supabase.from("bookings").select("id, check_in, check_out, nights, total_charged_idr, status").eq("id", bmp.booking_id as string).single(),
  ]);

  // Timeline events
  const timeline: { label: string; time: string | null }[] = [
    { label: "Triggered", time: bmp.triggered_at as string | null },
    { label: "iCal Verified", time: bmp.ical_verified_at as string | null },
    { label: "Renter Responded", time: bmp.renter_responded_at as string | null },
    { label: "Resolved", time: bmp.resolved_at as string | null },
  ];

  return (
    <div className="px-6 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/bumps" className="text-warm-gray-dark hover:text-volcanic text-sm">&larr; Bumps</Link>
        <span className="text-warm-gray-light">/</span>
        <h1 className="font-serif text-2xl font-bold text-volcanic">Bump Detail</h1>
        <StatusBadge status={bmp.status as string} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5">
          <h3 className="font-serif text-lg font-semibold text-volcanic mb-4">Bump Info</h3>
          <dl className="space-y-2 text-sm">
            <Row label="ID" value={<span className="font-mono text-xs">{id}</span>} />
            <Row label="Villa" value={
              <Link href={`/admin/villas/${bmp.villa_id}/edit`} className="text-bumpr-orange hover:underline">
                {(villa as { title: string } | null)?.title ?? "—"}
              </Link>
            } />
            <Row label="Owner" value={
              <Link href={`/admin/users/${bmp.owner_id}`} className="text-bumpr-orange hover:underline">
                {(owner as { full_name: string } | null)?.full_name ?? "—"}
              </Link>
            } />
            <Row label="Renter" value={
              <Link href={`/admin/users/${bmp.renter_id}`} className="text-bumpr-orange hover:underline">
                {(renter as { full_name: string } | null)?.full_name ?? "—"}
              </Link>
            } />
            <Row label="Renter Phone" value={(renter as { phone: string | null } | null)?.phone ?? "—"} />
            <Row label="Platform" value={<span className="capitalize">{(bmp.external_platform as string) ?? "—"}</span>} />
            <Row label="iCal Verified" value={<StatusBadge status={(bmp.ical_verified as boolean) ? "yes" : "no"} />} />
          </dl>
        </div>

        <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5">
          <h3 className="font-serif text-lg font-semibold text-volcanic mb-4">Resolution</h3>
          <dl className="space-y-2 text-sm">
            <Row label="Deadline" value={bmp.deadline ? new Date(bmp.deadline as string).toLocaleString() : "—"} />
            <Row label="Renter Response" value={<span className="capitalize">{(bmp.renter_response as string) ?? "Pending"}</span>} />
            <Row label="Nights Stayed" value={<span className="font-mono">{(bmp.nights_stayed as number) ?? "—"}</span>} />
            <Row label="Nights Refunded" value={<span className="font-mono">{(bmp.nights_refunded as number) ?? "—"}</span>} />
            {bmp.replacement_booking_id ? (
              <Row label="Replacement Booking" value={
                <Link href={`/admin/bookings/${bmp.replacement_booking_id}`} className="font-mono text-xs text-bumpr-orange hover:underline">
                  {(bmp.replacement_booking_id as string).slice(0, 8)}...
                </Link>
              } />
            ) : null}
          </dl>
        </div>

        {/* Linked Booking */}
        {booking && (
          <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5">
            <h3 className="font-serif text-lg font-semibold text-volcanic mb-4">Linked Booking</h3>
            <dl className="space-y-2 text-sm">
              <Row label="Booking" value={
                <Link href={`/admin/bookings/${(booking as { id: string }).id}`} className="font-mono text-xs text-bumpr-orange hover:underline">
                  {(booking as { id: string }).id.slice(0, 8)}...
                </Link>
              } />
              <Row label="Dates" value={<span className="font-mono text-xs">{(booking as { check_in: string }).check_in} &rarr; {(booking as { check_out: string }).check_out}</span>} />
              <Row label="Nights" value={<span className="font-mono">{(booking as { nights: number }).nights}</span>} />
              <Row label="Total Charged" value={<span className="font-mono">{formatIdr(Number((booking as { total_charged_idr: number }).total_charged_idr))}</span>} />
              <Row label="Status" value={<StatusBadge status={(booking as { status: string }).status} />} />
            </dl>
          </div>
        )}

        {/* Timeline */}
        <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5">
          <h3 className="font-serif text-lg font-semibold text-volcanic mb-4">Timeline</h3>
          <div className="space-y-3">
            {timeline.map((event) => (
              <div key={event.label} className="flex items-center gap-3 text-sm">
                <div className={`h-2.5 w-2.5 rounded-full ${event.time ? "bg-teal" : "bg-warm-gray-light"}`} />
                <span className="text-volcanic font-medium">{event.label}</span>
                <span className="flex-1 border-b border-dashed border-warm-gray-light" />
                <span className="font-mono text-xs text-warm-gray-dark">
                  {event.time ? new Date(event.time).toLocaleString() : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Admin Notes */}
      <div className="mb-8">
        <h3 className="font-serif text-lg font-semibold text-volcanic mb-4">Admin Notes</h3>
        <BumpNotesEditor bumpId={id} initialNotes={(bmp.admin_notes as string) ?? ""} />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <AdminBumpActions bumpId={id} status={bmp.status as string} />
      </div>
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
