import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { notFound } from "next/navigation";
import ToiletDetailClient from "./ToiletDetailClient";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: toilet } = await supabase
    .from("restrooms")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!toilet) {
    return {
      title: "Toilet Not Found | SafeToilets",
    };
  }

  const cleanName = toilet.name;
  const cleanLoc = toilet.location_name;
  const desc = `Find details, ratings, reviews, amenities, and directions for public restroom "${cleanName}" located at ${cleanLoc}. SafeToilets helps you locate clean public toilets.`;

  return {
    title: `${cleanName} - Public Restroom at ${cleanLoc} | SafeToilets`,
    description: desc,
    alternates: {
      canonical: `https://safetoilets.in/toilet/${params.id}`,
    },
    openGraph: {
      title: `${cleanName} - SafeToilets`,
      description: desc,
      url: `https://safetoilets.in/toilet/${params.id}`,
      type: "website",
      images: toilet.public_image_url ? [{ url: toilet.public_image_url }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: `${cleanName} - SafeToilets`,
      description: desc,
      images: toilet.public_image_url ? [toilet.public_image_url] : [],
    },
  };
}

export default async function ToiletPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: toilet } = await supabase
    .from("restrooms")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!toilet) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    "name": toilet.name,
    "description": `Public restroom at ${toilet.location_name}`,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": toilet.location_name,
      "addressLocality": toilet.location_name.split(",")[0] || "",
      "addressRegion": "Kerala",
      "addressCountry": "IN",
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": toilet.latitude,
      "longitude": toilet.longitude,
    },
    "aggregateRating": toilet.verification_count > 0 ? {
      "@type": "AggregateRating",
      "ratingValue": toilet.overall_score,
      "reviewCount": toilet.verification_count,
      "bestRating": "5",
      "worstRating": "1",
    } : undefined,
  };

  return (
    <>
      {/* Structured data for GEO/AEO crawl mapping */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Static search crawler indexing index card */}
      <div className="sr-only">
        <h1>{toilet.name}</h1>
        <p>Location: {toilet.location_name}</p>
        <p>Restroom Category: {toilet.type}</p>
        <p>Toilet Standard: {toilet.toilet_type}</p>
        <p>Gender Sections: {toilet.gender_access}</p>
        <p>Accessibility Check: {toilet.is_accessible ? "Accessible / Wheelchair Friendly" : "Standard"}</p>
        <p>Water Availability: {toilet.avg_water_availability ? `${toilet.avg_water_availability.toFixed(1)} stars` : "N/A"}</p>
        <p>Cleanliness Rating: {toilet.avg_cleanliness ? `${toilet.avg_cleanliness.toFixed(1)} stars` : "N/A"}</p>
        <p>Safety Lock Standard: {toilet.avg_women_safety ? `${toilet.avg_women_safety.toFixed(1)} stars` : "N/A"}</p>
      </div>

      <ToiletDetailClient initialToilet={toilet} id={params.id} />
    </>
  );
}
