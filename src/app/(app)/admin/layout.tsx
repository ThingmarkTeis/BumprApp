import { redirect } from "next/navigation";
import { getUserRole, getRoleRedirect } from "@/lib/auth/get-user-role";
import AdminNav from "@/components/admin/AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await getUserRole();

  if (!result) {
    redirect("/login");
  }

  if (result.role !== "admin") {
    redirect(getRoleRedirect(result.role));
  }

  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <div className="flex-1 pt-[88px] md:pt-0 md:pl-56">{children}</div>
    </div>
  );
}
