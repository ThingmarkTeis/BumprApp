import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const adminId = await verifyAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { photoId } = await params;
    const supabase = createAdminClient();

    // Get photo URL to delete from storage
    const { data: photo } = await supabase
      .from("villa_photos")
      .select("url")
      .eq("id", photoId)
      .single<{ url: string }>();

    if (photo) {
      // Extract path from URL
      const url = new URL(photo.url);
      const storagePath = url.pathname.split("/villa-photos/").pop();
      if (storagePath) {
        await supabase.storage
          .from("villa-photos")
          .remove([decodeURIComponent(storagePath)]);
      }
    }

    await supabase.from("villa_photos").delete().eq("id", photoId);

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("Delete photo error:", err);
    return NextResponse.json(
      { error: "Failed to delete photo." },
      { status: 500 }
    );
  }
}
