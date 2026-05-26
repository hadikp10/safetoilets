import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient(req);

  try {
    const { data: restroom, error } = await supabase
      .from("restrooms")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) {
      return NextResponse.json({ error: "Restroom not found." }, { status: 404 });
    }

    return NextResponse.json(restroom);
  } catch (err) {
    console.error("API GET Toilet detail error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
