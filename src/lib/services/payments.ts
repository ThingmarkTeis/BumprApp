import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type Payment = Database["public"]["Tables"]["payments"]["Row"];
type Payout = Database["public"]["Tables"]["payouts"]["Row"];

export function calculateBumpFinancials(
  booking: Booking,
  nightsStayed: number
): {
  nightsStayed: number;
  nightsRefunded: number;
  ownerPayoutIdr: number;
  renterRefundIdr: number;
  bumprFeeIdr: number;
} {
  const nightsRefunded = booking.nights - nightsStayed;
  const serviceFeePerNight = Math.round(booking.service_fee_idr / booking.nights);

  const ownerPayoutIdr = nightsStayed * booking.nightly_rate_idr;
  const renterRefundIdr =
    nightsRefunded * booking.nightly_rate_idr +
    nightsRefunded * serviceFeePerNight;
  const bumprFeeIdr = nightsStayed * serviceFeePerNight;

  return {
    nightsStayed,
    nightsRefunded,
    ownerPayoutIdr,
    renterRefundIdr,
    bumprFeeIdr,
  };
}

export function calculateCheckoutFinancials(booking: Booking): {
  ownerPayoutIdr: number;
  bumprFeeIdr: number;
} {
  return {
    ownerPayoutIdr: booking.total_amount_idr,
    bumprFeeIdr: booking.service_fee_idr,
  };
}

export async function createChargeRecord(
  bookingId: string,
  amountIdr: number
): Promise<Payment> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("payments")
    .insert({
      booking_id: bookingId,
      type: "charge",
      amount_idr: amountIdr,
      description: "Booking payment",
      status: "pending",
    })
    .select()
    .single<Payment>();

  if (error) throw new Error(`Failed to create charge record: ${error.message}`);
  return data;
}

export async function createRefundRecord(
  bookingId: string,
  amountIdr: number,
  description: string
): Promise<Payment> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("payments")
    .insert({
      booking_id: bookingId,
      type: "refund",
      amount_idr: amountIdr,
      description,
      status: "pending",
    })
    .select()
    .single<Payment>();

  if (error) throw new Error(`Failed to create refund record: ${error.message}`);
  return data;
}

export async function createPayoutRecord(params: {
  ownerId: string;
  bookingId: string;
  amountIdr: number;
  nightsPaid: number;
}): Promise<Payout> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("payouts")
    .insert({
      owner_id: params.ownerId,
      booking_id: params.bookingId,
      amount_idr: params.amountIdr,
      nights_paid: params.nightsPaid,
      status: "pending",
    })
    .select()
    .single<Payout>();

  if (error) throw new Error(`Failed to create payout record: ${error.message}`);
  return data;
}

export async function updatePaymentStatus(
  paymentId: string,
  status: string,
  xenditId?: string
): Promise<Payment> {
  const supabase = await createClient();

  const updates: Record<string, unknown> = { status };
  if (xenditId) updates.xendit_payment_id = xenditId;
  if (status === "completed") updates.completed_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("payments")
    .update(updates)
    .eq("id", paymentId)
    .select()
    .single<Payment>();

  if (error) throw new Error(`Failed to update payment: ${error.message}`);
  return data;
}

export async function updatePayoutStatus(
  payoutId: string,
  status: string,
  xenditId?: string
): Promise<Payout> {
  const supabase = await createClient();

  const updates: Record<string, unknown> = { status };
  if (xenditId) updates.xendit_disbursement_id = xenditId;
  if (status === "completed") updates.completed_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("payouts")
    .update(updates)
    .eq("id", payoutId)
    .select()
    .single<Payout>();

  if (error) throw new Error(`Failed to update payout: ${error.message}`);
  return data;
}

export async function getPaymentsByBooking(
  bookingId: string
): Promise<Payment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .returns<Payment[]>();

  if (error) throw new Error(`Failed to fetch payments: ${error.message}`);
  return data ?? [];
}

export async function getPayoutsByOwner(ownerId: string): Promise<Payout[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("payouts")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .returns<Payout[]>();

  if (error) throw new Error(`Failed to fetch payouts: ${error.message}`);
  return data ?? [];
}
