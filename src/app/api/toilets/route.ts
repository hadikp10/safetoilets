import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const minLat = searchParams.get("minLat");
  const maxLat = searchParams.get("maxLat");
  const minLng = searchParams.get("minLng");
  const maxLng = searchParams.get("maxLng");
  const filterParam = searchParams.get("filter"); // comma-separated filters
  const filters = filterParam ? filterParam.split(",") : ["all"];

  const supabase = createServerSupabaseClient(req);

  try {
    let query = supabase
      .from("restrooms")
      .select("*")
      .eq("is_hidden", false);

    // Apply geographic bounding box filter with 500m buffer if bounds are present
    if (minLat && maxLat && minLng && maxLng) {
      const bufferLat = 0.0045; // ~500m in latitude
      const bufferLng = 0.0046; // ~500m in longitude
      
      const minL = parseFloat(minLat) - bufferLat;
      const maxL = parseFloat(maxLat) + bufferLat;
      const minG = parseFloat(minLng) - bufferLng;
      const maxG = parseFloat(maxLng) + bufferLng;

      query = query
        .gte("latitude", minL)
        .lte("latitude", maxL)
        .gte("longitude", minG)
        .lte("longitude", maxG);
    }

    const { data: restrooms, error } = await query;
    if (error) throw error;

    let filtered = restrooms || [];

    // Apply secondary filters
    if (filters.length > 0 && !filters.includes("all")) {
      if (filters.includes("clean")) {
        filtered = filtered.filter((r) => r.overall_score >= 3.8);
      }
      if (filters.includes("womenSafe")) {
        filtered = filtered.filter((r) => r.avg_women_safety >= 3.8 && (r.gender_access === "Women" || r.gender_access === "Unisex" || r.gender_access === "Both"));
      }
      if (filters.includes("accessible")) {
        filtered = filtered.filter((r) => r.is_accessible === true);
      }
      if (filters.includes("twentyFourHours")) {
        // Approximate 24-hour access by filtering typical continuous utility categories
        filtered = filtered.filter((r) => r.type === "Petrol Pump" || r.type === "Railway / Bus Station");
      }
    }

    return NextResponse.json(filtered);
  } catch (err) {
    console.error("API GET Toilets error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const supabase = createServerSupabaseClient(req);

  try {
    // Check if user is authenticated and get their details
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    // Check if banned
    const { data: profile, error: profError } = await supabase
      .from("profiles")
      .select("is_banned")
      .eq("id", user.id)
      .single();
    if (profError || !profile || profile.is_banned) {
      return NextResponse.json({ error: "Access denied. User is banned." }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      location_name,
      latitude,
      longitude,
      type,
      toilet_type,
      gender_access,
      is_accessible,
      cleanliness,
      smell,
      lighting,
      women_safety,
      water_availability,
      has_soap,
      has_mirror,
      has_sanitary,
      photoBase64,
    } = body;

    // 1. Insert Restroom Row
    const { data: newRestroom, error: restroomError } = await supabase
      .from("restrooms")
      .insert({
        name: name.trim(),
        location_name: location_name.trim(),
        latitude,
        longitude,
        type,
        toilet_type,
        gender_access,
        is_accessible,
        created_by: user.id,
        overall_score: 0.00,
      })
      .select()
      .single();

    if (restroomError) throw restroomError;

    let publicImageUrl: string | null = null;

    // 2. Upload Image if present
    if (photoBase64 && newRestroom) {
      const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const fileName = `${newRestroom.id}/${Date.now()}-upload.jpg`;

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

    // 3. Insert Verification Row
    // The database trigger will automatically update restroom scores & cache public_image_url
    const { error: verificationError } = await supabase
      .from("restroom_verifications")
      .insert({
        restroom_id: newRestroom.id,
        user_id: user.id,
        cleanliness,
        smell,
        lighting,
        women_safety,
        water_availability,
        has_soap,
        has_mirror,
        has_sanitary_disposal: has_sanitary,
        image_url: publicImageUrl,
      });

    if (verificationError) throw verificationError;

    // 4. Fetch and return updated restroom details
    const { data: finalRestroom, error: fetchError } = await supabase
      .from("restrooms")
      .select("*")
      .eq("id", newRestroom.id)
      .single();

    if (fetchError) throw fetchError;

    return NextResponse.json(finalRestroom);
  } catch (err) {
    console.error("API POST Toilet error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
