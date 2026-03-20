"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/auth/get-user-role";
import type { Database } from "@/lib/supabase/types";
import {
  subscribeToRenterBookings,
  subscribeToRenterBumps,
  subscribeToOwnerBookings,
  subscribeToOwnerBumps,
  subscribeToNotifications,
  unsubscribe,
} from "@/lib/realtime/subscriptions";
import { ToastContext, useToastState } from "@/hooks/useToast";
import ToastContainer from "@/components/ui/Toast";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export default function RealtimeProvider({
  userId,
  role,
  villaIds,
  children,
}: {
  userId: string;
  role: UserRole;
  villaIds: string[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const toastState = useToastState();
  const { showToast } = toastState;
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const handleNotification = useCallback(
    (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 20));
      if (notification.channel === "in_app") {
        setUnreadCount((c) => c + 1);
      }

      // Show toast based on template
      const template = notification.template;
      if (template === "bump_alert_renter") {
        showToast({
          type: "warning",
          title: "You've been bumped!",
          message: "Tap to see your options.",
          action: notification.booking_id
            ? () => router.push(`/booking/${notification.booking_id}/bumped`)
            : undefined,
        });
      } else if (template === "booking_confirmed_renter") {
        showToast({
          type: "success",
          title: "Booking confirmed!",
          message: notification.message_body ?? undefined,
        });
      } else if (template === "booking_request_owner") {
        showToast({
          type: "info",
          title: "New booking request",
          message: notification.message_body ?? undefined,
          action: notification.booking_id
            ? () => router.push(`/booking/${notification.booking_id}/approve`)
            : undefined,
        });
      } else if (template === "payout_completed_owner") {
        showToast({
          type: "success",
          title: "Payout sent!",
          message: notification.message_body ?? undefined,
        });
      } else if (template.includes("confirmed")) {
        showToast({
          type: "success",
          title: "Booking confirmed",
          message: notification.message_body ?? undefined,
        });
      }
    },
    [showToast, router]
  );

  useEffect(() => {
    const channels: RealtimeChannel[] = [];

    // Notifications (all roles)
    channels.push(subscribeToNotifications(userId, handleNotification));

    if (role === "renter") {
      channels.push(
        subscribeToRenterBookings(userId, () => {
          router.refresh();
        })
      );
      channels.push(
        subscribeToRenterBumps(userId, (bump) => {
          showToast({
            type: "warning",
            title: "You've been bumped!",
            message: "Tap to see your options.",
            action: () => router.push(`/booking/${bump.booking_id}/bumped`),
          });
          router.refresh();
        })
      );
    }

    if (role === "owner" && villaIds.length > 0) {
      channels.push(
        subscribeToOwnerBookings(villaIds, () => {
          router.refresh();
        })
      );
      channels.push(
        subscribeToOwnerBumps(userId, () => {
          router.refresh();
        })
      );
    }

    return () => {
      channels.forEach(unsubscribe);
    };
  }, [userId, role, villaIds, handleNotification, showToast, router]);

  return (
    <ToastContext value={toastState}>
      <RealtimeContext value={{ unreadCount, setUnreadCount, notifications, setNotifications }}>
        {children}
        <ToastContainer />
      </RealtimeContext>
    </ToastContext>
  );
}

// Context for notification state
import { createContext, useContext } from "react";

interface RealtimeContextValue {
  unreadCount: number;
  setUnreadCount: (n: number | ((prev: number) => number)) => void;
  notifications: Notification[];
  setNotifications: (n: Notification[] | ((prev: Notification[]) => Notification[])) => void;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  unreadCount: 0,
  setUnreadCount: () => {},
  notifications: [],
  setNotifications: () => {},
});

export function useRealtime() {
  return useContext(RealtimeContext);
}
