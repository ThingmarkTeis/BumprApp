import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth/get-api-user";
import { getConversationsByUser } from "@/lib/services/messages";

export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversations = await getConversationsByUser(user.id);
    return NextResponse.json(conversations);
  } catch (err) {
    console.error("Get conversations error:", err);
    return NextResponse.json(
      { error: "Failed to fetch conversations." },
      { status: 500 }
    );
  }
}
