import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSupabase } from "@/hooks/useSupabase";
import { useGeolocation } from "@/hooks/useGeolocation";
import { supabase } from "@/lib/supabase";
import { Restroom } from "@/types";
import RestroomCard, { calculateDistance } from "@/components/Restroom/RestroomCard";
import SkeletonCard from "@/components/Restroom/SkeletonCard";
import RestroomDetail from "@/components/Restroom/RestroomDetail";
import VerifyRestroomForm from "@/components/Restroom/VerifyRestroomForm";
import ReportForm from "@/components/Restroom/ReportForm";
import AddRestroomForm from "@/components/Restroom/AddRestroomForm";
import { Navigation } from "lucide-react";

// Dynamically import map container with SSR disabled to prevent Leaflet window reference errors
const MapContainer = dynamic(() => import("@/components/Map/MapContainer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[55vh] min-h-[300px] rounded-b-3xl bg-[#F5F5F4] dark:bg-stone-850 animate-pulse flex items-center justify-center">
      <span className="text-[#A8A29E] text-sm">Loading map...</span>
    </div>
  ),
});

const CATEGORIES = ["All", "Public Toilet", "Petrol Pump", "Restaurant", "Mall", "Railway / Bus Station", "Other"];

export default function Home() {
  const { user, profile, isAuthenticated, isAdmin, logout, loading: authLoading } = useSupabase();
  const router = useRouter();
  const { latitude, longitude, error: geoError, loading: geoLoading, getPosition } = useGeolocation();

  // Application Views & Data
  const [restrooms, setRestrooms] = useState<Restroom[]>([]);
  const [restroomsLoading, setRestroomsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [hasSearched, setHasSearched] = useState(true);
  const [selectedRestroom, setSelectedRestroom] = useState<Restroom | null>(null);
  
  // Geolocation override/fallbacks
  const [browseAll, setBrowseAll] = useState(false);
  
  // Custom Overhaul states
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isScrolled, setIsScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Form Modals Toggles
  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  
  // Add Restroom mode states
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [addingCoords, setAddingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Pull to refresh logic states
  const [startY, setStartY] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch restrooms on initial load
  const fetchRestrooms = async () => {
    setRestroomsLoading(true);
    setFetchError(false);
    try {
      const { data, error } = await supabase
        .from("restrooms")
        .select("*")
        .eq("is_hidden", false);
      if (error) throw error;
      setRestrooms(data as Restroom[]);
    } catch (err) {
      console.error("Error loading restrooms:", err);
      setFetchError(true);
    } finally {
      setRestroomsLoading(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop === 0) {
      setStartY(e.touches[0].pageY);
      setPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!pulling) return;
    const currentY = e.touches[0].pageY;
    const diff = currentY - startY;
    if (diff > 0) {
      setPullProgress(Math.min(diff, 120));
      if (diff > 60 && e.cancelable) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = async () => {
    if (!pulling) return;
    setPulling(false);
    if (pullProgress > 60) {
      setIsRefreshing(true);
      await fetchRestrooms();
      setIsRefreshing(false);
    }
    setPullProgress(0);
  };

  useEffect(() => {
    fetchRestrooms();
    setMounted(true);
  }, []);

  useEffect(() => {
    if (router.isReady && router.query.add === "true") {
      handleAddToiletClick();
    }
  }, [router.isReady, router.query]);

  // Scroll tracking on window
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Request location and activate map search
  const handleFindNearby = () => {
    setHasSearched(true);
    getPosition();
  };

  // Sort and filter restrooms client-side based on user coordinates and category
  const getFilteredAndSortedRestrooms = () => {
    let list = [...restrooms];
    if (selectedCategory !== "All") {
      list = list.filter((r) => r.type === selectedCategory);
    }
    if (!latitude || !longitude) return list;

    return list.sort((a, b) => {
      const distA = calculateDistance(latitude, longitude, a.latitude, a.longitude);
      const distB = calculateDistance(latitude, longitude, b.latitude, b.longitude);
      return distA - distB;
    });
  };

  // Handle map center selection when user clicks a list card
  const handleSelectRestroom = (restroom: Restroom) => {
    setSelectedRestroom(restroom);
  };

  // Trigger Add Restroom flow
  const handleAddToiletClick = () => {
    if (!isAuthenticated) {
      router.push("/login");
    } else {
      setIsAddingMode(true);
      setSelectedRestroom(null);
      setHasSearched(true);
      setViewMode("map"); // make sure map is visible
    }
  };

  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setIsScrolled(e.currentTarget.scrollTop > 0);
  };

  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone || window.matchMedia('(display-mode: standalone)').matches;
      const dismissed = localStorage.getItem("ios-pwa-dismissed") === "true";
      if (isIOS && !isStandalone && !dismissed) {
        setShowIOSHint(true);
      }
    }
  }, []);

  const activeUserCoords = latitude && longitude ? { latitude, longitude } : null;
  const filteredRestrooms = getFilteredAndSortedRestrooms();

  return (
    <div className={`min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-50 flex flex-col transition-opacity duration-200 ${mounted ? "opacity-100" : "opacity-0"} animate-fadeIn`}>
      {/* Top Navbar */}
      <header className={`glass-header sticky top-0 z-50 h-[56px] px-4 flex justify-between items-center transition-all ${isScrolled ? "scrolled-header" : ""}`}>
        <div className="flex items-center">
          <Link href="/" className="text-xl font-bold text-brand-green tracking-[-0.5px]">
            SafeToilets
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {authLoading ? (
            <div className="w-8 h-8 rounded-full bg-[#F5F5F4] dark:bg-stone-850 animate-pulse" />
          ) : (
            <>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="text-sm text-text-secondary dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 min-h-[36px] px-3 rounded-xl transition-colors font-medium flex items-center justify-center animate-fadeIn"
                >
                  Admin
                </Link>
              )}

              {isAuthenticated && profile ? (
                <div className="flex items-center gap-2 animate-fadeIn">
                  <Link
                    href="/profile"
                    className="text-xs font-semibold text-text-secondary max-w-[80px] truncate hover:text-stone-950 dark:hover:text-stone-100 hidden xs:block"
                  >
                    {profile.full_name || "User"}
                  </Link>
                  <button
                    onClick={logout}
                    className="text-sm text-text-secondary dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 min-h-[36px] px-3 rounded-xl transition-colors font-medium"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="text-sm text-text-secondary dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 min-h-[36px] px-3 rounded-xl transition-colors font-medium flex items-center justify-center animate-fadeIn"
                >
                  Login
                </Link>
              )}

              <button
                onClick={handleAddToiletClick}
                className="bg-brand-green hover:bg-brand-green-dark text-sm font-medium text-white min-h-[36px] px-3 rounded-xl shadow-button transition-all active:scale-[0.97] animate-fadeIn"
              >
                Add Toilet
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Container: Landing vs Active Map Search */}
      {!hasSearched ? (
        // Minimalist Civic Utility Landing View
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-md mx-auto text-center">
          <h1 className="text-3xl font-black tracking-tight leading-tight">
            Find Clean Public Toilets Nearby
          </h1>
          <p className="text-xs text-text-secondary dark:text-stone-400 font-semibold mt-2.5 leading-relaxed">
            Real-time crowdsourced cleanliness ratings and facilities mapping.
          </p>

          <button
            onClick={handleFindNearby}
            className="w-full h-[52px] bg-brand-green text-white font-semibold rounded-2xl text-base flex items-center justify-center gap-2 mt-8 shadow-button hover:bg-brand-green-dark active:scale-[0.97] transition-all duration-150"
          >
            <Navigation className="w-5 h-5 text-white" strokeWidth={1.5} />
            Find Nearby Toilets
          </button>

          <div className="mt-12 text-[10px] font-bold text-stone-450 dark:text-stone-500 uppercase tracking-widest flex items-center gap-2">
            <span>OpenStreetMap</span>
            <span className="w-1.5 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full"></span>
            <span>Supabase Secure RLS</span>
            <span className="w-1.5 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full"></span>
            <span>Exif Cleaned</span>
          </div>
        </main>
      ) : (
        // Active Map & List View (Split Screen Mobile Optimized)
        <main className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* Geolocation Loading / Error alerts */}
          {geoLoading && (
            <div className="bg-brand-green text-white px-4 py-2 text-center text-xs font-bold z-30 flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Locating your device...
            </div>
          )}

          {/* Map Section */}
          <div 
            className={`w-full transition-all duration-300 overflow-hidden rounded-b-3xl relative flex-shrink-0 ${
              viewMode === "map" ? "h-[56vh] md:h-[50vh]" : "h-0"
            }`}
          >
            {geoError && !browseAll ? (
              <div className="w-full h-full p-4 flex flex-col justify-center bg-stone-50 dark:bg-stone-950">
                <div className="bg-[#FEF9C3] rounded-2xl p-4 border border-[#FEF08A] flex flex-col gap-3 max-w-sm mx-auto">
                  <div className="flex items-start gap-3">
                    <span className="text-[24px] text-[#D97706] flex-shrink-0" role="img" aria-label="location">📍</span>
                    <div>
                      <h4 className="text-sm font-semibold text-[#A16207]">Location access needed</h4>
                      <p className="text-xs text-[#A16207] mt-1 leading-normal">
                        Allow location to find toilets near you, or browse all toilets in Kerala.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 mt-2">
                    <button
                      onClick={() => {
                        alert("To enable location access:\n1. Click the site settings icon next to the URL in your browser address bar.\n2. Allow 'Location' permission.\n3. Refresh this page.");
                        getPosition();
                      }}
                      className="w-full h-10 bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
                    >
                      Enable Location
                    </button>
                    <button
                      onClick={() => {
                        setBrowseAll(true);
                        fetchRestrooms();
                      }}
                      className="w-full h-10 bg-white hover:bg-stone-50 text-[#D97706] border border-[#F59E0B] text-xs font-semibold rounded-xl transition-colors"
                    >
                      Browse All Toilets
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <MapContainer
                  restrooms={restrooms.filter(r => selectedCategory === "All" || r.type === selectedCategory)}
                  selectedRestroom={selectedRestroom}
                  onSelectRestroom={handleSelectRestroom}
                  userCoords={browseAll ? null : activeUserCoords}
                  isAddingMode={isAddingMode}
                  onLocationSelect={(lat, lng) => setAddingCoords({ lat, lng })}
                  centerOverride={browseAll ? { latitude: 10.8505, longitude: 76.2711 } : null}
                />

                {/* Quick Actions overlay on Map */}
                <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
                  {/* Recenter button */}
                  <button
                    onClick={handleFindNearby}
                    className="w-11 h-11 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-full flex items-center justify-center shadow-float active:scale-[0.97] transition-all duration-100"
                    title="Find my location"
                  >
                    <Navigation className="w-5 h-5 text-brand-green" strokeWidth={1.5} />
                  </button>
                </div>
              </>
            )}

            {/* Add Toilet Mode Bottom Panel */}
            {isAddingMode && addingCoords && (
              <div className="absolute bottom-4 left-4 right-4 z-20 bg-white dark:bg-stone-900 border border-[#E7E5E4] dark:border-stone-800 rounded-2xl p-4 shadow-float flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-text-primary">Set Pin Location</h4>
                  <p className="text-[10px] text-text-secondary mt-0.5">Drag map pin to exact restroom site</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsAddingMode(false);
                      setAddingCoords(null);
                    }}
                    className="h-9 px-3 border border-stone-200 dark:border-stone-800 text-[11px] font-semibold rounded-xl text-text-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="h-9 px-3 bg-brand-green text-white text-[11px] font-semibold rounded-xl shadow-button hover:bg-brand-green-dark"
                  >
                    Confirm Location
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Filter Pills Bar */}
          <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide bg-white dark:bg-stone-900 border-b border-[#E7E5E4] dark:border-stone-850/60 flex-shrink-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full text-xs font-medium px-3 py-1.5 min-h-[32px] whitespace-nowrap transition-colors duration-150 ${
                  selectedCategory === cat
                    ? "bg-brand-green text-white"
                    : "bg-surface-muted text-text-secondary dark:bg-stone-800 dark:text-stone-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Section Header */}
          <div className="px-4 py-2 flex justify-between items-center bg-white dark:bg-stone-900 flex-shrink-0">
            <span className="text-sm font-semibold text-text-primary">
              {filteredRestrooms.length} {filteredRestrooms.length === 1 ? "toilet" : "toilets"} nearby
            </span>
            <div className="flex bg-surface-muted dark:bg-stone-800 p-0.5 rounded-lg">
              <button
                onClick={() => setViewMode("map")}
                className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${
                  viewMode === "map"
                    ? "bg-white dark:bg-stone-900 shadow-sm text-text-primary"
                    : "text-text-secondary dark:text-stone-400"
                }`}
              >
                Map
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${
                  viewMode === "list"
                    ? "bg-white dark:bg-stone-900 shadow-sm text-text-primary"
                    : "text-text-secondary dark:text-stone-400"
                }`}
              >
                List
              </button>
            </div>
          </div>

          {/* List View Section */}
          <div 
            onScroll={handleListScroll}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`flex-1 overflow-y-auto px-4 pb-8 space-y-3 no-scrollbar bg-stone-50 dark:bg-stone-950 transition-all ${
              viewMode === "list" ? "block" : "block"
            }`}
          >
            {/* Pull to refresh indicator */}
            {(pullProgress > 0 || isRefreshing) && (
              <div 
                className="flex items-center justify-center py-2 transition-all overflow-hidden bg-stone-50 dark:bg-stone-950 text-[#78716C]"
                style={{ height: isRefreshing ? "40px" : `${Math.min(pullProgress / 1.5, 40)}px` }}
              >
                {isRefreshing ? (
                  <div className="flex items-center gap-1.5 text-xs font-semibold animate-pulse">
                    <svg className="animate-spin h-3.5 w-3.5 text-brand-green" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Refreshing...</span>
                  </div>
                ) : pullProgress > 60 ? (
                  <span className="text-xs font-semibold animate-pulse">Release to refresh</span>
                ) : (
                  <span className="text-xs font-medium">Pull to refresh</span>
                )}
              </div>
            )}

            {restroomsLoading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : fetchError ? (
              <div className="flex items-center gap-2 py-3 px-4 bg-[#F5F5F4] dark:bg-stone-900 rounded-xl mx-4 my-2">
                <span className="text-[#78716C] dark:text-stone-400 text-xs flex-1">
                  Couldn&apos;t load. Check connection.
                </span>
                <button 
                  className="text-[#0EA5E9] text-xs font-medium px-2.5 py-1 rounded hover:bg-stone-250 dark:hover:bg-stone-800"
                  onClick={fetchRestrooms}
                >
                  Retry
                </button>
              </div>
            ) : filteredRestrooms.length === 0 ? (
              <div className="py-12 text-center text-xs font-semibold text-text-disabled">
                No toilets registered under this category yet.
              </div>
            ) : (
              filteredRestrooms.map((restroom) => (
                <RestroomCard
                  key={restroom.id}
                  restroom={restroom}
                  userCoords={activeUserCoords}
                  onSelect={handleSelectRestroom}
                />
              ))
            )}
          </div>

          {/* Detailed Bottom Sheet View */}
          {selectedRestroom && (
            <RestroomDetail
              restroom={selectedRestroom}
              userCoords={activeUserCoords}
              onClose={() => setSelectedRestroom(null)}
              onVerify={() => setShowVerifyForm(true)}
              onReport={() => setShowReportForm(true)}
              isAuthenticated={isAuthenticated}
              onLoginPrompt={() => router.push("/login")}
            />
          )}

          {/* Verify / Update Ratings Form Modal */}
          {showVerifyForm && selectedRestroom && user && (
            <VerifyRestroomForm
              restroom={selectedRestroom}
              userId={user.id}
              onClose={() => setShowVerifyForm(false)}
              onSuccess={(updatedRestroom) => {
                setShowVerifyForm(false);
                setSelectedRestroom(updatedRestroom);
                fetchRestrooms(); // reload list
              }}
            />
          )}

          {/* Report Incorrect Info Form Modal */}
          {showReportForm && selectedRestroom && (
            <ReportForm
              restroom={selectedRestroom}
              userId={user?.id || null}
              onClose={() => setShowReportForm(false)}
              onSuccess={() => {
                setShowReportForm(false);
                alert("Thank you. Your report has been submitted and sent for admin review.");
              }}
            />
          )}

          {/* Add Restroom Form wizard modal */}
          {showAddForm && addingCoords && user && (
            <AddRestroomForm
              userId={user.id}
              selectedLat={addingCoords.lat}
              selectedLng={addingCoords.lng}
              existingRestrooms={restrooms}
              onClose={() => {
                setShowAddForm(false);
              }}
              onSuccess={(newRestroom) => {
                setShowAddForm(false);
                setIsAddingMode(false);
                setAddingCoords(null);
                fetchRestrooms(); // reload restrooms
                setSelectedRestroom(newRestroom); // open detail view
              }}
            />
          )}

        </main>
      )}

      {/* iOS PWA passive install hint banner */}
      {showIOSHint && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#F5F5F4] dark:bg-stone-900 border-t border-[#E7E5E4] dark:border-stone-800 px-4 py-3 flex items-center justify-between shadow-lg">
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
            Add to Home Screen for quick access (Share → Add to Home Screen)
          </span>
          <button
            onClick={() => {
              localStorage.setItem("ios-pwa-dismissed", "true");
              setShowIOSHint(false);
            }}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-250 text-xl font-bold p-1 ml-2 leading-none"
            aria-label="Dismiss install banner hint"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

