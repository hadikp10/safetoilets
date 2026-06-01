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

    const allowedReasons = ['wrong_image', 'fake_restroom', 'closed_restroom', 'incorrect_information'];
    if (!reason || !allowedReasons.includes(reason)) {
      return NextResponse.json({ error: "Invalid report reason." }, { status: 400 });
    }

    if (details !== undefined && details !== null) {
      if (typeof details !== "string" || details.length > 1000) {
        return NextResponse.json({ error: "Details must be a string up to 1000 characters." }, { status: 400 });
      }
    }

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
