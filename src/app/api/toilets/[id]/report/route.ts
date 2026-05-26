import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient(req);

  try {
    const { data: { user } } = await supabase.auth.getUser();

    const body = await req.json();
    const { reason, details } = body;

    const { error } = await supabase
      .from("reports")
      .insert({
        restroom_id: params.id,
        user_id: user?.id || null,
        reason,
        details: details || null,
        status: "pending",
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("API Toilet report error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
