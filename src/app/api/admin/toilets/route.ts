import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { SupabaseClient } from "@supabase/supabase-js";

async function verifyAdmin(supabase: SupabaseClient) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_admin) throw new Error("Forbidden");
  return user;
}

export async function GET(req: Request) {
  const supabase = createServerSupabaseClient(req);

  try {
    await verifyAdmin(supabase);
    const { data: restrooms, error } = await supabase
      .from("restrooms")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(restrooms);
  } catch (err) {
    const status = (err as Error).message === "Unauthorized" ? 401 : (err as Error).message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}

export async function PATCH(req: Request) {
  const supabase = createServerSupabaseClient(req);

  try {
    const user = await verifyAdmin(supabase);
    const body = await req.json();
    const { restroomId, isHidden, restoreBackupImage } = body;

    const updatePayload: Record<string, string | boolean | null> = {};
    let actionType = "";
    let actionDetails = "";

    if (isHidden !== undefined) {
      updatePayload.is_hidden = isHidden;
      actionType = isHidden ? "hide_restroom" : "unhide_restroom";
      actionDetails = `Set hidden to ${isHidden}`;
    } else if (restoreBackupImage) {
      // Swapping image URLs
      const { data: restroom, error: fetchError } = await supabase
        .from("restrooms")
        .select("public_image_url, backup_image_url")
        .eq("id", restroomId)
        .single();
      
      if (fetchError || !restroom) throw new Error("Restroom not found");
      if (!restroom.backup_image_url) throw new Error("No backup image exists");

      updatePayload.public_image_url = restroom.backup_image_url;
      updatePayload.backup_image_url = restroom.public_image_url;
      actionType = "restore_image";
      actionDetails = `Restored backup image url ${restroom.backup_image_url}`;
    }

    const { error } = await supabase
      .from("restrooms")
      .update(updatePayload)
      .eq("id", restroomId);

    if (error) throw error;

    // Log admin action
    await supabase.from("admin_actions").insert({
      admin_id: user.id,
      action: actionType,
      target_id: restroomId,
      details: actionDetails,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const status = (err as Error).message === "Unauthorized" ? 401 : (err as Error).message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}

export async function DELETE(req: Request) {
  const supabase = createServerSupabaseClient(req);

  try {
    const user = await verifyAdmin(supabase);
    const { searchParams } = new URL(req.url);
    const restroomId = searchParams.get("restroomId");

    if (!restroomId) throw new Error("Missing restroomId");

    const { error } = await supabase
      .from("restrooms")
      .delete()
      .eq("id", restroomId);

    if (error) throw error;

    await supabase.from("admin_actions").insert({
      admin_id: user.id,
      action: "delete_restroom",
      target_id: restroomId,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const status = (err as Error).message === "Unauthorized" ? 401 : (err as Error).message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}
