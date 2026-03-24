import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth/get-api-user";
import { markAsRead, isParticipant } from "@/lib/services/messages";

export async function POST(
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

    await markAsRead(conversationId, user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Mark as read error:", err);
    return NextResponse.json(
      { error: "Failed to mark as read." },
      { status: 500 }
    );
  }
}
