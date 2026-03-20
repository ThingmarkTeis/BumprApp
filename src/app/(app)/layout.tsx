import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth/get-user-role";
import { createAdminClient } from "@/lib/supabase/admin";
import AppNav from "@/components/nav/AppNav";
import RealtimeProvider from "@/components/providers/RealtimeProvider";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await getUserRole();

  if (!result) {
    redirect("/login");
  }

  // Get villa IDs for owner realtime subscriptions
  let villaIds: string[] = [];
  if (result.role === "owner") {
    const supabase = createAdminClient();
    const { data: villas } = await supabase
      .from("villas")
      .select("id")
      .eq("owner_id", result.userId);
    villaIds = (villas ?? []).map((v: { id: string }) => v.id);
  }

  return (
    <div className="min-h-screen bg-cream">
      <RealtimeProvider
        userId={result.userId}
        role={result.role}
        villaIds={villaIds}
      >
        <AppNav role={result.role} />
        {/* pb-16 = bottom nav height on mobile, md:pl-64 = sidebar width on desktop */}
        <main className="pb-16 md:pb-0 md:pl-64">{children}</main>
      </RealtimeProvider>
    </div>
  );
}
