import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { createCharge } from "./charge";
import { createRefund } from "./refund";
import { createDisbursement } from "./disbursement";
import { calculateBumpFinancials } from "@/lib/services/payments";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type Villa = Database["public"]["Tables"]["villas"]["Row"];
type Payment = Database["public"]["Tables"]["payments"]["Row"];
type Payout = Database["public"]["Tables"]["payouts"]["Row"];

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://bumpr.rent";

export async function initiateBookingPayment(
  bookingId: string
): Promise<{ checkoutUrl: string }> {
  const supabase = createAdminClient();

  // Get booking
  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single<Booking>();

  if (!booking) throw new Error("Booking not found.");
  if (booking.status !== "approved") {
    throw new Error("Booking must be in 'approved' status to pay.");
  }

  // Get villa
  const { data: villa } = await supabase
    .from("villas")
    .select("title")
    .eq("id", booking.villa_id)
    .single<Pick<Villa, "title">>();

  // Get renter profile
  const { data: renter } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", booking.renter_id)
    .single<{ full_name: string; email: string }>();

  if (!renter) throw new Error("Renter profile not found.");

  // Create charge record in DB
  const { data: chargeRecord } = await supabase
    .from("payments")
    .insert({
      booking_id: bookingId,
      type: "charge" as const,
      amount_idr: booking.total_charged_idr,
      description: "Booking payment",
      status: "pending" as const,
    })
    .select()
    .single<Payment>();

  // Call Xendit
  const result = await createCharge({
    bookingId,
    amountIdr: booking.total_charged_idr,
    description: `Bumpr standby booking — ${villa?.title ?? "Villa"} — ${booking.nights} nights`,
    renterEmail: renter.email,
    renterName: renter.full_name,
    successRedirectUrl: `${APP_URL}/booking/${bookingId}?payment=success`,
    failureRedirectUrl: `${APP_URL}/booking/${bookingId}?payment=failed`,
  });

  // Update charge record with Xendit ID
  if (chargeRecord) {
    await supabase
      .from("payments")
      .update({
        xendit_payment_id: result.xenditPaymentId,
        status: "processing",
      })
      .eq("id", chargeRecord.id);
  }

  return { checkoutUrl: result.checkoutUrl };
}

export async function processRefund(
  bookingId: string,
  bumpId: string
): Promise<void> {
  const supabase = createAdminClient();

  // Get booking
  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single<Booking>();

  if (!booking) throw new Error("Booking not found.");

  // Get bump for nights calculation
  const { data: bump } = await supabase
    .from("bumps")
    .select("nights_stayed")
    .eq("id", bumpId)
    .single<{ nights_stayed: number | null }>();

  if (!bump?.nights_stayed) throw new Error("Bump has no nights_stayed.");

  const financials = calculateBumpFinancials(booking, bump.nights_stayed);
  if (financials.renterRefundIdr <= 0) return;

  // Find the original charge
  const { data: originalCharge } = await supabase
    .from("payments")
    .select("xendit_payment_id")
    .eq("booking_id", bookingId)
    .eq("type", "charge")
    .eq("status", "completed")
    .single<{ xendit_payment_id: string | null }>();

  if (!originalCharge?.xendit_payment_id) {
    console.error(`No completed charge found for booking ${bookingId}`);
    return;
  }

  // Find existing refund record (created by cron)
  const { data: refundRecord } = await supabase
    .from("payments")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("type", "refund")
    .eq("status", "pending")
    .single<{ id: string }>();

  // Call Xendit refund
  const result = await createRefund({
    bookingId,
    originalXenditPaymentId: originalCharge.xendit_payment_id,
    amountIdr: financials.renterRefundIdr,
    reason: `Refund for ${financials.nightsRefunded} unused nights + service fee`,
  });

  // Update refund record
  if (refundRecord) {
    await supabase
      .from("payments")
      .update({
        xendit_payment_id: result.xenditRefundId,
        status: "processing",
      })
      .eq("id", refundRecord.id);
  }
}

export async function processOwnerPayout(payoutId: string): Promise<void> {
  const supabase = createAdminClient();

  // Get payout record
  const { data: payout } = await supabase
    .from("payouts")
    .select("*")
    .eq("id", payoutId)
    .single<Payout>();

  if (!payout) throw new Error("Payout not found.");

  // Get owner bank details
  const { data: owner } = await supabase
    .from("owner_profiles")
    .select("bank_name, bank_account_number, bank_account_holder")
    .eq("id", payout.owner_id)
    .single<{
      bank_name: string | null;
      bank_account_number: string | null;
      bank_account_holder: string | null;
    }>();

  if (!owner?.bank_name || !owner.bank_account_number || !owner.bank_account_holder) {
    console.error(`Owner ${payout.owner_id} missing bank details`);
    return;
  }

  // Get villa name for description
  const { data: booking } = await supabase
    .from("bookings")
    .select("villa_id")
    .eq("id", payout.booking_id)
    .single<{ villa_id: string }>();

  const { data: villa } = booking
    ? await supabase
        .from("villas")
        .select("title")
        .eq("id", booking.villa_id)
        .single<{ title: string }>()
    : { data: null };

  // Call Xendit disbursement
  const result = await createDisbursement({
    payoutId,
    amountIdr: payout.amount_idr,
    bankCode: owner.bank_name,
    accountNumber: owner.bank_account_number,
    accountHolderName: owner.bank_account_holder,
    description: `Bumpr payout — ${villa?.title ?? "Villa"} — ${payout.nights_paid} nights`,
  });

  // Update payout record
  await supabase
    .from("payouts")
    .update({
      xendit_disbursement_id: result.xenditDisbursementId,
      status: "processing",
    })
    .eq("id", payoutId);
}
