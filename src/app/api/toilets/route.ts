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
      if (filters.includes("womenAccessible")) {
        filtered = filtered.filter((r) => r.gender_access === "Women" || r.gender_access === "Unisex" || r.gender_access === "Both");
      }
      if (filters.includes("accessible")) {
        filtered = filtered.filter((r) => r.is_accessible === true);
      }
      if (filters.includes("twentyFourHours")) {
        filtered = filtered.filter((r) => r.open_24_hours === "Yes");
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
      open_24_hours,
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

    // Validate inputs
    if (!name || typeof name !== "string" || name.trim().length === 0 || name.trim().length > 100) {
      return NextResponse.json({ error: "Invalid toilet name. It must be between 1 and 100 characters." }, { status: 400 });
    }
    if (!location_name || typeof location_name !== "string" || location_name.trim().length === 0 || location_name.trim().length > 250) {
      return NextResponse.json({ error: "Invalid location name. It must be between 1 and 250 characters." }, { status: 400 });
    }
    if (typeof latitude !== "number" || latitude < -90 || latitude > 90) {
      return NextResponse.json({ error: "Invalid latitude. It must be a number between -90 and 90." }, { status: 400 });
    }
    if (typeof longitude !== "number" || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: "Invalid longitude. It must be a number between -180 and 180." }, { status: 400 });
    }

    const validTypes = ['Restaurant', 'Petrol Pump', 'Mall', 'Railway / Bus Station', 'Public Toilet', 'Other'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid restroom type category." }, { status: 400 });
    }

    const validToiletTypes = ['Indian', 'European', 'Both'];
    if (!validToiletTypes.includes(toilet_type)) {
      return NextResponse.json({ error: "Invalid toilet standard type." }, { status: 400 });
    }

    const validGenderAccess = ['Men', 'Women', 'Unisex', 'Both'];
    if (!validGenderAccess.includes(gender_access)) {
      return NextResponse.json({ error: "Invalid gender access type." }, { status: 400 });
    }

    const ratings = [cleanliness, smell, lighting, women_safety, water_availability];
    for (const rating of ratings) {
      if (typeof rating !== "number" || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        return NextResponse.json({ error: "All rating values must be integers between 1 and 5." }, { status: 400 });
      }
    }

    const validOpen24Hours = ['Yes', 'No', 'Not Sure'];
    if (open_24_hours !== undefined && !validOpen24Hours.includes(open_24_hours)) {
      return NextResponse.json({ error: "Invalid 24 hours status option." }, { status: 400 });
    }


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
        open_24_hours: open_24_hours || "Not Sure",
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
