"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type Bump = Database["public"]["Tables"]["bumps"]["Row"];
type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export function subscribeToRenterBookings(
  userId: string,
  onUpdate: (booking: Booking) => void
): RealtimeChannel {
  const supabase = createClient();
  return supabase
    .channel(`renter-bookings-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "bookings",
        filter: `renter_id=eq.${userId}`,
      },
      (payload) => {
        onUpdate(payload.new as Booking);
      }
    )
    .subscribe();
}

export function subscribeToOwnerBookings(
  villaIds: string[],
  onUpdate: (booking: Booking) => void
): RealtimeChannel {
  const supabase = createClient();
  return supabase
    .channel(`owner-bookings-${villaIds[0] ?? "none"}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "bookings",
        filter: `villa_id=in.(${villaIds.join(",")})`,
      },
      (payload) => {
        onUpdate(payload.new as Booking);
      }
    )
    .subscribe();
}

export function subscribeToRenterBumps(
  userId: string,
  onBump: (bump: Bump) => void
): RealtimeChannel {
  const supabase = createClient();
  return supabase
    .channel(`renter-bumps-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "bumps",
        filter: `renter_id=eq.${userId}`,
      },
      (payload) => {
        onBump(payload.new as Bump);
      }
    )
    .subscribe();
}

export function subscribeToOwnerBumps(
  userId: string,
  onUpdate: (bump: Bump) => void
): RealtimeChannel {
  const supabase = createClient();
  return supabase
    .channel(`owner-bumps-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "bumps",
        filter: `owner_id=eq.${userId}`,
      },
      (payload) => {
        onUpdate(payload.new as Bump);
      }
    )
    .subscribe();
}

export function subscribeToNotifications(
  userId: string,
  onNotification: (notification: Notification) => void
): RealtimeChannel {
  const supabase = createClient();
  return supabase
    .channel(`notifications-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onNotification(payload.new as Notification);
      }
    )
    .subscribe();
}

export function unsubscribe(channel: RealtimeChannel): void {
  const supabase = createClient();
  supabase.removeChannel(channel);
}
