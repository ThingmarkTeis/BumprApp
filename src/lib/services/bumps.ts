import { createClient } from "@/lib/supabase/server";
import type { Database, RenterResponse } from "@/lib/supabase/types";
import { validateBookingTransition, validateBumpTransition } from "./transitions";
import { canBump } from "./protection";
import { calculateNights } from "@/lib/utils/dates";

type Bump = Database["public"]["Tables"]["bumps"]["Row"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"];

export async function triggerBump(params: {
  bookingId: string;
  ownerId: string;
  externalPlatform: string;
}): Promise<Bump> {
  const supabase = await createClient();

  // Get booking
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", params.bookingId)
    .single<Booking>();

  if (bookingError || !booking) throw new Error("Booking not found.");

  // Validate booking can be bumped
  const bumpCheck = canBump(booking);
  if (!bumpCheck.allowed) {
    throw new Error(bumpCheck.reason!);
  }

  // Verify owner owns the villa
  const { data: villa } = await supabase
    .from("villas")
    .select("owner_id, bump_notice_hours")
    .eq("id", booking.villa_id)
    .single<{ owner_id: string; bump_notice_hours: number }>();

  if (!villa || villa.owner_id !== params.ownerId) {
    throw new Error("You do not own this villa.");
  }

  // Check no active bump already exists for this booking
  const { data: existingBumps } = await supabase
    .from("bumps")
    .select("id")
    .eq("booking_id", params.bookingId)
    .eq("status", "active")
    .returns<{ id: string }[]>();

  if (existingBumps && existingBumps.length > 0) {
    throw new Error("An active bump already exists for this booking.");
  }

  // Calculate deadline
  const now = new Date();
  const deadline = new Date(
    now.getTime() + villa.bump_notice_hours * 60 * 60 * 1000
  );

  // Validate the booking transition
  validateBookingTransition(booking.status, "bumped");

  // Create bump record
  const { data: bump, error: bumpError } = await supabase
    .from("bumps")
    .insert({
      booking_id: params.bookingId,
      villa_id: booking.villa_id,
      owner_id: params.ownerId,
      renter_id: booking.renter_id,
      triggered_at: now.toISOString(),
      external_platform: params.externalPlatform,
      deadline: deadline.toISOString(),
      status: "active",
    })
    .select()
    .single<Bump>();

  if (bumpError) throw new Error(`Failed to create bump: ${bumpError.message}`);

  // Update booking status to bumped
  const { error: updateError } = await supabase
    .from("bookings")
    .update({ status: "bumped" })
    .eq("id", params.bookingId);

  if (updateError)
    throw new Error(`Failed to update booking status: ${updateError.message}`);

  return bump;
}

export async function respondToBump(
  bumpId: string,
  renterId: string,
  response: RenterResponse
): Promise<Bump> {
  const supabase = await createClient();

  const bump = await getBumpById(bumpId);

  if (bump.status !== "active") {
    throw new Error("This bump is no longer active.");
  }
  if (bump.renter_id !== renterId) {
    throw new Error("You are not the renter for this bump.");
  }

  const { data: updated, error } = await supabase
    .from("bumps")
    .update({
      renter_response: response,
      renter_responded_at: new Date().toISOString(),
    })
    .eq("id", bumpId)
    .select()
    .single<Bump>();

  if (error) throw new Error(`Failed to update bump: ${error.message}`);
  return updated;
}

export async function resolveBump(bumpId: string): Promise<Bump> {
  const supabase = await createClient();

  const bump = await getBumpById(bumpId);
  validateBumpTransition(bump.status, "resolved");

  // Get the booking to calculate nights
  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bump.booking_id)
    .single<Booking>();

  if (!booking) throw new Error("Booking not found for this bump.");

  // Calculate nights stayed: from check_in to the date the bump was triggered
  const checkInDate = booking.check_in;
  const bumpDate = bump.triggered_at.split("T")[0];
  const nightsStayed = Math.max(1, calculateNights(checkInDate, bumpDate));
  const nightsRefunded = booking.nights - nightsStayed;

  // Resolve the bump
  const { data: resolved, error } = await supabase
    .from("bumps")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      nights_stayed: nightsStayed,
      nights_refunded: nightsRefunded,
    })
    .eq("id", bumpId)
    .select()
    .single<Bump>();

  if (error) throw new Error(`Failed to resolve bump: ${error.message}`);

  // Complete the booking
  validateBookingTransition(booking.status, "completed");
  await supabase
    .from("bookings")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", booking.id);

  return resolved;
}

export async function flagForReview(
  bumpId: string,
  notes: string
): Promise<Bump> {
  const supabase = await createClient();

  const bump = await getBumpById(bumpId);
  validateBumpTransition(bump.status, "admin_review");

  const { data: updated, error } = await supabase
    .from("bumps")
    .update({
      status: "admin_review",
      admin_notes: notes,
    })
    .eq("id", bumpId)
    .select()
    .single<Bump>();

  if (error) throw new Error(`Failed to flag bump: ${error.message}`);
  return updated;
}

export async function getBumpById(bumpId: string): Promise<Bump> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bumps")
    .select("*")
    .eq("id", bumpId)
    .single<Bump>();

  if (error || !data) throw new Error("Bump not found.");
  return data;
}

export async function getBumpsByBooking(bookingId: string): Promise<Bump[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bumps")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .returns<Bump[]>();

  if (error) throw new Error(`Failed to fetch bumps: ${error.message}`);
  return data ?? [];
}

export async function getActiveBumpsByVilla(villaId: string): Promise<Bump[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bumps")
    .select("*")
    .eq("villa_id", villaId)
    .eq("status", "active")
    .returns<Bump[]>();

  if (error) throw new Error(`Failed to fetch bumps: ${error.message}`);
  return data ?? [];
}

export async function getBumpsByOwner(ownerId: string): Promise<Bump[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bumps")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .returns<Bump[]>();

  if (error) throw new Error(`Failed to fetch bumps: ${error.message}`);
  return data ?? [];
}

export async function getBumpsByRenter(renterId: string): Promise<Bump[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bumps")
    .select("*")
    .eq("renter_id", renterId)
    .order("created_at", { ascending: false })
    .returns<Bump[]>();

  if (error) throw new Error(`Failed to fetch bumps: ${error.message}`);
  return data ?? [];
}
