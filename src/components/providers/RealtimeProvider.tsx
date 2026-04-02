"use client";

import { useEffect, createContext, useContext } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/auth/get-user-role";
import {
  subscribeToAdminBookings,
  subscribeToAdminBumps,
  subscribeToAdminPayments,
  unsubscribe,
} from "@/lib/realtime/subscriptions";
import { ToastContext, useToastState } from "@/hooks/useToast";
import ToastContainer from "@/components/ui/Toast";

interface RealtimeContextValue {
  // Extensible for future admin-specific state
}

const RealtimeContext = createContext<RealtimeContextValue>({});

export function useRealtime() {
  return useContext(RealtimeContext);
}

export default function RealtimeProvider({
  userId,
  role,
  children,
}: {
  userId: string;
  role: UserRole;
  children: React.ReactNode;
}) {
  const toastState = useToastState();
  const { showToast } = toastState;

  useEffect(() => {
    if (role !== "admin") return;

    const channels: RealtimeChannel[] = [];

    channels.push(
      subscribeToAdminBookings(() => {
        showToast({
          type: "info",
          title: "Booking update",
          message: "A booking has been created or updated.",
        });
      })
    );

    channels.push(
      subscribeToAdminBumps(() => {
        showToast({
          type: "warning",
          title: "Bump activity",
          message: "A bump has been triggered or updated.",
        });
      })
    );

    channels.push(
      subscribeToAdminPayments(() => {
        showToast({
          type: "info",
          title: "Payment update",
          message: "A payment status has changed.",
        });
      })
    );

    return () => {
      channels.forEach(unsubscribe);
    };
  }, [userId, role, showToast]);

  return (
    <ToastContext value={toastState}>
      <RealtimeContext value={{}}>
        {children}
        <ToastContainer />
      </RealtimeContext>
    </ToastContext>
  );
}
