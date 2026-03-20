import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bumpId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const response = body.response as string;

    if (!["rebooking", "accepted_deadline", "left_early"].includes(response)) {
      return NextResponse.json({ error: "Invalid response." }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: bump } = await admin
      .from("bumps")
      .select("renter_id, status")
      .eq("id", bumpId)
      .single<{ renter_id: string; status: string }>();

    if (!bump) {
      return NextResponse.json({ error: "Bump not found." }, { status: 404 });
    }

    if (bump.renter_id !== user.id) {
      return NextResponse.json({ error: "Not your bump." }, { status: 403 });
    }

    if (bump.status !== "active") {
      return NextResponse.json({ error: "Bump is no longer active." }, { status: 400 });
    }

    await admin
      .from("bumps")
      .update({
        renter_response: response as "rebooking" | "accepted_deadline" | "left_early",
        renter_responded_at: new Date().toISOString(),
      })
      .eq("id", bumpId);

    return NextResponse.json({ updated: true });
  } catch (err) {
    console.error("Bump respond error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
