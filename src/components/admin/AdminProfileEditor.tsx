"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProfileData {
  full_name: string;
  email: string;
  phone: string;
  preferred_currency: string;
  language: string;
}

interface OwnerData {
  business_name: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
  id_type: string;
  id_number: string;
}

export default function AdminProfileEditor({
  userId,
  profile,
  ownerProfile,
}: {
  userId: string;
  profile: ProfileData;
  ownerProfile: OwnerData | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState<ProfileData>({ ...profile });
  const [ownerForm, setOwnerForm] = useState<OwnerData>(
    ownerProfile ?? {
      business_name: "",
      bank_name: "",
      bank_account_number: "",
      bank_account_holder: "",
      id_type: "",
      id_number: "",
    }
  );

  function updateProfile(key: keyof ProfileData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateOwner(key: keyof OwnerData, value: string) {
    setOwnerForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const body: Record<string, unknown> = { ...form };
      if (ownerProfile) {
        Object.assign(body, ownerForm);
      }

      const res = await fetch(`/api/admin/users/${userId}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile Fields */}
      <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5">
        <h3 className="font-serif text-lg font-semibold text-volcanic mb-4">Edit Profile</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-volcanic mb-1">Full Name</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => updateProfile("full_name", e.target.value)}
              placeholder="Enter full name"
              className="w-full rounded-lg border border-volcanic/20 px-3 py-2 text-sm text-volcanic placeholder:text-volcanic/40 focus:border-bumpr-orange focus:outline-none focus:ring-1 focus:ring-bumpr-orange"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-volcanic mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateProfile("email", e.target.value)}
              className="w-full rounded-lg border border-volcanic/20 px-3 py-2 text-sm text-volcanic focus:border-bumpr-orange focus:outline-none focus:ring-1 focus:ring-bumpr-orange"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-volcanic mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => updateProfile("phone", e.target.value)}
              placeholder="+62 812 3456 7890"
              className="w-full rounded-lg border border-volcanic/20 px-3 py-2 text-sm text-volcanic font-mono placeholder:text-volcanic/40 focus:border-bumpr-orange focus:outline-none focus:ring-1 focus:ring-bumpr-orange"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-volcanic mb-1">Preferred Currency</label>
            <select
              value={form.preferred_currency}
              onChange={(e) => updateProfile("preferred_currency", e.target.value)}
              className="w-full rounded-lg border border-volcanic/20 px-3 py-2 text-sm text-volcanic"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="AUD">AUD</option>
              <option value="SGD">SGD</option>
              <option value="DKK">DKK</option>
              <option value="IDR">IDR</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-volcanic mb-1">Language</label>
            <select
              value={form.language}
              onChange={(e) => updateProfile("language", e.target.value)}
              className="w-full rounded-lg border border-volcanic/20 px-3 py-2 text-sm text-volcanic"
            >
              <option value="en">English</option>
              <option value="id">Bahasa Indonesia</option>
            </select>
          </div>
        </div>
      </div>

      {/* Owner Profile Fields */}
      {ownerProfile && (
        <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5">
          <h3 className="font-serif text-lg font-semibold text-volcanic mb-4">Owner Details</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-volcanic mb-1">Business Name</label>
              <input
                type="text"
                value={ownerForm.business_name}
                onChange={(e) => updateOwner("business_name", e.target.value)}
                placeholder="e.g. Bali Villa Rentals PT"
                className="w-full rounded-lg border border-volcanic/20 px-3 py-2 text-sm text-volcanic placeholder:text-volcanic/40 focus:border-bumpr-orange focus:outline-none focus:ring-1 focus:ring-bumpr-orange"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-volcanic mb-1">Bank Name</label>
              <input
                type="text"
                value={ownerForm.bank_name}
                onChange={(e) => updateOwner("bank_name", e.target.value)}
                placeholder="e.g. BCA, Mandiri, BNI"
                className="w-full rounded-lg border border-volcanic/20 px-3 py-2 text-sm text-volcanic placeholder:text-volcanic/40 focus:border-bumpr-orange focus:outline-none focus:ring-1 focus:ring-bumpr-orange"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-volcanic mb-1">Account Holder</label>
              <input
                type="text"
                value={ownerForm.bank_account_holder}
                onChange={(e) => updateOwner("bank_account_holder", e.target.value)}
                placeholder="Name on bank account"
                className="w-full rounded-lg border border-volcanic/20 px-3 py-2 text-sm text-volcanic placeholder:text-volcanic/40 focus:border-bumpr-orange focus:outline-none focus:ring-1 focus:ring-bumpr-orange"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-volcanic mb-1">Account Number</label>
              <input
                type="text"
                value={ownerForm.bank_account_number}
                onChange={(e) => updateOwner("bank_account_number", e.target.value)}
                placeholder="Bank account number"
                className="w-full rounded-lg border border-volcanic/20 px-3 py-2 text-sm text-volcanic font-mono placeholder:text-volcanic/40 focus:border-bumpr-orange focus:outline-none focus:ring-1 focus:ring-bumpr-orange"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-volcanic mb-1">ID Type</label>
              <select
                value={ownerForm.id_type}
                onChange={(e) => updateOwner("id_type", e.target.value)}
                className="w-full rounded-lg border border-volcanic/20 px-3 py-2 text-sm text-volcanic"
              >
                <option value="">Select...</option>
                <option value="ktp">KTP (Indonesian ID)</option>
                <option value="passport">Passport</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-volcanic mb-1">ID Number</label>
              <input
                type="text"
                value={ownerForm.id_number}
                onChange={(e) => updateOwner("id_number", e.target.value)}
                placeholder="KTP or passport number"
                className="w-full rounded-lg border border-volcanic/20 px-3 py-2 text-sm text-volcanic font-mono placeholder:text-volcanic/40 focus:border-bumpr-orange focus:outline-none focus:ring-1 focus:ring-bumpr-orange"
              />
            </div>
          </div>
        </div>
      )}

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-teal px-5 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-teal">Saved!</p>}
      </div>
    </div>
  );
}
