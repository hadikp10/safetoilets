import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient(req);

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_banned")
      .eq("id", user.id)
      .single();

    if (!profile || profile.is_banned) {
      return NextResponse.json({ error: "Banned user." }, { status: 403 });
    }

    const body = await req.json();
    const {
      cleanliness,
      smell,
      lighting,
      women_safety,
      water_availability,
      has_soap,
      has_mirror,
      has_sanitary_disposal,
      photoBase64,
    } = body;

    // Validate ratings bounds
    const ratings = [cleanliness, smell, lighting, women_safety, water_availability];
    for (const rating of ratings) {
      if (typeof rating !== "number" || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        return NextResponse.json({ error: "All rating values must be integers between 1 and 5." }, { status: 400 });
      }
    }

    let publicImageUrl: string | null = null;

    if (photoBase64) {
      const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const fileName = `${params.id}/${Date.now()}-verify.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("restroom-photos")
        .upload(fileName, buffer, {
          contentType: "image/jpeg",
          cacheControl: "3600",
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("restroom-photos")
        .getPublicUrl(fileName);

      publicImageUrl = publicUrl;
    }

    const { error: insertError } = await supabase
      .from("restroom_verifications")
      .insert({
        restroom_id: params.id,
        user_id: user.id,
        cleanliness,
        smell,
        lighting,
        women_safety,
        water_availability,
        has_soap,
        has_mirror,
        has_sanitary_disposal,
        image_url: publicImageUrl,
      });

    if (insertError) throw insertError;

    // Fetch updated restroom details
    const { data: updatedRestroom, error: fetchError } = await supabase
      .from("restrooms")
      .select("*")
      .eq("id", params.id)
      .single();

    if (fetchError) throw fetchError;

    return NextResponse.json(updatedRestroom);
  } catch (err) {
    console.error("API Toilet verification error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
