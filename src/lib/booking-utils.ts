import { calculateNights } from "@/lib/utils/dates";

const SERVICE_FEE_RATE = 0.15;
const PROTECTION_HOURS = 12;
const BUMP_NOTICE_HOURS = 18;

export interface ProtectionStatus {
  is_protected: boolean;
  protected_until: string | null;
  bump_deadline_if_bumped_now: string | null;
}

export function calculateProtectionStatus(booking: {
  check_in: string;
  arrival_time: string | null;
  status: string;
}): ProtectionStatus {
  // Only active/confirmed bookings have protection
  if (!["confirmed", "active"].includes(booking.status)) {
    return { is_protected: false, protected_until: null, bump_deadline_if_bumped_now: null };
  }

  const arrivalTime = booking.arrival_time ?? "14:00";
  const checkInDateTime = new Date(`${booking.check_in}T${arrivalTime}:00`);
  const protectedUntil = new Date(checkInDateTime.getTime() + PROTECTION_HOURS * 60 * 60 * 1000);
  const now = new Date();
  const isProtected = now < protectedUntil;

  return {
    is_protected: isProtected,
    protected_until: protectedUntil.toISOString(),
    bump_deadline_if_bumped_now: isProtected
      ? null
      : new Date(now.getTime() + BUMP_NOTICE_HOURS * 60 * 60 * 1000).toISOString(),
  };
}

export function calculateTotalAmount(standbyRateIdr: number, checkIn: string, checkOut: string) {
  const nights = calculateNights(checkIn, checkOut);
  const totalAmountIdr = standbyRateIdr * nights;
  const serviceFeeIdr = Math.round(totalAmountIdr * SERVICE_FEE_RATE);
  const totalChargedIdr = totalAmountIdr + serviceFeeIdr;
  return { nights, totalAmountIdr, serviceFeeIdr, totalChargedIdr };
}

const MIN_AUTO_BUMP_DELAY_MINUTES = 30;

/**
 * Suggests when to fire the auto-bump so the renter's 18h window ends
 * right around Villa B's check-in time.
 */
export function suggestAutoBumpTime(villaBCheckInTime: string): {
  suggested_delay_minutes: number;
  explanation: string;
} {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // Parse the check-in time (HH:MM format)
  const checkInDateTime = new Date(`${today}T${villaBCheckInTime}:00`);

  // If the check-in time has already passed today, assume tomorrow
  if (checkInDateTime <= now) {
    checkInDateTime.setDate(checkInDateTime.getDate() + 1);
  }

  // The bump should fire 18h before Villa B check-in, so the must-leave-by
  // deadline aligns with when the renter can move into Villa B.
  const idealFireTime = new Date(
    checkInDateTime.getTime() - BUMP_NOTICE_HOURS * 60 * 60 * 1000
  );

  const delayMs = idealFireTime.getTime() - now.getTime();
  let delayMinutes = Math.round(delayMs / (60 * 1000));

  if (delayMinutes < MIN_AUTO_BUMP_DELAY_MINUTES) {
    delayMinutes = MIN_AUTO_BUMP_DELAY_MINUTES;
    return {
      suggested_delay_minutes: delayMinutes,
      explanation: `Villa B check-in is at ${villaBCheckInTime}. The ideal auto-bump time has already passed, so we suggest the minimum delay of ${MIN_AUTO_BUMP_DELAY_MINUTES} minutes. Your 18-hour window to leave Villa A will start then.`,
    };
  }

  const hours = Math.floor(delayMinutes / 60);
  const mins = delayMinutes % 60;
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return {
    suggested_delay_minutes: delayMinutes,
    explanation: `Auto-bump fires in ${timeStr} so your 18-hour move-out window ends right at Villa B's check-in time (${villaBCheckInTime}).`,
  };
}
