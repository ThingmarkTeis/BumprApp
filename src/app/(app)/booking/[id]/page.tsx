import { redirect, notFound } from "next/navigation";
import { getUserRole } from "@/lib/auth/get-user-role";
import { createAdminClient } from "@/lib/supabase/admin";
import StatusBadge from "@/components/admin/StatusBadge";
import BookingSummary from "@/components/renter/BookingSummary";
import ProtectionTimer from "@/components/renter/ProtectionTimer";
import BookingDetailClient from "@/components/renter/BookingDetailClient";
import { formatDate } from "@/lib/utils/dates";
import { formatIdr } from "@/lib/utils/currency";
import Link from "next/link";
import type { Database } from "@/lib/supabase/types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type Villa = Database["public"]["Tables"]["villas"]["Row"];

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const result = await getUserRole();
  if (!result) redirect("/login");

  const supabase = createAdminClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single<Booking>();

  if (!booking || booking.renter_id !== result.userId) notFound();

  // Redirect bumped bookings to bump screen
  if (booking.status === "bumped") redirect(`/booking/${id}/bumped`);

  const { data: villa } = await supabase
    .from("villas")
    .select("*")
    .eq("id", booking.villa_id)
    .single<Villa>();

  // Get hero photo
  const { data: photos } = await supabase
    .from("villa_photos")
    .select("url")
    .eq("villa_id", booking.villa_id)
    .eq("sort_order", 0)
    .limit(1);

  const heroUrl = (photos?.[0] as { url: string } | undefined)?.url ?? null;
  const paymentFailed = sp.payment === "failed";

  return (
    <div className="px-6 py-8 max-w-lg mx-auto">
      {/* Villa header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="h-16 w-16 rounded-xl bg-volcanic/5 overflow-hidden shrink-0">
          {heroUrl ? (
            <img src={heroUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-volcanic/15 text-2xl">⌂</div>
          )}
        </div>
        <div>
          <h1 className="font-serif text-xl font-bold text-volcanic">
            {villa?.title ?? "Villa"}
          </h1>
          <p className="text-sm text-warm-gray-dark capitalize">{villa?.area}</p>
        </div>
      </div>

      {/* Status */}
      <div className="flex justify-center mb-6">
        <StatusBadge status={booking.status} />
      </div>

      {/* Status-specific content */}
      {booking.status === "requested" && (
        <div className="space-y-6">
          <div className="rounded-xl bg-cream-dark p-5 text-center">
            <p className="font-serif text-lg font-semibold text-volcanic mb-1">
              Waiting for owner approval
            </p>
            <p className="text-sm text-warm-gray-dark">
              The villa owner has been notified. They usually respond quickly.
            </p>
          </div>
          <BookingSummary
            checkIn={booking.check_in}
            checkOut={booking.check_out}
            nights={booking.nights}
            nightlyRateIdr={booking.nightly_rate_idr}
            totalAmountIdr={booking.total_amount_idr}
            serviceFeeIdr={booking.service_fee_idr}
            totalChargedIdr={booking.total_charged_idr}
            fxRate={booking.fx_rate_to_renter}
            currency={booking.renter_currency}
          />
        </div>
      )}

      {booking.status === "approved" && (
        <div className="space-y-6">
          <div className="rounded-xl bg-bumpr-orange/5 border border-bumpr-orange/10 p-5 text-center">
            <p className="font-serif text-lg font-semibold text-bumpr-orange mb-1">
              Owner approved!
            </p>
            <p className="text-sm text-warm-gray-dark">
              Complete payment to confirm your booking.
            </p>
          </div>
          {paymentFailed && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-center">
              <p className="text-sm text-red-600">Payment failed. Please try again.</p>
            </div>
          )}
          <BookingSummary
            checkIn={booking.check_in}
            checkOut={booking.check_out}
            nights={booking.nights}
            nightlyRateIdr={booking.nightly_rate_idr}
            totalAmountIdr={booking.total_amount_idr}
            serviceFeeIdr={booking.service_fee_idr}
            totalChargedIdr={booking.total_charged_idr}
            fxRate={booking.fx_rate_to_renter}
            currency={booking.renter_currency}
          />
          <BookingDetailClient bookingId={id} action="pay" />
        </div>
      )}

      {booking.status === "confirmed" && (
        <div className="space-y-6">
          <div className="rounded-xl bg-bumpr-orange/5 border border-bumpr-orange/10 p-5 text-center">
            <p className="font-serif text-lg font-semibold text-bumpr-orange mb-1">
              You&apos;re booked!
            </p>
            <p className="text-sm text-warm-gray-dark">
              Check-in on {formatDate(booking.check_in)}
            </p>
          </div>
          {villa?.address && (
            <div className="rounded-xl bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5">
              <p className="text-sm text-warm-gray-dark mb-1">Address</p>
              <p className="text-volcanic">{villa.address}</p>
              <p className="text-xs text-warm-gray mt-2">
                Check-in: {villa.earliest_check_in ?? "14:00"} – {villa.check_in_by ?? "20:00"}
              </p>
            </div>
          )}
          <div className="rounded-lg bg-cream-dark p-4">
            <p className="text-sm text-warm-gray-dark">
              This is a standby booking. You may be bumped with{" "}
              {villa?.bump_notice_hours ?? 18} hours notice.
            </p>
          </div>
          <BookingDetailClient bookingId={id} action="checkin" checkIn={booking.check_in} />
        </div>
      )}

      {booking.status === "active" && (
        <div className="space-y-6">
          <div className="rounded-xl bg-teal/10 p-5 text-center">
            <p className="font-serif text-lg font-semibold text-teal">
              You&apos;re checked in!
            </p>
          </div>
          {booking.protection_ends_at && (
            <ProtectionTimer
              protectionEndsAt={booking.protection_ends_at}
              bumpNoticeHours={villa?.bump_notice_hours ?? 18}
            />
          )}
        </div>
      )}

      {booking.status === "completed" && (
        <div className="space-y-6">
          <div className="rounded-xl bg-cream-dark p-5 text-center">
            <p className="font-serif text-lg font-semibold text-volcanic mb-1">
              Stay completed
            </p>
            <p className="text-sm text-warm-gray-dark">
              {formatDate(booking.check_in)} → {formatDate(booking.check_out)}
            </p>
          </div>
          <div className="rounded-xl bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-warm-gray-dark">Total paid</span>
              <span className="font-mono text-volcanic">{formatIdr(booking.total_charged_idr)}</span>
            </div>
          </div>
        </div>
      )}

      {(booking.status === "cancelled" || booking.status === "expired" || booking.status === "pre_checkin_cancelled") && (
        <div className="space-y-6">
          <div className="rounded-xl bg-cream-dark p-5 text-center">
            <p className="font-serif text-lg font-semibold text-volcanic mb-2">
              {booking.status === "expired"
                ? "Request expired"
                : booking.status === "pre_checkin_cancelled"
                  ? "Booking cancelled"
                  : "Booking cancelled"}
            </p>
            <p className="text-sm text-warm-gray-dark">
              {booking.status === "pre_checkin_cancelled"
                ? "The owner received a full-price booking. You've been fully refunded."
                : booking.status === "expired"
                  ? "The owner didn't respond in time."
                  : booking.cancellation_reason ?? "This booking was cancelled."}
            </p>
          </div>
          <Link
            href="/browse"
            className="block w-full rounded-lg bg-bumpr-orange py-3 text-center text-sm font-semibold text-white hover:bg-bumpr-orange-dark"
          >
            Browse villas
          </Link>
        </div>
      )}
    </div>
  );
}
