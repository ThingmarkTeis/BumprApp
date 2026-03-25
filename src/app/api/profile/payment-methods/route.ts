import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth/get-api-user";
import type { SavedPaymentMethod } from "@/types/profile";

// GET /api/profile/payment-methods — List saved payment methods
export async function GET(request: Request) {
  const user = await getApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Placeholder — Xendit saved cards integration not yet implemented.
  // Returns the correct response shape so the frontend can build against it.
  const methods: SavedPaymentMethod[] = [];

  return NextResponse.json({ payment_methods: methods });
}
