import type { Database } from "@/lib/supabase/types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];

const INITIAL_PROTECTION_HOURS = 12;
const REBOOK_PROTECTION_HOURS = 6;

export function calculateProtectionEnd(
  checkedInAt: Date,
  isRebook: boolean
): Date {
  const hours = isRebook ? REBOOK_PROTECTION_HOURS : INITIAL_PROTECTION_HOURS;
  const end = new Date(checkedInAt.getTime());
  end.setHours(end.getHours() + hours);
  return end;
}

export function isProtectionActive(protectionEndsAt: Date): boolean {
  return new Date() < protectionEndsAt;
}

export function canBump(booking: Booking): {
  allowed: boolean;
  reason?: string;
} {
  if (booking.status !== "active") {
    return {
      allowed: false,
      reason: `Booking status is '${booking.status}'. Only 'active' bookings can be bumped.`,
    };
  }

  if (!booking.protection_ends_at) {
    return {
      allowed: false,
      reason: "Booking has no protection_ends_at set. Check-in may not have completed properly.",
    };
  }

  const protectionEnd = new Date(booking.protection_ends_at);
  if (isProtectionActive(protectionEnd)) {
    return {
      allowed: false,
      reason: `Booking is still in its protection window. Bumpable after ${protectionEnd.toISOString()}.`,
    };
  }

  return { allowed: true };
}
