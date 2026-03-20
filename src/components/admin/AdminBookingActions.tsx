"use client";

import { useRouter } from "next/navigation";
import ConfirmDialog from "./ConfirmDialog";

export default function AdminBookingActions({
  bookingId,
  status,
}: {
  bookingId: string;
  status: string;
}) {
  const router = useRouter();

  const cancellable = ["requested", "approved", "confirmed"].includes(status);
  const completable = ["active", "bumped"].includes(status);

  if (!cancellable && !completable) return null;

  return (
    <div className="flex gap-2">
      {cancellable && (
        <ConfirmDialog
          title="Force Cancel Booking"
          description="This will cancel the booking and notify the renter. Any payments will need to be refunded manually."
          confirmLabel="Cancel Booking"
          destructive
          onConfirm={async () => {
            await fetch(`/api/admin/bookings/${bookingId}/cancel`, { method: "POST" });
            router.refresh();
          }}
        >
          <button className="text-xs text-red-600 hover:underline">Cancel</button>
        </ConfirmDialog>
      )}
      {completable && (
        <ConfirmDialog
          title="Force Complete Booking"
          description="This will mark the booking as completed. Use this only if the guest has left and the system hasn't processed it yet."
          confirmLabel="Complete"
          onConfirm={async () => {
            await fetch(`/api/admin/bookings/${bookingId}/complete`, { method: "POST" });
            router.refresh();
          }}
        >
          <button className="text-xs text-teal hover:underline">Complete</button>
        </ConfirmDialog>
      )}
    </div>
  );
}
