import { redirect, notFound } from "next/navigation";
import { getUserRole } from "@/lib/auth/get-user-role";
import { createAdminClient } from "@/lib/supabase/admin";
import BumpDeadlineTimer from "@/components/renter/BumpDeadlineTimer";
import BumpedScreenClient from "@/components/renter/BumpedScreenClient";
import { formatIdr } from "@/lib/utils/currency";
import type { Database } from "@/lib/supabase/types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type Bump = Database["public"]["Tables"]["bumps"]["Row"];
type Villa = Database["public"]["Tables"]["villas"]["Row"];

const SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", AUD: "A$", SGD: "S$", DKK: "kr",
};

export default async function BumpedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: bookingId } = await params;
  const result = await getUserRole();
  if (!result) redirect("/login");

  const supabase = createAdminClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single<Booking>();

  if (!booking || booking.renter_id !== result.userId) notFound();
  if (booking.status !== "bumped") redirect(`/booking/${bookingId}`);

  const { data: bump } = await supabase
    .from("bumps")
    .select("*")
    .eq("booking_id", bookingId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single<Bump>();

  const { data: villa } = await supabase
    .from("villas")
    .select("title, area")
    .eq("id", booking.villa_id)
    .single<Pick<Villa, "title" | "area">>();

  // Calculate refund estimate
  const deadlineDate = bump?.deadline ? bump.deadline.split("T")[0] : null;
  const nightsStayed = deadlineDate
    ? Math.max(1, Math.round((new Date(deadlineDate).getTime() - new Date(booking.check_in).getTime()) / 86400000))
    : booking.nights;
  const nightsRefunded = booking.nights - nightsStayed;
  const serviceFeePerNight = Math.round(booking.service_fee_idr / booking.nights);
  const refundIdr = nightsRefunded * booking.nightly_rate_idr + nightsRefunded * serviceFeePerNight;

  const fxRate = booking.fx_rate_to_renter;
  const symbol = SYMBOLS[booking.renter_currency] ?? booking.renter_currency;
  const refundConverted = fxRate ? Math.round(refundIdr * fxRate) : null;

  // Pre-filter browse URL for rebooking
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const rebookCheckIn = tomorrow.toISOString().split("T")[0];
  const rebookUrl = `/browse?checkIn=${rebookCheckIn}&checkOut=${booking.check_out}&area=${villa?.area ?? ""}`;

  return (
    <div className="px-6 py-8 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <p className="text-bumpr-orange text-sm font-medium mb-2">You&apos;ve been bumped</p>
        <h1 className="font-serif text-2xl font-bold text-volcanic">
          {villa?.title ?? "Your villa"}
        </h1>
      </div>

      {/* Deadline timer */}
      {bump && (
        <div className="mb-6">
          <BumpDeadlineTimer deadline={bump.deadline} />
        </div>
      )}

      {/* Calm reassurance */}
      <p className="text-center text-warm-gray-dark text-sm mb-8">
        Don&apos;t worry — here&apos;s what to do next
      </p>

      {/* Action options */}
      <BumpedScreenClient
        bumpId={bump?.id ?? ""}
        rebookUrl={rebookUrl}
        currentResponse={bump?.renter_response ?? null}
      />

      {/* Refund info */}
      <div className="mt-8 rounded-[16px] bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5">
        <h3 className="font-serif font-semibold text-volcanic mb-3">
          Your refund
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-warm-gray-dark">{nightsRefunded} unused nights</span>
            <span className="font-mono text-volcanic">{formatIdr(nightsRefunded * booking.nightly_rate_idr)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-warm-gray-dark">Service fee refund</span>
            <span className="font-mono text-volcanic">{formatIdr(nightsRefunded * serviceFeePerNight)}</span>
          </div>
          <div className="border-t border-warm-gray-light pt-2 flex justify-between">
            <span className="font-medium text-volcanic">Total refund</span>
            <div className="text-right">
              {refundConverted !== null && (
                <p className="font-mono font-bold text-volcanic">
                  ≈ {symbol}{refundConverted.toLocaleString()}
                </p>
              )}
              <p className="font-mono text-xs text-warm-gray">{formatIdr(refundIdr)}</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-warm-gray mt-3">
          Refunds typically take 5–14 business days to appear on your statement.
        </p>
      </div>
    </div>
  );
}
