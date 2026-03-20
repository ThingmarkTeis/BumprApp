import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { validateBookingTransition } from "./transitions";
import { calculateProtectionEnd } from "./protection";
import { calculateNights } from "@/lib/utils/dates";
import { checkAvailability } from "./villas";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type Villa = Database["public"]["Tables"]["villas"]["Row"];

const SERVICE_FEE_RATE = 0.15;
const MAX_ACTIVE_BOOKINGS = 3;

export async function createBookingRequest(params: {
  villaId: string;
  renterId: string;
  checkIn: string;
  checkOut: string;
  isRebook?: boolean;
  originalBookingId?: string;
}): Promise<Booking> {
  const supabase = await createClient();

  // Validate dates
  if (params.checkOut <= params.checkIn) {
    throw new Error("Check-out date must be after check-in date.");
  }

  // Validate villa exists and is active
  const { data: villa, error: villaError } = await supabase
    .from("villas")
    .select("*")
    .eq("id", params.villaId)
    .single<Villa>();

  if (villaError || !villa) throw new Error("Villa not found.");
  if (villa.status !== "active") {
    throw new Error("Villa is not currently active.");
  }

  // Check availability
  const availability = await checkAvailability(
    params.villaId,
    params.checkIn,
    params.checkOut
  );
  if (!availability.available) {
    throw new Error("Villa is not available for the selected dates.");
  }

  // Check renter's active booking count
  const count = await countActiveBookings(params.renterId);
  if (count >= MAX_ACTIVE_BOOKINGS) {
    throw new Error(
      `You already have ${count} active bookings. Maximum is ${MAX_ACTIVE_BOOKINGS}.`
    );
  }

  // Get exchange rate for renter's currency
  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_currency")
    .eq("id", params.renterId)
    .single<{ preferred_currency: string }>();

  const renterCurrency = profile?.preferred_currency ?? "USD";

  const { data: rateRow } = await supabase
    .from("exchange_rates")
    .select("rate_from_idr")
    .eq("currency_code", renterCurrency)
    .single<{ rate_from_idr: number }>();

  // Calculate pricing
  const nights = calculateNights(params.checkIn, params.checkOut);
  if (nights <= 0) throw new Error("Booking must be at least 1 night.");

  const totalAmountIdr = villa.standby_rate_idr * nights;
  const serviceFeeIdr = Math.round(totalAmountIdr * SERVICE_FEE_RATE);
  const totalChargedIdr = totalAmountIdr + serviceFeeIdr;

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      villa_id: params.villaId,
      renter_id: params.renterId,
      check_in: params.checkIn,
      check_out: params.checkOut,
      nights,
      nightly_rate_idr: villa.standby_rate_idr,
      total_amount_idr: totalAmountIdr,
      service_fee_idr: serviceFeeIdr,
      total_charged_idr: totalChargedIdr,
      fx_rate_to_renter: rateRow?.rate_from_idr ?? null,
      renter_currency: renterCurrency,
      status: "requested",
      is_rebook: params.isRebook ?? false,
      original_booking_id: params.originalBookingId ?? null,
    })
    .select()
    .single<Booking>();

  if (error) throw new Error(`Failed to create booking: ${error.message}`);
  return booking;
}

export async function approveBooking(
  bookingId: string,
  ownerId: string
): Promise<Booking> {
  const supabase = await createClient();

  const booking = await getBookingById(bookingId);
  validateBookingTransition(booking.status, "approved");

  // Verify the owner owns the villa
  const { data: villa } = await supabase
    .from("villas")
    .select("owner_id")
    .eq("id", booking.villa_id)
    .single<{ owner_id: string }>();

  if (!villa || villa.owner_id !== ownerId) {
    throw new Error("You do not own this villa.");
  }

  const { data: updated, error } = await supabase
    .from("bookings")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", bookingId)
    .select()
    .single<Booking>();

  if (error) throw new Error(`Failed to approve booking: ${error.message}`);
  return updated;
}

export async function confirmBooking(bookingId: string): Promise<Booking> {
  const supabase = await createClient();

  const booking = await getBookingById(bookingId);
  validateBookingTransition(booking.status, "confirmed");

  const { data: updated, error } = await supabase
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", bookingId)
    .select()
    .single<Booking>();

  if (error) throw new Error(`Failed to confirm booking: ${error.message}`);
  return updated;
}

export async function checkIn(
  bookingId: string,
  renterId: string
): Promise<Booking> {
  const supabase = await createClient();

  const booking = await getBookingById(bookingId);
  validateBookingTransition(booking.status, "active");

  if (booking.renter_id !== renterId) {
    throw new Error("You are not the renter for this booking.");
  }

  // Validate that check-in date has arrived
  const today = new Date().toISOString().split("T")[0];
  if (today < booking.check_in) {
    throw new Error("Cannot check in before the check-in date.");
  }

  const now = new Date();
  const protectionEnd = calculateProtectionEnd(now, booking.is_rebook);

  const { data: updated, error } = await supabase
    .from("bookings")
    .update({
      status: "active",
      checked_in_at: now.toISOString(),
      protection_ends_at: protectionEnd.toISOString(),
    })
    .eq("id", bookingId)
    .select()
    .single<Booking>();

  if (error) throw new Error(`Failed to check in: ${error.message}`);
  return updated;
}

export async function cancelBooking(
  bookingId: string,
  renterId: string,
  reason?: string
): Promise<Booking> {
  const supabase = await createClient();

  const booking = await getBookingById(bookingId);

  // Renters can only cancel before check-in
  if (!["requested", "approved", "confirmed"].includes(booking.status)) {
    throw new Error(
      `Cannot cancel a booking with status '${booking.status}'. Cancellation is only allowed before check-in.`
    );
  }
  validateBookingTransition(booking.status, "cancelled");

  if (booking.renter_id !== renterId) {
    throw new Error("You are not the renter for this booking.");
  }

  const { data: updated, error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason ?? null,
    })
    .eq("id", bookingId)
    .select()
    .single<Booking>();

  if (error) throw new Error(`Failed to cancel booking: ${error.message}`);
  return updated;
}

export async function preCheckinCancel(bookingId: string): Promise<Booking> {
  const supabase = await createClient();

  const booking = await getBookingById(bookingId);
  validateBookingTransition(booking.status, "pre_checkin_cancelled");

  const { data: updated, error } = await supabase
    .from("bookings")
    .update({
      status: "pre_checkin_cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: "External booking received before check-in",
    })
    .eq("id", bookingId)
    .select()
    .single<Booking>();

  if (error)
    throw new Error(`Failed to cancel pre-checkin: ${error.message}`);
  return updated;
}

export async function expireBooking(bookingId: string): Promise<Booking> {
  const supabase = await createClient();

  const booking = await getBookingById(bookingId);
  validateBookingTransition(booking.status, "expired");

  const { data: updated, error } = await supabase
    .from("bookings")
    .update({ status: "expired" })
    .eq("id", bookingId)
    .select()
    .single<Booking>();

  if (error) throw new Error(`Failed to expire booking: ${error.message}`);
  return updated;
}

export async function completeBooking(bookingId: string): Promise<Booking> {
  const supabase = await createClient();

  const booking = await getBookingById(bookingId);
  validateBookingTransition(booking.status, "completed");

  const { data: updated, error } = await supabase
    .from("bookings")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .select()
    .single<Booking>();

  if (error) throw new Error(`Failed to complete booking: ${error.message}`);
  return updated;
}

export async function getBookingsByRenter(
  renterId: string
): Promise<Booking[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("renter_id", renterId)
    .order("created_at", { ascending: false })
    .returns<Booking[]>();

  if (error) throw new Error(`Failed to fetch bookings: ${error.message}`);
  return data ?? [];
}

export async function getBookingsByVilla(villaId: string): Promise<Booking[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("villa_id", villaId)
    .order("check_in", { ascending: false })
    .returns<Booking[]>();

  if (error) throw new Error(`Failed to fetch bookings: ${error.message}`);
  return data ?? [];
}

export async function getBookingById(
  bookingId: string
): Promise<Booking & { villa?: Villa }> {
  const supabase = await createClient();

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single<Booking>();

  if (error || !booking) throw new Error("Booking not found.");

  const { data: villa } = await supabase
    .from("villas")
    .select("*")
    .eq("id", booking.villa_id)
    .single<Villa>();

  return { ...booking, villa: villa ?? undefined };
}

export async function countActiveBookings(renterId: string): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("count_active_bookings", {
    renter_uuid: renterId,
  });

  if (error) throw new Error(`Failed to count bookings: ${error.message}`);
  return (data as number) ?? 0;
}
