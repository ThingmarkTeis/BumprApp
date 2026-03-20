"use client";

import { useState } from "react";

export default function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  children,
  destructive,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  children: React.ReactNode;
  destructive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{children}</span>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-volcanic/40">
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-volcanic">{title}</h3>
            <p className="mt-2 text-sm text-volcanic/60">{description}</p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-2 text-sm text-volcanic/60 hover:bg-volcanic/5"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  destructive
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-teal hover:bg-teal-dark"
                }`}
              >
                {loading ? "..." : confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
