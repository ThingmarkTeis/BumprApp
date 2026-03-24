import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
type Message = Database["public"]["Tables"]["messages"]["Row"];

export interface ConversationWithPreview {
  id: string;
  booking_id: string;
  villa_title: string;
  other_party_name: string;
  other_party_avatar: string | null;
  last_message_body: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export async function createConversation(params: {
  bookingId: string;
  villaId: string;
  renterId: string;
  ownerId: string;
}): Promise<Conversation> {
  const supabase = createAdminClient();

  // Return existing conversation if one already exists for this booking
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .eq("booking_id", params.bookingId)
    .single<Conversation>();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      booking_id: params.bookingId,
      villa_id: params.villaId,
      renter_id: params.renterId,
      owner_id: params.ownerId,
    })
    .select()
    .single<Conversation>();

  if (error) throw new Error(`Failed to create conversation: ${error.message}`);
  return data;
}

export async function sendMessage(params: {
  conversationId: string;
  senderId: string;
  body: string;
}): Promise<Message> {
  const supabase = createAdminClient();

  // Validate sender is a participant
  const { data: convo } = await supabase
    .from("conversations")
    .select("renter_id, owner_id")
    .eq("id", params.conversationId)
    .single<{ renter_id: string; owner_id: string }>();

  if (!convo) throw new Error("Conversation not found.");
  if (convo.renter_id !== params.senderId && convo.owner_id !== params.senderId) {
    throw new Error("You are not a participant in this conversation.");
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: params.conversationId,
      sender_id: params.senderId,
      body: params.body,
    })
    .select()
    .single<Message>();

  if (error) throw new Error(`Failed to send message: ${error.message}`);
  return data;
}

export async function getConversationsByUser(
  userId: string
): Promise<ConversationWithPreview[]> {
  const supabase = createAdminClient();

  // Get all conversations where user is renter or owner
  const { data: convos, error } = await supabase
    .from("conversations")
    .select("*")
    .or(`renter_id.eq.${userId},owner_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .returns<Conversation[]>();

  if (error) throw new Error(`Failed to fetch conversations: ${error.message}`);
  if (!convos || convos.length === 0) return [];

  const results: ConversationWithPreview[] = [];

  for (const convo of convos) {
    const isRenter = convo.renter_id === userId;
    const otherPartyId = isRenter ? convo.owner_id : convo.renter_id;

    // Get other party's profile
    const { data: otherProfile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", otherPartyId)
      .single<{ full_name: string; avatar_url: string | null }>();

    // Get villa title
    const { data: villa } = await supabase
      .from("villas")
      .select("title")
      .eq("id", convo.villa_id)
      .single<{ title: string }>();

    // Get last message
    const { data: lastMsg } = await supabase
      .from("messages")
      .select("body, created_at")
      .eq("conversation_id", convo.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single<{ body: string; created_at: string }>();

    // Count unread (messages sent by the OTHER party that I haven't read)
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", convo.id)
      .neq("sender_id", userId)
      .is("read_at", null);

    results.push({
      id: convo.id,
      booking_id: convo.booking_id,
      villa_title: villa?.title ?? "Unknown Villa",
      other_party_name: otherProfile?.full_name ?? "Unknown",
      other_party_avatar: otherProfile?.avatar_url ?? null,
      last_message_body: lastMsg?.body ?? null,
      last_message_at: lastMsg?.created_at ?? null,
      unread_count: count ?? 0,
    });
  }

  // Sort by last message (most recent first), conversations with no messages last
  results.sort((a, b) => {
    if (!a.last_message_at && !b.last_message_at) return 0;
    if (!a.last_message_at) return 1;
    if (!b.last_message_at) return -1;
    return b.last_message_at.localeCompare(a.last_message_at);
  });

  return results;
}

export async function getMessages(
  conversationId: string,
  limit = 50,
  before?: string
): Promise<Message[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query.returns<Message[]>();

  if (error) throw new Error(`Failed to fetch messages: ${error.message}`);

  // Return in ascending order (oldest first) for display
  return (data ?? []).reverse();
}

export async function markAsRead(
  conversationId: string,
  userId: string
): Promise<void> {
  const supabase = createAdminClient();

  // Mark all messages sent by the OTHER party as read
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .is("read_at", null);

  if (error) throw new Error(`Failed to mark as read: ${error.message}`);
}

export async function countUnreadMessages(userId: string): Promise<number> {
  const supabase = createAdminClient();

  // Get all conversation IDs where user is a participant
  const { data: convos } = await supabase
    .from("conversations")
    .select("id")
    .or(`renter_id.eq.${userId},owner_id.eq.${userId}`)
    .returns<{ id: string }[]>();

  if (!convos || convos.length === 0) return 0;

  const convoIds = convos.map((c) => c.id);

  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", convoIds)
    .neq("sender_id", userId)
    .is("read_at", null);

  if (error) throw new Error(`Failed to count unread: ${error.message}`);
  return count ?? 0;
}

export async function isParticipant(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .or(`renter_id.eq.${userId},owner_id.eq.${userId}`)
    .single<{ id: string }>();

  return !!data;
}
