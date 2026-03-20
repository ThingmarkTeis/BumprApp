"use client";

import { useToast } from "@/hooks/useToast";

const TYPE_STYLES = {
  info: "bg-teal text-white",
  warning: "bg-bumpr-orange text-white",
  success: "bg-teal text-white",
  error: "bg-red-600 text-white",
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-[16px] px-5 py-4 shadow-[0_8px_32px_rgba(26,26,26,0.08)] ${TYPE_STYLES[toast.type]} animate-[slideIn_0.3s_ease-out] cursor-pointer`}
          onClick={() => {
            if (toast.action) toast.action();
            dismissToast(toast.id);
          }}
          role="alert"
        >
          <p className="font-semibold text-sm">{toast.title}</p>
          {toast.message && (
            <p className="text-sm opacity-90 mt-0.5">{toast.message}</p>
          )}
        </div>
      ))}

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
