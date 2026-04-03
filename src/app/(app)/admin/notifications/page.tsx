import { createAdminClient } from "@/lib/supabase/admin";
import StatusBadge from "@/components/admin/StatusBadge";
import FilterBar from "@/components/admin/FilterBar";
import Pagination from "@/components/admin/Pagination";
import SendNotificationForm from "@/components/admin/SendNotificationForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const channelFilter = sp.channel;
  const statusFilter = sp.status;
  const supabase = createAdminClient();

  let query = supabase.from("notifications").select("*", { count: "exact" });

  if (channelFilter) query = query.eq("channel", channelFilter as "whatsapp" | "in_app" | "email");
  if (statusFilter) query = query.eq("status", statusFilter as "pending" | "sent" | "delivered" | "failed");

  const { data: notifications, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

  const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

  // Resolve user names
  const userIds = [...new Set((notifications ?? []).map((n: { user_id: string }) => n.user_id))];
  const { data: users } = userIds.length > 0
    ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [] };
  const userMap = new Map((users ?? []).map((u: { id: string; full_name: string; email: string }) => [u.id, u.full_name || u.email]));

  // All users for send form
  const { data: allUsers } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .order("full_name");

  const sendFormUsers = (allUsers ?? []).map((u: { id: string; full_name: string; email: string }) => ({
    id: u.id,
    name: u.full_name || "",
    email: u.email,
  }));

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl font-bold text-volcanic">Notifications</h1>
        <SendNotificationForm users={sendFormUsers} />
      </div>

      <div className="mb-4">
        <FilterBar
          filters={[
            {
              key: "channel",
              label: "Channel",
              options: [
                { label: "WhatsApp", value: "whatsapp" },
                { label: "In-App", value: "in_app" },
                { label: "Email", value: "email" },
              ],
            },
            {
              key: "status",
              label: "Status",
              options: [
                { label: "Pending", value: "pending" },
                { label: "Sent", value: "sent" },
                { label: "Delivered", value: "delivered" },
                { label: "Failed", value: "failed" },
              ],
            },
          ]}
        />
      </div>

      <div className="rounded-2xl shadow-[0_2px_16px_rgba(26,26,26,0.06)] bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream-dark text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">User</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Channel</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Template</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Status</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Sent</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Error</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Links</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-gray-light">
            {(notifications ?? []).map((n: {
              id: string;
              user_id: string;
              channel: string;
              template: string;
              status: string;
              sent_at: string | null;
              error_message: string | null;
              booking_id: string | null;
              bump_id: string | null;
              created_at: string;
            }) => (
              <tr key={n.id} className={`hover:bg-cream-dark/50 ${n.status === "failed" ? "bg-red-50" : ""}`}>
                <td className="px-4 py-3">
                  <Link href={`/admin/users/${n.user_id}`} className="text-volcanic hover:text-bumpr-orange">
                    {userMap.get(n.user_id) ?? n.user_id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-4 py-3"><StatusBadge status={n.channel} /></td>
                <td className="px-4 py-3 text-xs text-volcanic/70 font-mono">{n.template}</td>
                <td className="px-4 py-3"><StatusBadge status={n.status} /></td>
                <td className="px-4 py-3 text-xs text-volcanic/50">
                  {n.sent_at ? new Date(n.sent_at).toLocaleString() : new Date(n.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-xs text-red-500 max-w-32 truncate">{n.error_message ?? "—"}</td>
                <td className="px-4 py-3 flex gap-2">
                  {n.booking_id && (
                    <Link href={`/admin/bookings/${n.booking_id}`} className="text-xs text-bumpr-orange hover:underline">Booking</Link>
                  )}
                  {n.bump_id && (
                    <Link href={`/admin/bumps/${n.bump_id}`} className="text-xs text-bumpr-orange hover:underline">Bump</Link>
                  )}
                </td>
              </tr>
            ))}
            {(notifications ?? []).length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-volcanic/40">No notifications found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} />
    </div>
  );
}
