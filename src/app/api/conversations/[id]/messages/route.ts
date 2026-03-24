import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth/get-api-user";
import { getMessages, isParticipant } from "@/lib/services/messages";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: conversationId } = await params;

    if (!(await isParticipant(conversationId, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const before = searchParams.get("before") ?? undefined;

    const messages = await getMessages(conversationId, limit, before);
    return NextResponse.json(messages);
  } catch (err) {
    console.error("Get messages error:", err);
    return NextResponse.json(
      { error: "Failed to fetch messages." },
      { status: 500 }
    );
  }
}
