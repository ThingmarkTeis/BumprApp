"use client";

import { useEffect } from "react";

export default function DetailPanel({
  open,
  onClose,
  title,
  children,
  width = "lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const widthClass = {
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  }[width];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-volcanic/30" onClick={onClose} />
      <div className={`relative w-full ${widthClass} bg-white shadow-xl flex flex-col overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-warm-gray-light px-6 py-4">
          <h2 className="font-serif text-lg font-semibold text-volcanic">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-warm-gray-dark hover:bg-cream-dark hover:text-volcanic"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
