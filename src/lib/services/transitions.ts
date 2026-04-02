import type { BookingStatus, BumpStatus } from "@/lib/supabase/types";

const VALID_BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  requested: ["approved", "expired", "cancelled"],
  approved: ["confirmed", "cancelled"],
  confirmed: ["active", "bumping", "pre_checkin_cancelled", "cancelled"],
  active: ["bumping", "bumped", "completed"],
  bumping: ["bumped"],
  bumped: ["completed"],
  completed: [],
  cancelled: [],
  expired: [],
  pre_checkin_cancelled: [],
};

const VALID_BUMP_TRANSITIONS: Record<BumpStatus, BumpStatus[]> = {
  active: ["resolved", "admin_review"],
  admin_review: ["resolved"],
  resolved: [],
};

export function validateBookingTransition(
  from: BookingStatus,
  to: BookingStatus
): true {
  const allowed = VALID_BOOKING_TRANSITIONS[from];
  if (!allowed) {
    throw new Error(`Unknown booking status: '${from}'.`);
  }
  if (!allowed.includes(to)) {
    const validOptions = allowed.length
      ? allowed.join(", ")
      : "none (terminal state)";
    throw new Error(
      `Invalid transition: cannot move booking from '${from}' to '${to}'. Valid transitions from '${from}': ${validOptions}.`
    );
  }
  return true;
}

export function validateBumpTransition(
  from: BumpStatus,
  to: BumpStatus
): true {
  const allowed = VALID_BUMP_TRANSITIONS[from];
  if (!allowed) {
    throw new Error(`Unknown bump status: '${from}'.`);
  }
  if (!allowed.includes(to)) {
    const validOptions = allowed.length
      ? allowed.join(", ")
      : "none (terminal state)";
    throw new Error(
      `Invalid transition: cannot move bump from '${from}' to '${to}'. Valid transitions from '${from}': ${validOptions}.`
    );
  }
  return true;
}
