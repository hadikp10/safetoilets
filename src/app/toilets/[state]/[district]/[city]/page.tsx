import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import ToiletCard from "@/components/toilet/ToiletCard";
import { Metadata } from "next";

interface CityPageProps {
  params: {
    state: string;
    district: string;
    city: string;
  };
}

function cleanParam(param: string): string {
  return param
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const cleanState = cleanParam(params.state);
  const cleanDistrict = cleanParam(params.district);
  const cleanCity = cleanParam(params.city);
  return {
    title: `Public Toilets in ${cleanCity}, ${cleanDistrict} - SafeToilets`,
    description: `Locate clean public restrooms and toilet amenities in ${cleanCity}, ${cleanDistrict}, ${cleanState}. View reviews, cleanliness ratings, and maps.`,
    alternates: {
      canonical: `https://safetoilets.in/toilets/${params.state}/${params.district}/${params.city}`,
    },
  };
}

export default async function CityPage({ params }: CityPageProps) {
  const cleanState = cleanParam(params.state);
  const cleanDistrict = cleanParam(params.district);
  const cleanCity = cleanParam(params.city);
  const supabase = createServerSupabaseClient();

  const { data: restrooms } = await supabase
    .from("restrooms")
    .select("*")
    .eq("is_hidden", false)
    .ilike("location_name", `%${cleanCity}%`);

  // Ensure state & district match as well
  const list = restrooms ? restrooms.filter((r) => 
    r.location_name.toLowerCase().includes(cleanState.toLowerCase()) &&
    r.location_name.toLowerCase().includes(cleanDistrict.toLowerCase())
  ) : [];

  const breadcrumbsSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://safetoilets.in",
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": cleanState,
        "item": `https://safetoilets.in/toilets/${params.state}`,
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": cleanDistrict,
        "item": `https://safetoilets.in/toilets/${params.state}/${params.district}`,
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": cleanCity,
        "item": `https://safetoilets.in/toilets/${params.state}/${params.district}/${params.city}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsSchema) }}
      />

      <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans w-full max-w-md mx-auto px-4 py-6 flex flex-col text-left">
        {/* Breadcrumbs */}
        <nav className="text-xs text-neutral-400 mb-4 flex gap-1.5 items-center">
          <Link href="/" className="hover:text-neutral-600 transition">Home</Link>
          <span>&gt;</span>
          <Link href={`/toilets/${params.state}`} className="hover:text-neutral-600 transition">{cleanState}</Link>
          <span>&gt;</span>
          <Link href={`/toilets/${params.state}/${params.district}`} className="hover:text-neutral-600 transition">{cleanDistrict}</Link>
          <span>&gt;</span>
          <span className="text-neutral-600">{cleanCity}</span>
        </nav>

        {/* Header */}
        <header className="mb-6">
          <h1 className="text-[20px] font-semibold text-neutral-900 tracking-tight leading-snug mb-1.5">
            Public Toilets in {cleanCity}
          </h1>
          <p className="text-xs text-neutral-600 leading-normal">
            Find verified public restrooms in the {cleanCity} area. Currently mapping {list.length} locations.
          </p>
        </header>

        {/* List content */}
        <main className="flex-1 space-y-3">
          {list.length > 0 ? (
            <div className="bg-white border border-neutral-200 rounded-[20px] shadow-card overflow-hidden divide-y divide-neutral-200">
              {list.map((toilet) => (
                <ToiletCard key={toilet.id} toilet={toilet} distance={null} />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-[20px] p-6 text-center shadow-card">
              <span className="text-neutral-400 text-sm">No restrooms added in this city yet.</span>
            </div>
          )}
        </main>

        {/* Info Context block */}
        <section className="mt-8 pt-6 border-t border-neutral-200 space-y-3">
          <h2 className="text-sm font-semibold text-neutral-900">About Restrooms in {cleanCity}</h2>
          <p className="text-xs text-neutral-600 leading-relaxed font-normal">
            SafeToilets catalogs municipal toilets, petrol pump utilities, station restrooms, and commercial facilities in {cleanCity}. 
            Check ratings or add comments on cleanliness, safety locks, light, and water details.
          </p>
        </section>

        {/* Footer */}
        <footer className="mt-12 text-center">
          <Link href="/">
            <button className="w-full h-[52px] bg-brand-green hover:bg-brand-greenDark text-white text-[14px] font-medium rounded-[14px] shadow-button transition-colors">
              Go to Map Search
            </button>
          </Link>
        </footer>
      </div>
    </>
  );
}
