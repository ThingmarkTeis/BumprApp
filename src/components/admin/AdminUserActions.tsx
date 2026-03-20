"use client";

import { useRouter } from "next/navigation";
import ConfirmDialog from "./ConfirmDialog";

export default function AdminUserActions({
  userId,
  isAdmin,
  isOwner,
  isVerified,
}: {
  userId: string;
  isAdmin: boolean;
  isOwner: boolean;
  isVerified: boolean;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-2">
      {/* Role change: Make/Remove Owner */}
      {!isOwner ? (
        <ConfirmDialog
          title="Make Owner"
          description="This will create an owner profile for this user. They will see the owner dashboard when they log in."
          confirmLabel="Make Owner"
          onConfirm={async () => {
            await fetch(`/api/admin/users/${userId}/make-owner`, { method: "POST" });
            router.refresh();
          }}
        >
          <button className="text-xs text-bumpr-orange hover:underline">Make owner</button>
        </ConfirmDialog>
      ) : (
        <ConfirmDialog
          title="Remove Owner Role"
          description="This will delete their owner profile. They will become a renter. Any villas assigned to them will need to be reassigned."
          confirmLabel="Remove Owner"
          destructive
          onConfirm={async () => {
            await fetch(`/api/admin/users/${userId}/remove-owner`, { method: "POST" });
            router.refresh();
          }}
        >
          <button className="text-xs text-red-500 hover:underline">Remove owner</button>
        </ConfirmDialog>
      )}

      {/* Toggle admin */}
      <ConfirmDialog
        title={isAdmin ? "Remove Admin" : "Make Admin"}
        description={
          isAdmin
            ? "This user will lose admin access."
            : "This user will gain full admin access."
        }
        confirmLabel={isAdmin ? "Remove" : "Make Admin"}
        destructive={isAdmin}
        onConfirm={async () => {
          await fetch(`/api/admin/users/${userId}/toggle-admin`, { method: "POST" });
          router.refresh();
        }}
      >
        <button className="text-xs text-bumpr-orange hover:underline">
          {isAdmin ? "Remove admin" : "Make admin"}
        </button>
      </ConfirmDialog>

      {/* Verify owner */}
      {isOwner && (
        <ConfirmDialog
          title={isVerified ? "Unverify Owner" : "Verify Owner"}
          description={
            isVerified
              ? "This owner will be marked as unverified."
              : "This will verify the owner's identity and bank details."
          }
          confirmLabel={isVerified ? "Unverify" : "Verify"}
          onConfirm={async () => {
            await fetch(`/api/admin/users/${userId}/verify-owner`, { method: "POST" });
            router.refresh();
          }}
        >
          <button className="text-xs text-bumpr-orange hover:underline">
            {isVerified ? "Unverify" : "Verify"}
          </button>
        </ConfirmDialog>
      )}

      {/* Delete user */}
      <ConfirmDialog
        title="Delete User"
        description="This will permanently delete this user account and all their data. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          await fetch(`/api/admin/users/${userId}/delete`, { method: "POST" });
          router.refresh();
        }}
      >
        <button className="text-xs text-red-500 hover:underline">Delete</button>
      </ConfirmDialog>
    </div>
  );
}
