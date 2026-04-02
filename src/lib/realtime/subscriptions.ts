"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export function subscribeToAdminBookings(
  onUpdate: () => void
): RealtimeChannel {
  const supabase = createClient();
  return supabase
    .channel("admin-bookings")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "bookings",
      },
      () => onUpdate()
    )
    .subscribe();
}

export function subscribeToAdminBumps(
  onUpdate: () => void
): RealtimeChannel {
  const supabase = createClient();
  return supabase
    .channel("admin-bumps")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "bumps",
      },
      () => onUpdate()
    )
    .subscribe();
}

export function subscribeToAdminPayments(
  onUpdate: () => void
): RealtimeChannel {
  const supabase = createClient();
  return supabase
    .channel("admin-payments")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "payments",
      },
      () => onUpdate()
    )
    .subscribe();
}

export function unsubscribe(channel: RealtimeChannel): void {
  const supabase = createClient();
  supabase.removeChannel(channel);
}
