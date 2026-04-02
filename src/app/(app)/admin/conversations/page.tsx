import { createAdminClient } from "@/lib/supabase/admin";
import Pagination from "@/components/admin/Pagination";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;

export default async function AdminConversationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const supabase = createAdminClient();

  const { data: conversations, count } = await supabase
    .from("conversations")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

  const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

  // Resolve names
  const userIds = [...new Set([
    ...(conversations ?? []).map((c: { renter_id: string }) => c.renter_id),
    ...(conversations ?? []).map((c: { owner_id: string }) => c.owner_id),
  ])];
  const villaIds = [...new Set((conversations ?? []).map((c: { villa_id: string }) => c.villa_id))];

  const [{ data: users }, { data: villas }] = await Promise.all([
    userIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", userIds)
      : Promise.resolve({ data: [] }),
    villaIds.length > 0
      ? supabase.from("villas").select("id, title").in("id", villaIds)
      : Promise.resolve({ data: [] }),
  ]);

  const userMap = new Map((users ?? []).map((u: { id: string; full_name: string }) => [u.id, u.full_name]));
  const villaMap = new Map((villas ?? []).map((v: { id: string; title: string }) => [v.id, v.title]));

  // Get message counts and last message per conversation
  const convIds = (conversations ?? []).map((c: { id: string }) => c.id);
  const { data: messages } = convIds.length > 0
    ? await supabase
        .from("messages")
        .select("conversation_id, body, created_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const lastMessageMap = new Map<string, { body: string; created_at: string }>();
  const messageCountMap = new Map<string, number>();
  for (const m of (messages ?? []) as { conversation_id: string; body: string; created_at: string }[]) {
    messageCountMap.set(m.conversation_id, (messageCountMap.get(m.conversation_id) ?? 0) + 1);
    if (!lastMessageMap.has(m.conversation_id)) {
      lastMessageMap.set(m.conversation_id, { body: m.body, created_at: m.created_at });
    }
  }

  return (
    <div className="px-6 py-8">
      <h1 className="font-serif text-3xl font-bold text-volcanic mb-6">Conversations</h1>

      <div className="rounded-2xl shadow-[0_2px_16px_rgba(26,26,26,0.06)] bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream-dark text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Villa</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Renter</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Owner</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Last Message</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Messages</th>
              <th className="px-4 py-3 font-medium text-warm-gray-dark">Links</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-gray-light">
            {(conversations ?? []).map((c: {
              id: string;
              villa_id: string;
              renter_id: string;
              owner_id: string;
              booking_id: string;
            }) => {
              const lastMsg = lastMessageMap.get(c.id);
              return (
                <tr key={c.id} className="hover:bg-cream-dark/50">
                  <td className="px-4 py-3 text-volcanic">{villaMap.get(c.villa_id) ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${c.renter_id}`} className="text-volcanic hover:text-bumpr-orange">
                      {userMap.get(c.renter_id) ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${c.owner_id}`} className="text-volcanic hover:text-bumpr-orange">
                      {userMap.get(c.owner_id) ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {lastMsg ? (
                      <div>
                        <p className="text-xs text-volcanic/70 truncate max-w-48">{lastMsg.body}</p>
                        <p className="text-xs text-warm-gray">{new Date(lastMsg.created_at).toLocaleString()}</p>
                      </div>
                    ) : (
                      <span className="text-warm-gray text-xs">No messages</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono">{messageCountMap.get(c.id) ?? 0}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/bookings/${c.booking_id}`} className="text-xs text-bumpr-orange hover:underline">
                      Booking
                    </Link>
                  </td>
                </tr>
              );
            })}
            {(conversations ?? []).length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-volcanic/40">No conversations yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} />
    </div>
  );
}
