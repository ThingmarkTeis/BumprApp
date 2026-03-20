import { createClient } from "@/lib/supabase/server";
import type { Database, NotificationChannel } from "@/lib/supabase/types";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type Bump = Database["public"]["Tables"]["bumps"]["Row"];
type Villa = Database["public"]["Tables"]["villas"]["Row"];
type Payout = Database["public"]["Tables"]["payouts"]["Row"];

async function createNotification(params: {
  userId: string;
  bookingId?: string;
  bumpId?: string;
  channel: NotificationChannel;
  template: string;
  messageBody: string;
}): Promise<Notification> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: params.userId,
      booking_id: params.bookingId ?? null,
      bump_id: params.bumpId ?? null,
      channel: params.channel,
      template: params.template,
      message_body: params.messageBody,
      status: "pending",
    })
    .select()
    .single<Notification>();

  if (error)
    throw new Error(`Failed to create notification: ${error.message}`);
  return data;
}

// --- Orchestrators ---

export async function onBookingRequested(
  booking: Booking,
  villa: Villa,
  renterName: string
): Promise<void> {
  // Notify the villa owner
  const supabase = await createClient();
  const { data: owner } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", villa.owner_id)
    .single<{ id: string }>();

  if (owner) {
    await createNotification({
      userId: owner.id,
      bookingId: booking.id,
      channel: "whatsapp",
      template: "booking_request_owner",
      messageBody: `New booking request from ${renterName} for ${villa.title} (${booking.check_in} to ${booking.check_out}). Please approve within 15 minutes.`,
    });
  }
}

export async function onBookingConfirmed(
  booking: Booking,
  villa: Villa
): Promise<void> {
  // Notify renter
  await createNotification({
    userId: booking.renter_id,
    bookingId: booking.id,
    channel: "whatsapp",
    template: "booking_confirmed_renter",
    messageBody: `Your booking for ${villa.title} is confirmed! Check-in: ${booking.check_in}. Check-out: ${booking.check_out}.`,
  });

  // Notify owner
  await createNotification({
    userId: villa.owner_id,
    bookingId: booking.id,
    channel: "whatsapp",
    template: "booking_confirmed_owner",
    messageBody: `Booking confirmed for ${villa.title}. Guest arrives ${booking.check_in}.`,
  });
}

export async function onBumpTriggered(
  bump: Bump,
  booking: Booking,
  villa: Villa
): Promise<void> {
  // CRITICAL: Notify the renter immediately
  await createNotification({
    userId: bump.renter_id,
    bumpId: bump.id,
    bookingId: booking.id,
    channel: "whatsapp",
    template: "bump_alert_renter",
    messageBody: `You've been bumped from ${villa.title}. A full-price booking came in via ${bump.external_platform}. You have until ${bump.deadline} to leave. Open the app to browse alternative villas.`,
  });

  // Also create in-app notification for renter
  await createNotification({
    userId: bump.renter_id,
    bumpId: bump.id,
    bookingId: booking.id,
    channel: "in_app",
    template: "bump_alert_renter",
    messageBody: `You've been bumped from ${villa.title}. Deadline: ${bump.deadline}.`,
  });

  // Confirm to owner
  await createNotification({
    userId: bump.owner_id,
    bumpId: bump.id,
    bookingId: booking.id,
    channel: "whatsapp",
    template: "bump_confirmed_owner",
    messageBody: `Bump triggered on ${villa.title}. Guest has been notified and must leave by ${bump.deadline}.`,
  });
}

export async function onRenterRebooked(
  newBooking: Booking,
  originalBump: Bump
): Promise<void> {
  // Notify renter of new booking
  await createNotification({
    userId: newBooking.renter_id,
    bookingId: newBooking.id,
    bumpId: originalBump.id,
    channel: "whatsapp",
    template: "renter_rebooked",
    messageBody: `You've rebooked! Your new villa is confirmed for ${newBooking.check_in} to ${newBooking.check_out}.`,
  });

  // Notify original owner that bumped renter is leaving
  await createNotification({
    userId: originalBump.owner_id,
    bumpId: originalBump.id,
    channel: "whatsapp",
    template: "renter_rebooked_owner",
    messageBody: `Your bumped guest has rebooked at another villa and will be leaving.`,
  });
}

export async function onPayoutCompleted(
  payout: Payout,
  villa: Villa
): Promise<void> {
  await createNotification({
    userId: payout.owner_id,
    bookingId: payout.booking_id,
    channel: "whatsapp",
    template: "payout_completed_owner",
    messageBody: `Payout of Rp ${payout.amount_idr.toLocaleString("id-ID")} for ${villa.title} (${payout.nights_paid} nights) has been sent to your bank account.`,
  });
}

export async function onBookingExpired(booking: Booking): Promise<void> {
  await createNotification({
    userId: booking.renter_id,
    bookingId: booking.id,
    channel: "whatsapp",
    template: "booking_expired",
    messageBody: `Your booking request has expired because the owner did not respond in time. Please try another villa.`,
  });

  await createNotification({
    userId: booking.renter_id,
    bookingId: booking.id,
    channel: "in_app",
    template: "booking_expired",
    messageBody: `Booking request expired — owner did not respond.`,
  });
}

export async function onPreCheckinCancellation(
  booking: Booking,
  villa: Villa
): Promise<void> {
  await createNotification({
    userId: booking.renter_id,
    bookingId: booking.id,
    channel: "whatsapp",
    template: "pre_checkin_cancelled",
    messageBody: `Your booking at ${villa.title} has been cancelled because a full-price booking was received before your check-in. You will receive a full refund. Browse other available villas in the app.`,
  });

  await createNotification({
    userId: booking.renter_id,
    bookingId: booking.id,
    channel: "in_app",
    template: "pre_checkin_cancelled",
    messageBody: `Booking at ${villa.title} cancelled (pre-check-in). Full refund incoming.`,
  });
}

// --- Query functions ---

export async function getNotificationsByUser(
  userId: string,
  limit = 50
): Promise<Notification[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<Notification[]>();

  if (error)
    throw new Error(`Failed to fetch notifications: ${error.message}`);
  return data ?? [];
}

export async function countUnread(userId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("status", ["pending", "sent", "delivered"]);

  if (error)
    throw new Error(`Failed to count notifications: ${error.message}`);
  return count ?? 0;
}

export { createNotification };
