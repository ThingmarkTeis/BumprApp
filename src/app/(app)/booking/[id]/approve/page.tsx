import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth/get-user-role";
import { createAdminClient } from "@/lib/supabase/admin";
import ApproveBookingClient from "@/components/owner/ApproveBookingClient";
import { formatIdr } from "@/lib/utils/currency";
import type { Database } from "@/lib/supabase/types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type Villa = Database["public"]["Tables"]["villas"]["Row"];

export default async function ApproveBookingPage({
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

  if (!booking) redirect("/dashboard");

  // Verify villa ownership
  const { data: villa } = await supabase
    .from("villas")
    .select("*")
    .eq("id", booking.villa_id)
    .single<Villa>();

  if (!villa || villa.owner_id !== result.userId) redirect("/dashboard");

  // Renter name
  const { data: renter } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", booking.renter_id)
    .single<{ full_name: string }>();

  const isExpired = booking.status === "expired";
  const isAlreadyApproved = booking.status !== "requested";
  const createdAt = new Date(booking.created_at);
  const expiresAt = new Date(createdAt.getTime() + 15 * 60 * 1000);

  return (
    <div className="px-6 py-8 max-w-lg mx-auto">
      <h1 className="font-serif text-2xl font-bold text-volcanic mb-6">
        Booking Request
      </h1>

      <div className="rounded-xl bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5 mb-6 space-y-4">
        <div>
          <p className="text-sm text-warm-gray-dark">Guest</p>
          <p className="font-medium text-volcanic text-lg">
            {renter?.full_name ?? "Guest"}
          </p>
        </div>
        <div>
          <p className="text-sm text-warm-gray-dark">Villa</p>
          <p className="text-volcanic">{villa.title}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-warm-gray-dark">Check-in</p>
            <p className="text-volcanic font-mono">{booking.check_in}</p>
          </div>
          <div>
            <p className="text-sm text-warm-gray-dark">Check-out</p>
            <p className="text-volcanic font-mono">{booking.check_out}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-warm-gray-dark">Nights</p>
            <p className="text-volcanic font-mono">{booking.nights}</p>
          </div>
          <div>
            <p className="text-sm text-warm-gray-dark">Your earnings</p>
            <p className="text-volcanic font-mono font-semibold">
              {formatIdr(booking.total_amount_idr)}
            </p>
          </div>
        </div>
      </div>

      {isExpired ? (
        <div className="rounded-xl bg-cream-dark p-5 text-center">
          <p className="text-warm-gray-dark">This booking request has expired.</p>
        </div>
      ) : isAlreadyApproved ? (
        <div className="rounded-xl bg-teal/5 border border-teal/20 p-5 text-center">
          <p className="text-teal font-medium">
            This booking has already been{" "}
            {booking.status === "approved" ? "approved" : booking.status}.
          </p>
        </div>
      ) : (
        <ApproveBookingClient
          bookingId={bookingId}
          expiresAt={expiresAt.toISOString()}
        />
      )}
    </div>
  );
}
