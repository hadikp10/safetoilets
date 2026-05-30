import { MetadataRoute } from "next";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://safetoilets.in";

  const staticRoutes = [
    "",
    "/about",
    "/faq",
    "/how-it-works",
    "/ratings",
    "/reviews",
    "/reporting",
    "/data-accuracy",
    "/community-guidelines",
  ];

  const staticPages = staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? ("daily" as const) : ("weekly" as const),
    priority: route === "" ? 1.0 : 0.7,
  }));

  try {
    const supabase = createServerSupabaseClient();
    const { data: restrooms, error } = await supabase
      .from("restrooms")
      .select("id, location_name, updated_at")
      .eq("is_hidden", false);

    if (error || !restrooms) {
      return staticPages;
    }

    // Restroom detail pages
    const toiletPages = restrooms.map((restroom) => ({
      url: `${baseUrl}/toilet/${restroom.id}`,
      lastModified: new Date(restroom.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    // Local SEO dynamic index landing pages (State, District, City)
    const stateSet = new Set<string>();
    const districtSet = new Set<string>();
    const citySet = new Set<string>();

    restrooms.forEach((restroom) => {
      const parts = restroom.location_name.split(",").map((p: string) => p.trim());
      if (parts.length >= 3) {
        // Assume format: [City/Area], [District], [State]
        const city = parts[0].toLowerCase().replace(/\s+/g, "-");
        const district = parts[1].toLowerCase().replace(/\s+/g, "-");
        const state = parts[2].toLowerCase().replace(/\s+/g, "-");

        stateSet.add(state);
        districtSet.add(`${state}/${district}`);
        citySet.add(`${state}/${district}/${city}`);
      } else if (parts.length === 2) {
        const district = parts[0].toLowerCase().replace(/\s+/g, "-");
        const state = parts[1].toLowerCase().replace(/\s+/g, "-");

        stateSet.add(state);
        districtSet.add(`${state}/${district}`);
      }
    });

    const statePages = Array.from(stateSet).map((state) => ({
      url: `${baseUrl}/toilets/${state}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.6,
    }));

    const districtPages = Array.from(districtSet).map((distPath) => ({
      url: `${baseUrl}/toilets/${distPath}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.6,
    }));

    const cityPages = Array.from(citySet).map((cityPath) => ({
      url: `${baseUrl}/toilets/${cityPath}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.6,
    }));

    return [
      ...staticPages,
      ...toiletPages,
      ...statePages,
      ...districtPages,
      ...cityPages,
    ];
  } catch (err) {
    console.error("Dynamic sitemap generation error:", err);
    return staticPages;
  }
}
