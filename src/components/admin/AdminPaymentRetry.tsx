"use client";

import { useRouter } from "next/navigation";
import ConfirmDialog from "./ConfirmDialog";

export default function AdminPaymentRetry({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();

  if (status !== "failed" && status !== "pending") return null;

  return (
    <ConfirmDialog
      title="Retry Payment"
      description="This will re-attempt the Xendit API call for this payment/payout."
      confirmLabel="Retry"
      onConfirm={async () => {
        await fetch(`/api/admin/payments/${id}/retry`, { method: "POST" });
        router.refresh();
      }}
    >
      <button className="text-xs text-teal hover:underline">Retry</button>
    </ConfirmDialog>
  );
}
