import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth/get-user-role";
import { createAdminClient } from "@/lib/supabase/admin";
import ProfileClient from "@/components/owner/ProfileClient";
import type { Database } from "@/lib/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default async function ProfilePage() {
  const result = await getUserRole();
  if (!result) redirect("/login");

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", result.userId)
    .single<Profile>();

  if (!profile) redirect("/login");

  // Check if owner
  let ownerData: {
    bank_name: string | null;
    bank_account_number: string | null;
    bank_account_holder: string | null;
    verified: boolean;
  } | null = null;

  if (result.role === "owner") {
    const { data: owner } = await supabase
      .from("owner_profiles")
      .select("bank_name, bank_account_number, bank_account_holder, verified")
      .eq("id", result.userId)
      .single<{
        bank_name: string | null;
        bank_account_number: string | null;
        bank_account_holder: string | null;
        verified: boolean;
      }>();
    ownerData = owner;
  }

  return (
    <div className="px-6 py-8 max-w-lg mx-auto">
      <h1 className="font-serif text-3xl font-bold text-teal mb-6">Profile</h1>
      <ProfileClient
        profile={{
          id: profile.id,
          fullName: profile.full_name,
          email: profile.email,
          phone: profile.phone,
          preferredCurrency: profile.preferred_currency,
        }}
        ownerData={
          ownerData
            ? {
                bankName: ownerData.bank_name,
                bankAccountNumber: ownerData.bank_account_number,
                bankAccountHolder: ownerData.bank_account_holder,
                verified: ownerData.verified,
              }
            : null
        }
      />
    </div>
  );
}
