"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const mainLinks = [
  { href: "/admin", label: "Dashboard", icon: "grid" },
  { href: "/admin/bookings", label: "Bookings", icon: "calendar" },
  { href: "/admin/bumps", label: "Bumps", icon: "zap" },
  { href: "/admin/payments", label: "Payments", icon: "dollar" },
  { href: "/admin/villas", label: "Villas", icon: "home" },
  { href: "/admin/users", label: "Users", icon: "users" },
];

const secondaryLinks = [
  { href: "/admin/notifications", label: "Notifications", icon: "bell" },
  { href: "/admin/conversations", label: "Conversations", icon: "message" },
  { href: "/admin/system", label: "System", icon: "settings" },
];

const icons: Record<string, React.ReactNode> = {
  grid: <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />,
  calendar: <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />,
  zap: <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
  dollar: <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />,
  home: <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />,
  users: <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />,
  bell: <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />,
  message: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />,
  settings: <><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></>,
  logout: <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />,
};

function Icon({ name }: { name: string }) {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

export default function AdminNav() {
  const pathname = usePathname();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-56 flex-col border-r border-warm-gray-light bg-cream-dark z-30">
        <div className="px-5 py-5">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="font-serif text-xl font-bold text-bumpr-orange">Bumpr</span>
            <span className="text-xs font-medium uppercase tracking-wider text-warm-gray-dark">Admin</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {mainLinks.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-teal text-white font-medium"
                    : "text-warm-gray-dark hover:bg-cream hover:text-volcanic"
                }`}
              >
                <Icon name={link.icon} />
                {link.label}
              </Link>
            );
          })}

          <div className="my-3 border-t border-warm-gray-light" />

          {secondaryLinks.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-teal text-white font-medium"
                    : "text-warm-gray-dark hover:bg-cream hover:text-volcanic"
                }`}
              >
                <Icon name={link.icon} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-warm-gray-dark hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <Icon name="logout" />
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 border-b border-warm-gray-light bg-cream-dark">
        <div className="flex items-center justify-between px-4 py-2">
          <Link href="/admin" className="font-serif text-lg font-bold text-bumpr-orange">Bumpr</Link>
          <button
            onClick={handleLogout}
            className="text-xs text-warm-gray-dark hover:text-red-600"
          >
            Log out
          </button>
        </div>
        <div className="flex overflow-x-auto px-3 pb-2 gap-1.5">
          {[...mainLinks, ...secondaryLinks].map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-teal text-white"
                    : "bg-white text-warm-gray-dark"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
