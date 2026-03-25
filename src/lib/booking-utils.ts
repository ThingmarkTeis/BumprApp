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
