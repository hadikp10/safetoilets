import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSupabase } from "@/hooks/useSupabase";
import { useGeolocation } from "@/hooks/useGeolocation";
import { supabase } from "@/lib/supabase";
import { Restroom } from "@/types";
import RestroomCard, { calculateDistance } from "@/components/Restroom/RestroomCard";
import RestroomDetail from "@/components/Restroom/RestroomDetail";
import VerifyRestroomForm from "@/components/Restroom/VerifyRestroomForm";
import ReportForm from "@/components/Restroom/ReportForm";
import AddRestroomForm from "@/components/Restroom/AddRestroomForm";

// Dynamically import map container with SSR disabled to prevent Leaflet window reference errors
const MapContainer = dynamic(() => import("@/components/Map/MapContainer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-stone-100 dark:bg-stone-900 flex items-center justify-center">
      <svg className="animate-spin h-8 w-8 text-stone-500" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>
  ),
});

export default function Home() {
  const { user, profile, isAuthenticated, isAdmin, loginWithGoogle, logout } = useSupabase();
  const { latitude, longitude, error: geoError, loading: geoLoading, getPosition } = useGeolocation();

  // Application Views & Data
  const [restrooms, setRestrooms] = useState<Restroom[]>([]);
  const [hasSearched, setHasSearched] = useState(true);
  const [selectedRestroom, setSelectedRestroom] = useState<Restroom | null>(null);

  // Form Modals Toggles
  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  
  // Add Restroom mode states
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [addingCoords, setAddingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Fetch restrooms on initial load
  const fetchRestrooms = async () => {
    try {
      const { data, error } = await supabase
        .from("restrooms")
        .select("*")
        .eq("is_hidden", false);
      if (error) throw error;
      setRestrooms(data as Restroom[]);
    } catch (err) {
      console.error("Error loading restrooms:", err);
    }
  };

  useEffect(() => {
    fetchRestrooms();
  }, []);

  // Auto-request location access on mount
  useEffect(() => {
    getPosition();
  }, []);

  // Request location and activate map search
  const handleFindNearby = () => {
    setHasSearched(true);
    getPosition();
  };

  // Sort restrooms client-side based on user coordinates (if available)
  const getSortedRestrooms = () => {
    if (!latitude || !longitude) return restrooms;

    return [...restrooms].sort((a, b) => {
      const distA = calculateDistance(latitude, longitude, a.latitude, a.longitude);
      const distB = calculateDistance(latitude, longitude, b.latitude, b.longitude);
      return distA - distB;
    });
  };

  // Handle map center selection when user clicks a list card
  const handleSelectRestroom = (restroom: Restroom) => {
    setSelectedRestroom(restroom);
  };

  const activeUserCoords = latitude && longitude ? { latitude, longitude } : null;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-50 flex flex-col">
      {/* Top Navbar */}
      <header className="h-14 border-b border-stone-200 dark:border-stone-850 px-4 bg-white dark:bg-stone-900 flex justify-between items-center z-25 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black text-white dark:bg-white dark:text-black rounded-lg flex items-center justify-center font-black text-sm">
            ST
          </div>
          <span className="font-extrabold text-sm tracking-tight">SafeToilets</span>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              href="/admin"
              className="h-8 px-3 border border-stone-200 dark:border-stone-800 rounded-lg text-xs font-bold flex items-center justify-center hover:bg-stone-50 dark:hover:bg-stone-850 transition-colors"
            >
              Admin
            </Link>
          )}

          {isAuthenticated && profile ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-stone-500 max-w-[80px] truncate hidden xs:block">
                {profile.full_name || "User"}
              </span>
              <button
                onClick={logout}
                className="h-8 px-3 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 rounded-lg text-xs font-bold hover:bg-stone-200 active:scale-95 transition-all"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={loginWithGoogle}
              className="h-8 px-3 bg-black text-white dark:bg-white dark:text-black rounded-lg text-xs font-bold hover:bg-black/90 active:scale-95 transition-all"
            >
              Login
            </button>
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
          <p className="text-xs text-stone-550 dark:text-stone-400 font-semibold mt-2.5 leading-relaxed">
            Real-time crowdsourced cleanliness ratings and facilities mapping.
          </p>

          <button
            onClick={handleFindNearby}
            className="w-full h-14 bg-black text-white dark:bg-white dark:text-black font-black rounded-2xl text-sm flex items-center justify-center gap-2 mt-8 shadow-lg active:scale-[0.98] transition-transform"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Find Nearby Toilets
          </button>

          <div className="mt-12 text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
            <span>OpenStreetMap</span>
            <span className="w-1.5 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full"></span>
            <span>Supabase Secure RLS</span>
            <span className="w-1.5 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full"></span>
            <span>Client Encrypted Exif</span>
          </div>
        </main>
      ) : (
        // Active Map & List View (Split Screen Mobile Optimized)
        <main className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* Geolocation Loading / Error alerts */}
          {geoLoading && (
            <div className="bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-center text-xs font-bold z-30 flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Locating your device...
            </div>
          )}

          {geoError && (
            <div className="bg-rose-500 text-white px-4 py-2.5 text-center text-xs font-bold z-30 leading-snug">
              {geoError}. Showing central Kerala default view.
            </div>
          )}

          {/* Map Section (Upper Half) */}
          <div className="h-[45vh] relative flex-shrink-0 border-b border-stone-200 dark:border-stone-850">
            <MapContainer
              restrooms={restrooms}
              selectedRestroom={selectedRestroom}
              onSelectRestroom={handleSelectRestroom}
              userCoords={activeUserCoords}
              isAddingMode={isAddingMode}
              onLocationSelect={(lat, lng) => setAddingCoords({ lat, lng })}
            />

            {/* Quick Actions overlay on Map */}
            <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
              {/* Recenter button */}
              <button
                onClick={handleFindNearby}
                className="w-10 h-10 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                title="Find my location"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {/* Add Restroom Button */}
              {!isAddingMode && (
                <button
                  onClick={() => {
                    if (!isAuthenticated) {
                      loginWithGoogle();
                    } else {
                      setIsAddingMode(true);
                      setSelectedRestroom(null);
                    }
                  }}
                  className="h-10 px-3 bg-black text-white dark:bg-white dark:text-black rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg active:scale-90 transition-transform"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Toilet
                </button>
              )}
            </div>

            {/* Add Toilet Mode Bottom Panel */}
            {isAddingMode && addingCoords && (
              <div className="absolute bottom-4 left-4 right-4 z-20 bg-white dark:bg-stone-900 border border-stone-250 dark:border-stone-800 rounded-2xl p-4 shadow-xl flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-xs">Set Pin Location</h4>
                  <p className="text-[10px] text-stone-450 mt-0.5">Drag map pin to exact restroom site</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsAddingMode(false);
                      setAddingCoords(null);
                    }}
                    className="h-9 px-3 border border-stone-200 dark:border-stone-800 text-[11px] font-bold rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="h-9 px-3 bg-black text-white dark:bg-white dark:text-black text-[11px] font-bold rounded-lg"
                  >
                    Confirm Location
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* List View Section (Lower Half) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar bg-stone-50 dark:bg-stone-950">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                Toilets {activeUserCoords ? "Sorted by distance" : "Nearby"}
              </h2>
              <span className="text-[10px] font-bold text-stone-550 bg-stone-200/50 dark:bg-stone-850 px-2 py-0.5 rounded-full">
                {restrooms.length} found
              </span>
            </div>

            {restrooms.length === 0 ? (
              <div className="py-12 text-center text-xs font-semibold text-stone-400">
                No toilets registered yet. Be the first to add one!
              </div>
            ) : (
              getSortedRestrooms().map((restroom) => (
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
              onLoginPrompt={loginWithGoogle}
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
    </div>
  );
}
