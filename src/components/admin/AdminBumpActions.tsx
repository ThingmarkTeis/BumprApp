"use client";

import { useRouter } from "next/navigation";
import ConfirmDialog from "./ConfirmDialog";

export default function AdminBumpActions({
  bumpId,
  status,
}: {
  bumpId: string;
  status: string;
}) {
  const router = useRouter();

  return (
    <div className="flex gap-2">
      {status === "active" && (
        <>
          <ConfirmDialog
            title="Resolve Bump"
            description="This will mark the bump as resolved and complete the associated booking. Financials will be calculated based on the deadline."
            confirmLabel="Resolve"
            onConfirm={async () => {
              await fetch(`/api/admin/bumps/${bumpId}/resolve`, { method: "POST" });
              router.refresh();
            }}
          >
            <button className="text-xs text-teal hover:underline">Resolve</button>
          </ConfirmDialog>
          <ConfirmDialog
            title="Flag for Review"
            description="This bump will be flagged for admin review. It may be an unverified external booking."
            confirmLabel="Flag"
            destructive
            onConfirm={async () => {
              await fetch(`/api/admin/bumps/${bumpId}/flag`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes: "Flagged for manual review" }),
              });
              router.refresh();
            }}
          >
            <button className="text-xs text-amber-dark hover:underline">Flag</button>
          </ConfirmDialog>
        </>
      )}
      {status === "admin_review" && (
        <ConfirmDialog
          title="Resolve Bump"
          description="Resolve this flagged bump after review."
          confirmLabel="Resolve"
          onConfirm={async () => {
            await fetch(`/api/admin/bumps/${bumpId}/resolve`, { method: "POST" });
            router.refresh();
          }}
        >
          <button className="text-xs text-teal hover:underline">Resolve</button>
        </ConfirmDialog>
      )}
    </div>
  );
}
