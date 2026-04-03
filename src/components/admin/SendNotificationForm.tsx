"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
}

export default function SendNotificationForm({ users }: { users: User[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [channel, setChannel] = useState<"in_app" | "whatsapp" | "email">("in_app");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [search, setSearch] = useState("");

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSend() {
    if (!userId || !message.trim()) return;
    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, channel, message: message.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send");
      }

      setResult({ type: "success", text: "Notification sent!" });
      setMessage("");
      setUserId("");
      router.refresh();
      setTimeout(() => { setResult(null); setOpen(false); }, 2000);
    } catch (err) {
      setResult({ type: "error", text: err instanceof Error ? err.message : "Failed" });
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-bumpr-orange px-4 py-2 text-sm font-medium text-white hover:bg-bumpr-orange-dark"
      >
        + Send Notification
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-lg font-semibold text-volcanic">Send Notification</h3>
        <button onClick={() => setOpen(false)} className="text-sm text-warm-gray-dark hover:text-volcanic">Cancel</button>
      </div>

      <div className="space-y-4">
        {/* User search + select */}
        <div>
          <label className="block text-sm font-medium text-volcanic mb-1">To</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by name or email..."
            className="w-full rounded-lg border border-volcanic/20 px-3 py-2 text-sm text-volcanic placeholder:text-volcanic/40 focus:border-bumpr-orange focus:outline-none focus:ring-1 focus:ring-bumpr-orange mb-2"
          />
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full rounded-lg border border-volcanic/20 px-3 py-2 text-sm text-volcanic"
          >
            <option value="">Select user...</option>
            {filteredUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name || "Unnamed"} — {u.email}
              </option>
            ))}
          </select>
        </div>

        {/* Channel */}
        <div>
          <label className="block text-sm font-medium text-volcanic mb-1">Channel</label>
          <div className="flex gap-2">
            {(["in_app", "whatsapp", "email"] as const).map((ch) => (
              <button
                key={ch}
                onClick={() => setChannel(ch)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  channel === ch
                    ? "bg-teal text-white"
                    : "bg-cream-dark text-warm-gray-dark hover:bg-cream"
                }`}
              >
                {ch === "in_app" ? "In-App" : ch === "whatsapp" ? "WhatsApp" : "Email"}
              </button>
            ))}
          </div>
          {channel === "whatsapp" && (
            <p className="mt-1 text-xs text-bumpr-orange">WhatsApp requires Twilio — will be queued as pending until Twilio integration sends it.</p>
          )}
          {channel === "email" && (
            <p className="mt-1 text-xs text-bumpr-orange">Email sending not yet configured — will be recorded as pending.</p>
          )}
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-volcanic mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Type your message..."
            className="w-full rounded-lg border border-volcanic/20 px-3 py-2 text-sm text-volcanic placeholder:text-volcanic/40 resize-none focus:border-bumpr-orange focus:outline-none focus:ring-1 focus:ring-bumpr-orange"
          />
        </div>

        {/* Send */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSend}
            disabled={sending || !userId || !message.trim()}
            className="rounded-lg bg-teal px-5 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send"}
          </button>
          {result && (
            <p className={`text-sm ${result.type === "success" ? "text-teal" : "text-red-600"}`}>
              {result.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
