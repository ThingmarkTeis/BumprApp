import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth/get-api-user";
import { sendMessage } from "@/lib/services/messages";

export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, body: messageBody } = body as {
      conversationId: string;
      body: string;
    };

    if (!conversationId || !messageBody?.trim()) {
      return NextResponse.json(
        { error: "conversationId and body are required." },
        { status: 400 }
      );
    }

    const message = await sendMessage({
      conversationId,
      senderId: user.id,
      body: messageBody.trim(),
    });

    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send message.";
    const status = message.includes("not a participant") ? 403 : 500;
    console.error("Send message error:", err);
    return NextResponse.json({ error: message }, { status });
  }
}
