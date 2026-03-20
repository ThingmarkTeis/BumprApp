import { sendWhatsAppTemplate } from "./send";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://bumpr.rent";

// Template 1: New booking request → owner
export async function sendBookingRequestToOwner(params: {
  ownerPhone: string;
  ownerName: string;
  villaName: string;
  renterName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  bookingId: string;
}): Promise<string> {
  const result = await sendWhatsAppTemplate({
    to: params.ownerPhone,
    templateName: "booking_request_owner",
    templateVariables: {
      "1": params.ownerName,
      "2": params.renterName,
      "3": params.villaName,
      "4": params.checkIn,
      "5": params.checkOut,
      "6": String(params.nights),
    },
    buttonUrl: `${APP_URL}/booking/${params.bookingId}`,
  });
  return result.messageSid;
}

// Template 2: Booking confirmed → renter
export async function sendBookingConfirmedToRenter(params: {
  renterPhone: string;
  villaName: string;
  checkIn: string;
  checkOut: string;
  bumpNoticeHours: number;
  bookingId: string;
}): Promise<string> {
  const result = await sendWhatsAppTemplate({
    to: params.renterPhone,
    templateName: "booking_confirmed_renter",
    templateVariables: {
      "1": params.villaName,
      "2": params.checkIn,
      "3": params.checkOut,
      "4": String(params.bumpNoticeHours),
    },
    buttonUrl: `${APP_URL}/booking/${params.bookingId}`,
  });
  return result.messageSid;
}

// Template 3: Booking confirmed → owner
export async function sendBookingConfirmedToOwner(params: {
  ownerPhone: string;
  renterName: string;
  villaName: string;
  checkIn: string;
  checkOut: string;
  nightlyRate: string;
  villaId: string;
}): Promise<string> {
  const result = await sendWhatsAppTemplate({
    to: params.ownerPhone,
    templateName: "booking_confirmed_owner",
    templateVariables: {
      "1": params.renterName,
      "2": params.villaName,
      "3": params.checkIn,
      "4": params.checkOut,
      "5": params.nightlyRate,
    },
    buttonUrl: `${APP_URL}/villa/${params.villaId}/manage`,
  });
  return result.messageSid;
}

// Template 4: BUMP ALERT → renter (CRITICAL)
export async function sendBumpAlertToRenter(params: {
  renterPhone: string;
  villaName: string;
  deadline: string;
  bookingId: string;
}): Promise<string> {
  const result = await sendWhatsAppTemplate({
    to: params.renterPhone,
    templateName: "bump_alert_renter",
    templateVariables: {
      "1": params.villaName,
      "2": params.deadline,
    },
    buttonUrl: `${APP_URL}/booking/${params.bookingId}/bumped`,
  });
  return result.messageSid;
}

// Template 5: Bump confirmed → owner
export async function sendBumpConfirmedToOwner(params: {
  ownerPhone: string;
  villaName: string;
  renterName: string;
  deadline: string;
  bumpId: string;
}): Promise<string> {
  const result = await sendWhatsAppTemplate({
    to: params.ownerPhone,
    templateName: "bump_confirmed_owner",
    templateVariables: {
      "1": params.villaName,
      "2": params.renterName,
      "3": params.deadline,
    },
    buttonUrl: `${APP_URL}/dashboard`,
  });
  return result.messageSid;
}

// Template 6: Renter rebooked → renter
export async function sendRenterRebooked(params: {
  renterPhone: string;
  villaName: string;
  checkIn: string;
  checkOut: string;
  bookingId: string;
}): Promise<string> {
  const result = await sendWhatsAppTemplate({
    to: params.renterPhone,
    templateName: "renter_rebooked",
    templateVariables: {
      "1": params.villaName,
      "2": params.checkIn,
      "3": params.checkOut,
    },
    buttonUrl: `${APP_URL}/booking/${params.bookingId}`,
  });
  return result.messageSid;
}

// Template 7: Renter rebooked → original owner
export async function sendRenterRebookedToOwner(params: {
  ownerPhone: string;
  renterName: string;
  checkoutTime: string;
  villaName: string;
  nightsStayed: number;
  villaId: string;
}): Promise<string> {
  const result = await sendWhatsAppTemplate({
    to: params.ownerPhone,
    templateName: "renter_rebooked_owner",
    templateVariables: {
      "1": params.renterName,
      "2": params.villaName,
      "3": params.checkoutTime,
      "4": String(params.nightsStayed),
    },
    buttonUrl: `${APP_URL}/villa/${params.villaId}/manage`,
  });
  return result.messageSid;
}

// Template 8: Check-in reminder → renter
export async function sendCheckinReminder(params: {
  renterPhone: string;
  villaName: string;
  address: string;
  checkInTime: string;
  bookingId: string;
}): Promise<string> {
  const result = await sendWhatsAppTemplate({
    to: params.renterPhone,
    templateName: "checkin_reminder",
    templateVariables: {
      "1": params.villaName,
      "2": params.address,
      "3": params.checkInTime,
    },
    buttonUrl: `${APP_URL}/booking/${params.bookingId}`,
  });
  return result.messageSid;
}

// Template 9: Payout completed → owner
export async function sendPayoutCompleted(params: {
  ownerPhone: string;
  amount: string;
  villaName: string;
  nights: number;
  payoutId: string;
}): Promise<string> {
  const result = await sendWhatsAppTemplate({
    to: params.ownerPhone,
    templateName: "payout_completed_owner",
    templateVariables: {
      "1": params.amount,
      "2": params.villaName,
      "3": String(params.nights),
    },
    buttonUrl: `${APP_URL}/earnings`,
  });
  return result.messageSid;
}

// Template 10: Checkout reminder → renter
export async function sendCheckoutReminder(params: {
  renterPhone: string;
  villaName: string;
  checkOutTime: string;
  bookingId: string;
}): Promise<string> {
  const result = await sendWhatsAppTemplate({
    to: params.renterPhone,
    templateName: "checkout_reminder",
    templateVariables: {
      "1": params.villaName,
      "2": params.checkOutTime,
    },
    buttonUrl: `${APP_URL}/booking/${params.bookingId}`,
  });
  return result.messageSid;
}
