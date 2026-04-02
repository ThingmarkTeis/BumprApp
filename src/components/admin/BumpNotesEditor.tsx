"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BumpNotesEditor({
  bumpId,
  initialNotes,
}: {
  bumpId: string;
  initialNotes: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/admin/bumps/${bumpId}/notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5">
        <p className="text-sm text-volcanic/70 whitespace-pre-wrap">
          {notes || "No notes yet."}
        </p>
        <button
          onClick={() => setEditing(true)}
          className="mt-3 text-xs text-bumpr-orange hover:underline"
        >
          {notes ? "Edit notes" : "Add notes"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
        className="w-full rounded-lg border border-volcanic/20 bg-white px-3 py-2 text-sm text-volcanic placeholder:text-volcanic/40 resize-none focus:border-bumpr-orange focus:outline-none focus:ring-1 focus:ring-bumpr-orange"
        placeholder="Add admin notes..."
      />
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-teal px-4 py-1.5 text-xs font-medium text-white hover:bg-teal-dark disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={() => { setEditing(false); setNotes(initialNotes); }}
          className="rounded-lg px-4 py-1.5 text-xs text-volcanic/60 hover:bg-volcanic/5"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
