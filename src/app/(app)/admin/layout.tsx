import { redirect } from "next/navigation";
import { getUserRole, getRoleRedirect } from "@/lib/auth/get-user-role";
import Link from "next/link";

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: "◆" },
  { href: "/admin/villas", label: "Villas", icon: "⌂" },
  { href: "/admin/bookings", label: "Bookings", icon: "▦" },
  { href: "/admin/bumps", label: "Bumps", icon: "⚡" },
  { href: "/admin/payments", label: "Payments", icon: "₹" },
  { href: "/admin/users", label: "Users", icon: "◉" },
];

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
      {/* Admin sidebar */}
      <aside className="hidden md:flex fixed left-56 top-0 bottom-0 w-48 flex-col border-r border-warm-gray-light bg-cream-dark z-30">
        <div className="px-4 py-6">
          <p className="text-xs font-medium uppercase tracking-wider text-warm-gray">
            Admin
          </p>
        </div>
        <nav className="flex-1 px-2 space-y-0.5">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-warm-gray-dark hover:bg-cream hover:text-volcanic"
            >
              <span className="text-xs opacity-60">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile admin nav */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 border-b border-warm-gray-light bg-cream">
        <div className="flex overflow-x-auto px-4 py-3 gap-3">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-sm text-warm-gray-dark"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex-1 pt-14 md:pt-0 md:pl-48">{children}</div>
    </div>
  );
}
