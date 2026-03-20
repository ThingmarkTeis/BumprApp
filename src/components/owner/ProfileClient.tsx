"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface ProfileProps {
  profile: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    preferredCurrency: string;
  };
  ownerData: {
    bankName: string | null;
    bankAccountNumber: string | null;
    bankAccountHolder: string | null;
    verified: boolean;
  } | null;
}

function maskAccount(num: string | null): string {
  if (!num || num.length < 4) return "••••";
  return "••••" + num.slice(-4);
}

export default function ProfileClient({ profile, ownerData }: ProfileProps) {
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [currency, setCurrency] = useState(profile.preferredCurrency);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ phone, preferred_currency: currency })
      .eq("id", profile.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-8">
      {/* Basic info */}
      <section className="rounded-[16px] bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5">
        <h2 className="font-serif text-lg font-semibold text-volcanic mb-4">
          Personal Info
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-warm-gray-dark mb-1">Name</label>
            <p className="text-volcanic font-medium">{profile.fullName}</p>
          </div>
          <div>
            <label className="block text-sm text-warm-gray-dark mb-1">Email</label>
            <p className="text-volcanic">{profile.email}</p>
          </div>
          <div>
            <label className="block text-sm text-warm-gray-dark mb-1">
              Phone (WhatsApp)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+6281234567890"
              className="w-full rounded-lg border border-warm-gray-light px-4 py-2.5 text-volcanic"
            />
          </div>
          <div>
            <label className="block text-sm text-warm-gray-dark mb-1">
              Preferred Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-lg border border-warm-gray-light px-4 py-2.5 text-volcanic"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="AUD">AUD</option>
              <option value="SGD">SGD</option>
              <option value="DKK">DKK</option>
            </select>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-bumpr-orange px-6 py-2.5 text-sm font-medium text-white hover:bg-bumpr-orange-dark disabled:opacity-50"
          >
            {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </section>

      {/* Owner bank details */}
      {ownerData && (
        <section className="rounded-[16px] bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-semibold text-volcanic">
              Bank Details
            </h2>
            {ownerData.verified ? (
              <span className="rounded-full bg-teal/20 px-2.5 py-0.5 text-xs font-medium text-teal">
                Verified
              </span>
            ) : (
              <span className="rounded-full bg-bumpr-orange/20 px-2.5 py-0.5 text-xs font-medium text-bumpr-orange-dark">
                Pending verification
              </span>
            )}
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-warm-gray-dark mb-0.5">Bank</label>
              <p className="text-volcanic">{ownerData.bankName ?? "Not set"}</p>
            </div>
            <div>
              <label className="block text-sm text-warm-gray-dark mb-0.5">Account Number</label>
              <p className="text-volcanic font-mono">
                {maskAccount(ownerData.bankAccountNumber)}
              </p>
            </div>
            <div>
              <label className="block text-sm text-warm-gray-dark mb-0.5">Account Holder</label>
              <p className="text-volcanic">{ownerData.bankAccountHolder ?? "Not set"}</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-warm-gray">
            Contact support to update your bank details.
          </p>
        </section>
      )}

      {/* Sign out */}
      <button
        onClick={async () => {
          const supabase = createClient();
          await supabase.auth.signOut();
          window.location.href = "/login";
        }}
        className="w-full rounded-xl border-2 border-volcanic text-volcanic py-3.5 text-sm font-semibold hover:bg-volcanic hover:text-cream transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
