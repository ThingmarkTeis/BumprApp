import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import StatusBadge from "@/components/admin/StatusBadge";
import AdminBookingActions from "@/components/admin/AdminBookingActions";
import { formatIdr } from "@/lib/utils/currency";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();

  if (!booking) notFound();

  const b = booking as Record<string, unknown>;

  // Resolve villa, renter, payments, bump
  const [{ data: villa }, { data: renter }, { data: payments }, { data: bump }] = await Promise.all([
    supabase.from("villas").select("id, title, area, owner_id").eq("id", b.villa_id as string).single(),
    supabase.from("profiles").select("id, full_name, email, phone").eq("id", b.renter_id as string).single(),
    supabase.from("payments").select("*").eq("booking_id", id).order("created_at", { ascending: false }),
    supabase.from("bumps").select("*").eq("booking_id", id).limit(1).single(),
  ]);

  // Owner name
  const { data: owner } = villa?.owner_id
    ? await supabase.from("profiles").select("full_name").eq("id", (villa as { owner_id: string }).owner_id).single()
    : { data: null };

  return (
    <div className="px-6 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/bookings" className="text-warm-gray-dark hover:text-volcanic text-sm">&larr; Bookings</Link>
        <span className="text-warm-gray-light">/</span>
        <h1 className="font-serif text-2xl font-bold text-volcanic">Booking Detail</h1>
        <StatusBadge status={b.status as string} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Core Info */}
        <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5">
          <h3 className="font-serif text-lg font-semibold text-volcanic mb-4">Booking Info</h3>
          <dl className="space-y-2 text-sm">
            <Row label="ID" value={<span className="font-mono text-xs">{id}</span>} />
            <Row label="Villa" value={
              <Link href={`/admin/villas/${b.villa_id}/edit`} className="text-bumpr-orange hover:underline">
                {(villa as { title: string } | null)?.title ?? "—"}
              </Link>
            } />
            <Row label="Area" value={<span className="capitalize">{(villa as { area: string } | null)?.area ?? "—"}</span>} />
            <Row label="Owner" value={(owner as { full_name: string } | null)?.full_name ?? "—"} />
            <Row label="Renter" value={
              <Link href={`/admin/users/${b.renter_id}`} className="text-bumpr-orange hover:underline">
                {(renter as { full_name: string } | null)?.full_name ?? "—"}
              </Link>
            } />
            <Row label="Renter Email" value={(renter as { email: string } | null)?.email ?? "—"} />
            <Row label="Renter Phone" value={(renter as { phone: string } | null)?.phone ?? "—"} />
          </dl>
        </div>

        {/* Dates & Stay */}
        <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5">
          <h3 className="font-serif text-lg font-semibold text-volcanic mb-4">Stay Details</h3>
          <dl className="space-y-2 text-sm">
            <Row label="Check-in" value={<span className="font-mono">{b.check_in as string}</span>} />
            <Row label="Check-out" value={<span className="font-mono">{b.check_out as string}</span>} />
            <Row label="Nights" value={<span className="font-mono">{b.nights as number}</span>} />
            <Row label="Guests" value={<span className="font-mono">{(b.guests as number) ?? "—"}</span>} />
            <Row label="Arrival Time" value={<span className="font-mono">{(b.arrival_time as string) ?? "—"}</span>} />
            <Row label="Checked In At" value={b.checked_in_at ? new Date(b.checked_in_at as string).toLocaleString() : "—"} />
            <Row label="Protection Ends" value={b.protection_ends_at ? new Date(b.protection_ends_at as string).toLocaleString() : "—"} />
            <Row label="Is Rebook" value={<StatusBadge status={b.is_rebook ? "yes" : "no"} />} />
            {b.original_booking_id ? (
              <Row label="Original Booking" value={
                <Link href={`/admin/bookings/${b.original_booking_id}`} className="font-mono text-xs text-bumpr-orange hover:underline">
                  {(b.original_booking_id as string).slice(0, 8)}...
                </Link>
              } />
            ) : null}
          </dl>
        </div>

        {/* Financials */}
        <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5">
          <h3 className="font-serif text-lg font-semibold text-volcanic mb-4">Financials</h3>
          <dl className="space-y-2 text-sm">
            <Row label="Nightly Rate" value={<span className="font-mono">{formatIdr(Number(b.nightly_rate_idr))}</span>} />
            <Row label="Total Amount" value={<span className="font-mono">{formatIdr(Number(b.total_amount_idr))}</span>} />
            <Row label="Service Fee (15%)" value={<span className="font-mono">{formatIdr(Number(b.service_fee_idr))}</span>} />
            <Row label="Total Charged" value={<span className="font-mono font-semibold">{formatIdr(Number(b.total_charged_idr))}</span>} />
            <Row label="FX Rate" value={<span className="font-mono">{b.fx_rate_to_renter ? Number(b.fx_rate_to_renter).toFixed(6) : "—"}</span>} />
            <Row label="Renter Currency" value={(b.renter_currency as string) ?? "—"} />
            <Row label="Payment Method" value={(b.payment_method as string) ?? "—"} />
          </dl>
        </div>

        {/* Status & Switches */}
        <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5">
          <h3 className="font-serif text-lg font-semibold text-volcanic mb-4">Status & Transitions</h3>
          <dl className="space-y-2 text-sm">
            <Row label="Status" value={<StatusBadge status={b.status as string} />} />
            <Row label="Approved At" value={b.approved_at ? new Date(b.approved_at as string).toLocaleString() : "—"} />
            <Row label="Completed At" value={b.completed_at ? new Date(b.completed_at as string).toLocaleString() : "—"} />
            <Row label="Cancelled At" value={b.cancelled_at ? new Date(b.cancelled_at as string).toLocaleString() : "—"} />
            <Row label="Cancel Reason" value={(b.cancellation_reason as string) ?? "—"} />
            <Row label="Auto-Bump Scheduled" value={b.auto_bump_scheduled_at ? new Date(b.auto_bump_scheduled_at as string).toLocaleString() : "—"} />
            <Row label="Auto-Bump By" value={(b.auto_bump_triggered_by as string) ?? "—"} />
            <Row label="Bumped At" value={b.bumped_at ? new Date(b.bumped_at as string).toLocaleString() : "—"} />
            {b.switched_to_booking_id ? (
              <Row label="Switched To" value={
                <Link href={`/admin/bookings/${b.switched_to_booking_id}`} className="font-mono text-xs text-bumpr-orange hover:underline">
                  {(b.switched_to_booking_id as string).slice(0, 8)}...
                </Link>
              } />
            ) : null}
            {b.switched_from_booking_id ? (
              <Row label="Switched From" value={
                <Link href={`/admin/bookings/${b.switched_from_booking_id}`} className="font-mono text-xs text-bumpr-orange hover:underline">
                  {(b.switched_from_booking_id as string).slice(0, 8)}...
                </Link>
              } />
            ) : null}
            <Row label="Created" value={new Date(b.created_at as string).toLocaleString()} />
          </dl>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-8 flex gap-3">
        <AdminBookingActions bookingId={id} status={b.status as string} />
      </div>

      {/* Payments */}
      <div className="mb-8">
        <h3 className="font-serif text-lg font-semibold text-volcanic mb-4">Payments</h3>
        <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-cream-dark text-left">
              <tr>
                <th className="px-4 py-2.5 font-medium text-warm-gray-dark">Type</th>
                <th className="px-4 py-2.5 font-medium text-warm-gray-dark">Amount</th>
                <th className="px-4 py-2.5 font-medium text-warm-gray-dark">Description</th>
                <th className="px-4 py-2.5 font-medium text-warm-gray-dark">Xendit</th>
                <th className="px-4 py-2.5 font-medium text-warm-gray-dark">Status</th>
                <th className="px-4 py-2.5 font-medium text-warm-gray-dark">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-gray-light">
              {(payments ?? []).map((p: { id: string; type: string; amount_idr: number; description: string | null; xendit_payment_id: string | null; xendit_status: string | null; status: string; created_at: string }) => (
                <tr key={p.id} className="hover:bg-cream-dark/50">
                  <td className="px-4 py-2.5"><StatusBadge status={p.type} /></td>
                  <td className="px-4 py-2.5 font-mono text-xs">{formatIdr(Number(p.amount_idr))}</td>
                  <td className="px-4 py-2.5 text-xs text-volcanic/60">{p.description ?? "—"}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-volcanic/50">{p.xendit_payment_id?.slice(0, 12) ?? "—"}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-2.5 text-xs text-volcanic/50">{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {(payments ?? []).length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-warm-gray">No payments</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bump (if exists) */}
      {bump && (
        <div>
          <h3 className="font-serif text-lg font-semibold text-volcanic mb-4">Bump</h3>
          <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5">
            <dl className="grid md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <Row label="Bump ID" value={
                <Link href={`/admin/bumps/${(bump as { id: string }).id}`} className="font-mono text-xs text-bumpr-orange hover:underline">
                  {(bump as { id: string }).id.slice(0, 8)}...
                </Link>
              } />
              <Row label="Status" value={<StatusBadge status={(bump as { status: string }).status} />} />
              <Row label="Platform" value={<span className="capitalize">{(bump as { external_platform: string | null }).external_platform ?? "—"}</span>} />
              <Row label="iCal Verified" value={<StatusBadge status={(bump as { ical_verified: boolean }).ical_verified ? "yes" : "no"} />} />
              <Row label="Triggered" value={new Date((bump as { triggered_at: string }).triggered_at).toLocaleString()} />
              <Row label="Deadline" value={new Date((bump as { deadline: string }).deadline).toLocaleString()} />
              <Row label="Renter Response" value={<span className="capitalize">{(bump as { renter_response: string | null }).renter_response ?? "—"}</span>} />
              <Row label="Nights Stayed" value={<span className="font-mono">{(bump as { nights_stayed: number | null }).nights_stayed ?? "—"}</span>} />
              <Row label="Nights Refunded" value={<span className="font-mono">{(bump as { nights_refunded: number | null }).nights_refunded ?? "—"}</span>} />
            </dl>
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
