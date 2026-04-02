"use client";

import { useState } from "react";

export default function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  children,
  destructive,
  inputLabel,
  inputPlaceholder,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: (inputValue?: string) => Promise<void> | void;
  children: React.ReactNode;
  destructive?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm(inputLabel ? inputValue : undefined);
    } finally {
      setLoading(false);
      setOpen(false);
      setInputValue("");
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
            {inputLabel && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-volcanic mb-1">{inputLabel}</label>
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={inputPlaceholder}
                  rows={3}
                  className="w-full rounded-lg border border-volcanic/20 bg-white px-3 py-2 text-sm text-volcanic placeholder:text-volcanic/40 resize-none focus:border-bumpr-orange focus:outline-none focus:ring-1 focus:ring-bumpr-orange"
                />
              </div>
            )}
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => { setOpen(false); setInputValue(""); }}
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
