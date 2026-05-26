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
    const { data: reports, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(reports);
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
    const { reportId, status } = body; // status = 'resolved' | 'dismissed'

    const { error } = await supabase
      .from("reports")
      .update({ status })
      .eq("id", reportId);

    if (error) throw error;

    // Log admin action
    await supabase.from("admin_actions").insert({
      admin_id: user.id,
      action: "resolve_report",
      target_id: reportId,
      details: `Report status set to ${status}`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const status = (err as Error).message === "Unauthorized" ? 401 : (err as Error).message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}
