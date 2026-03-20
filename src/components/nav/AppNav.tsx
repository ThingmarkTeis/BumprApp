"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/lib/auth/get-user-role";
import { useRealtime } from "@/components/providers/RealtimeProvider";

const renterNav = [
  { href: "/browse", label: "Browse", icon: SearchIcon },
  { href: "/bookings", label: "Bookings", icon: CalendarIcon },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

const ownerNav = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/earnings", label: "Earnings", icon: WalletIcon },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

export default function AppNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const { unreadCount } = useRealtime();

  if (role === "admin") return null;

  const items = role === "owner" ? ownerNav : renterNav;

  return (
    <>
      {/* Mobile bottom nav — 64px */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-warm-gray-light bg-white h-16 md:hidden">
        <div className="flex items-center justify-around h-full">
          {items.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] text-xs ${
                  isActive ? "text-bumpr-orange font-semibold" : "text-warm-gray"
                }`}
              >
                <item.icon active={isActive} />
                {item.label}
              </Link>
            );
          })}
          <button className="relative flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] text-xs text-warm-gray">
            <BellIcon active={false} />
            Alerts
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0 h-4 min-w-4 rounded-full bg-bumpr-orange text-[10px] font-bold text-white flex items-center justify-center px-1">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* Desktop sidebar — dark volcanic */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-volcanic z-40">
        <div className="px-6 py-6">
          <Link href="/" className="font-serif text-2xl font-bold italic text-white">
            Bumpr<span className="text-bumpr-orange">.</span>
          </Link>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {items.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${
                  isActive
                    ? "bg-bumpr-orange text-white font-semibold"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon active={isActive} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 pb-6">
          <button className="relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-white/60 hover:text-white hover:bg-white/5">
            <BellIcon active={false} />
            Notifications
            {unreadCount > 0 && (
              <span className="ml-auto h-5 min-w-5 rounded-full bg-bumpr-orange text-[11px] font-bold text-white flex items-center justify-center px-1">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

function SearchIcon({ active }: { active: boolean }) {
  return (<svg className={`h-5 w-5 ${active ? "text-bumpr-orange" : "text-current"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>);
}
function CalendarIcon({ active }: { active: boolean }) {
  return (<svg className={`h-5 w-5 ${active ? "text-bumpr-orange" : "text-current"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>);
}
function HomeIcon({ active }: { active: boolean }) {
  return (<svg className={`h-5 w-5 ${active ? "text-bumpr-orange" : "text-current"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>);
}
function WalletIcon({ active }: { active: boolean }) {
  return (<svg className={`h-5 w-5 ${active ? "text-bumpr-orange" : "text-current"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" /></svg>);
}
function UserIcon({ active }: { active: boolean }) {
  return (<svg className={`h-5 w-5 ${active ? "text-bumpr-orange" : "text-current"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>);
}
function BellIcon({ active }: { active: boolean }) {
  return (<svg className={`h-5 w-5 ${active ? "text-bumpr-orange" : "text-current"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>);
}
