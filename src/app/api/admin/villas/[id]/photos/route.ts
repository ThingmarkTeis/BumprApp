import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type VillaPhoto = Database["public"]["Tables"]["villa_photos"]["Row"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await verifyAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id: villaId } = await params;
    const supabase = createAdminClient();

    const formData = await request.formData();
    const files = formData.getAll("photos") as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided." }, { status: 400 });
    }

    // Get current max sort_order
    const { data: existing } = await supabase
      .from("villa_photos")
      .select("sort_order")
      .eq("villa_id", villaId)
      .order("sort_order", { ascending: false })
      .limit(1);

    let nextOrder = (existing?.[0] as { sort_order: number } | undefined)?.sort_order ?? -1;
    nextOrder += 1;

    const uploaded: VillaPhoto[] = [];

    for (const file of files) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${villaId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const buffer = Buffer.from(await file.arrayBuffer());
      const { error: uploadError } = await supabase.storage
        .from("villa-photos")
        .upload(path, buffer, { contentType: file.type });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("villa-photos").getPublicUrl(path);

      const { data: photo, error: insertError } = await supabase
        .from("villa_photos")
        .insert({
          villa_id: villaId,
          url: publicUrl,
          sort_order: nextOrder,
        })
        .select()
        .single<VillaPhoto>();

      if (!insertError && photo) {
        uploaded.push(photo);
        nextOrder++;
      }
    }

    return NextResponse.json({ uploaded }, { status: 201 });
  } catch (err) {
    console.error("Photo upload error:", err);
    return NextResponse.json(
      { error: "Failed to upload photos." },
      { status: 500 }
    );
  }
}
