import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth/get-user-role";
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

  return (
    <div className="min-h-screen bg-cream">
      <RealtimeProvider userId={result.userId} role={result.role}>
        <main>{children}</main>
      </RealtimeProvider>
    </div>
  );
}
