import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import ToiletCard from "@/components/toilet/ToiletCard";
import { Metadata } from "next";

interface StatePageProps {
  params: {
    state: string;
  };
}

function cleanParam(param: string): string {
  return param
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function generateMetadata({ params }: StatePageProps): Promise<Metadata> {
  const cleanState = cleanParam(params.state);
  return {
    title: `Clean Public Toilets in ${cleanState} - SafeToilets`,
    description: `Find clean, safe, and accessible public toilets and restrooms in ${cleanState}. View coordinates, ratings, and facilities verified by the community.`,
    alternates: {
      canonical: `https://safetoilets.in/toilets/${params.state}`,
    },
  };
}

export default async function StatePage({ params }: StatePageProps) {
  const cleanState = cleanParam(params.state);
  const supabase = createServerSupabaseClient();

  const { data: restrooms } = await supabase
    .from("restrooms")
    .select("*")
    .eq("is_hidden", false)
    .ilike("location_name", `%${cleanState}%`);

  const list = restrooms || [];

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
        "name": `Toilets in ${cleanState}`,
        "item": `https://safetoilets.in/toilets/${params.state}`,
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
          <span className="text-neutral-600">{cleanState}</span>
        </nav>

        {/* Header */}
        <header className="mb-6">
          <h1 className="text-[20px] font-semibold text-neutral-900 tracking-tight leading-snug mb-1.5">
            Public Toilets in {cleanState}
          </h1>
          <p className="text-xs text-neutral-600 leading-normal">
            Discover {list.length} clean, community-verified public toilets in {cleanState} state.
          </p>
        </header>

        {/* Content list */}
        <main className="flex-1 space-y-3">
          {list.length > 0 ? (
            <div className="bg-white border border-neutral-200 rounded-[20px] shadow-card overflow-hidden divide-y divide-neutral-200">
              {list.map((toilet) => (
                <ToiletCard key={toilet.id} toilet={toilet} distance={null} />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-[20px] p-6 text-center shadow-card">
              <span className="text-neutral-400 text-sm">No restrooms added in this state yet.</span>
            </div>
          )}
        </main>

        {/* Local SEO Context Info Block */}
        <section className="mt-8 pt-6 border-t border-neutral-200 space-y-4">
          <h2 className="text-sm font-semibold text-neutral-900">Why Use SafeToilets in {cleanState}?</h2>
          <p className="text-xs text-neutral-600 leading-relaxed font-normal">
            SafeToilets crowdsources restroom logs from visitors in {cleanState}. 
            Every listing details cleanliness, water presence, safety locks, and wheelchair friendliness. 
            Help the community by checking in or adding new restrooms today.
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
