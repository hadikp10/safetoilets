"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSupabase } from "@/hooks/useSupabase";
import { useLocation } from "@/lib/hooks/useLocation";
import { useNearbyToilets } from "@/lib/hooks/useNearbyToilets";
import { calculateDistance } from "@/lib/utils/distance";
import FilterPills from "@/components/ui/FilterPills";
import ToiletCard from "@/components/toilet/ToiletCard";
import SkeletonCard from "@/components/ui/SkeletonCard";
import MapSkeleton from "@/components/Map/MapSkeleton";
import { Restroom } from "@/types";
import { MapPin, Smartphone, Inbox, Compass, Search, AlertCircle, Lock, RefreshCw } from "lucide-react";

// Dynamic map view to prevent Leaflet SSR errors
const MapView = dynamic(() => import("@/components/Map/MapView"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

function getInitials(name?: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0][0].toUpperCase();
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function HomePage() {
  const { isAuthenticated, loading: authLoading, profile, logout } = useSupabase();
  const { latitude, longitude, error: geoError, loading: geoLoading, getPosition, setState: setGeoState } = useLocation();

  const [activeFilters, setActiveFilters] = useState<string[]>(["all"]);
  const [secondsLoading, setSecondsLoading] = useState(0);
  const [browseWithoutCoords, setBrowseWithoutCoords] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Track location loading time in seconds
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (geoLoading) {
      setSecondsLoading(0);
      interval = setInterval(() => {
        setSecondsLoading((prev) => prev + 1);
      }, 1000);
    } else {
      setSecondsLoading(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [geoLoading]);

  // Handle Nominatim location search
  const handleSearchPlaces = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&countrycodes=in&viewbox=74.5,13.0,77.8,8.0&bounded=1`
      );
      if (!res.ok) throw new Error("Search service error.");
      const data = await res.json();
      const matches = data.map((item: { display_name: string; lat: string; lon: string }) => ({
        label: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      }));
      setSearchResults(matches);
    } catch (err) {
      console.error("Search failed:", err);
      setSearchError("Failed to search. Check your connection.");
    } finally {
      setSearchLoading(false);
    }
  };

  // Select place from search results
  const handleSelectSearchResult = (res: { label: string; lat: number; lng: number }) => {
    setGeoState((prev) => ({
      ...prev,
      latitude: res.lat,
      longitude: res.lng,
      isWithinKerala: true,
      loading: false,
      error: null,
    }));
    setSearchModalOpen(false);
    setSearchResults([]);
    setSearchQuery("");
    setBrowseWithoutCoords(false);
  };

  // Render the Place Search modal helper
  const renderSearchModal = () => {
    if (!searchModalOpen) return null;
    return (
      <div className="fixed inset-0 z-[130] bg-black/35 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white w-full max-w-md rounded-2xl p-6 border border-neutral-200 shadow-2xl flex flex-col gap-4 text-left"
        >
          <div className="flex justify-between items-center">
            <h3 className="text-[16px] font-semibold text-neutral-900 font-sans">Search a Place in Kerala</h3>
            <button
              onClick={() => {
                setSearchModalOpen(false);
                setSearchResults([]);
                setSearchQuery("");
                setSearchError(null);
              }}
              className="text-neutral-400 hover:text-neutral-600 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="E.g. Kochi, Trivandrum, Kozhikode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearchPlaces();
                }}
                className="w-full pl-9 pr-4 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-green"
              />
            </div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleSearchPlaces}
              disabled={searchLoading}
              className="bg-brand-green hover:bg-brand-greenDark text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
            >
              {searchLoading ? "Searching..." : "Search"}
            </motion.button>
          </div>

          {searchError && (
            <span className="text-xs text-brand-coralText bg-brand-coralLight px-3 py-1.5 rounded-lg border border-brand-coral/20">
              {searchError}
            </span>
          )}

          <div className="max-h-[220px] overflow-y-auto divide-y divide-neutral-100 no-scrollbar">
            {searchResults.length === 0 && !searchLoading && searchQuery.trim() !== "" && (
              <div className="py-6 text-center text-xs text-neutral-500">
                No places found. Check name and connection.
              </div>
            )}
            {searchResults.map((res, i) => (
              <button
                key={i}
                onClick={() => handleSelectSearchResult(res)}
                className="w-full text-left py-2.5 px-3 hover:bg-neutral-50 rounded-lg text-sm text-neutral-700 flex flex-col gap-0.5 transition-colors"
              >
                <span className="font-medium text-neutral-900">{res.label.split(",")[0]}</span>
                <span className="text-[11px] text-neutral-500 line-clamp-1">{res.label}</span>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  };
  const [mobileView, setMobileView] = useState<"both" | "map" | "list">("both");
  const [mapBounds, setMapBounds] = useState<{ minLat: number; maxLat: number; minLng: number; maxLng: number } | null>(null);
  const [selectedToilet, setSelectedToilet] = useState<Restroom | null>(null);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const savedView = localStorage.getItem("safetoilets_view_preference");
    if (savedView === "both" || savedView === "map" || savedView === "list") {
      setMobileView(savedView);
    }
  }, []);

  // Check for map centering parameters (e.g. from post-contribution CTAs)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const latParam = searchParams.get("lat");
      const lngParam = searchParams.get("lng");
      if (latParam && lngParam) {
        const latVal = parseFloat(latParam);
        const lngVal = parseFloat(lngParam);
        if (!isNaN(latVal) && !isNaN(lngVal)) {
          setGeoState((prev) => ({
            ...prev,
            latitude: latVal,
            longitude: lngVal,
            isWithinKerala: true,
            loading: false,
            error: null,
          }));
        }
      }
    }
  }, [setGeoState]);

  const handleViewChange = (view: "both" | "map" | "list") => {
    setMobileView(view);
    localStorage.setItem("safetoilets_view_preference", view);
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    }
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  // Auto trigger location check on startup if permission previously granted
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("lat") && searchParams.get("lng")) {
        // Skip auto geolocation if coordinates were supplied via query parameters
        return;
      }

      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: "geolocation" }).then((status) => {
          if (status.state === "granted") {
            getPosition();
          } else {
            setShowLocationPrompt(true);
          }
        }).catch(() => {
          if (localStorage.getItem("geolocation_allowed") === "true") {
            getPosition();
          } else {
            setShowLocationPrompt(true);
          }
        });
      } else {
        if (localStorage.getItem("geolocation_allowed") === "true") {
          getPosition();
        } else {
          setShowLocationPrompt(true);
        }
      }
    }
  }, [getPosition]);

  // Fetch toilets within current map bounds using SWR
  const { toilets, isLoading: toiletsLoading, error: toiletsError, mutate } = useNearbyToilets(mapBounds, activeFilters);

  // Compute distances relative to user coords or map center
  const getSortedToilets = () => {
    let refLat = latitude;
    let refLng = longitude;

    if (!refLat || !refLng) {
      if (mapBounds) {
        refLat = (mapBounds.minLat + mapBounds.maxLat) / 2;
        refLng = (mapBounds.minLng + mapBounds.maxLng) / 2;
      } else {
        refLat = 9.9816;
        refLng = 76.2999;
      }
    }

    return [...toilets].sort((a, b) => {
      const distA = calculateDistance(refLat!, refLng!, a.latitude, a.longitude);
      const distB = calculateDistance(refLat!, refLng!, b.latitude, b.longitude);
      return distA - distB;
    });
  };

  const sortedToilets = getSortedToilets();
  const refCoords = latitude && longitude ? { latitude, longitude } : (mapBounds ? {
    latitude: (mapBounds.minLat + mapBounds.maxLat) / 2,
    longitude: (mapBounds.minLng + mapBounds.maxLng) / 2
  } : null);

  const isPermissionDenied = geoError && geoError.toLowerCase().includes("denied");
  const hasError = geoError && !isPermissionDenied;
  const isFinalFailure = secondsLoading >= 20 || hasError;

  if (latitude === null && !browseWithoutCoords && (geoLoading || geoError)) {
    return (
      <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col relative overflow-hidden font-sans">
        <header className="sticky top-0 z-50 h-[52px] px-4 flex justify-between items-center bg-white/90 backdrop-blur-md backdrop-saturate-[180%] border-b border-neutral-200/80">
          <div className="flex items-center">
            <span className="text-[15px] font-medium text-neutral-900 tracking-tight">
              SafeToilets
            </span>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-full max-w-sm flex flex-col items-center justify-center p-6 text-center bg-white rounded-2xl border border-neutral-200/80 shadow-card">
            
            <div className="mb-6 h-16 flex items-center justify-center">
              {isPermissionDenied ? (
                <div className="w-12 h-12 text-neutral-400 bg-neutral-100 rounded-full flex items-center justify-center animate-pulse">
                  <Lock className="w-6 h-6" />
                </div>
              ) : isFinalFailure ? (
                <div className="w-12 h-12 text-brand-yellow bg-brand-yellowLight rounded-full flex items-center justify-center animate-pulse">
                  <AlertCircle className="w-6 h-6" />
                </div>
              ) : (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                  className="w-12 h-12 text-brand-green flex items-center justify-center"
                >
                  <Compass className="w-10 h-10" />
                </motion.div>
              )}
            </div>

            <h3 className="text-[17px] font-semibold text-neutral-900 tracking-tight">
              {isPermissionDenied
                ? "Location access was denied"
                : isFinalFailure
                ? "Location access issue"
                : "Finding toilets near you"}
            </h3>

            <div className="min-h-[48px] mt-2 mb-6">
              <p className="text-[13px] text-neutral-500 leading-relaxed max-w-[280px] mx-auto">
                {isPermissionDenied ? (
                  "SafeToilets needs location access to find toilets near you. Please enable location settings in your browser."
                ) : isFinalFailure ? (
                  "We're having trouble getting your location right now."
                ) : secondsLoading < 3 ? (
                  "Looking for toilets around you..."
                ) : secondsLoading < 6 ? (
                  "Getting your exact location..."
                ) : secondsLoading < 10 ? (
                  "Almost there. Matching you with nearby toilets..."
                ) : (
                  "Still working on it. Some phones need a little extra time to get an accurate GPS signal."
                )}
              </p>
            </div>

            <div className="w-full flex flex-col gap-2">
              {isPermissionDenied ? (
                <>
                  <a
                    href="https://support.google.com/chrome/answer/142065"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full"
                  >
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      className="w-full h-[40px] bg-brand-green hover:bg-brand-greenDark text-white text-[13px] font-medium rounded-xl transition-colors shadow-button"
                    >
                      Open Settings to Enable
                    </motion.button>
                  </a>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setBrowseWithoutCoords(true)}
                    className="w-full h-[40px] bg-transparent border border-neutral-200 hover:bg-neutral-50 text-neutral-600 text-[13px] font-medium rounded-xl transition-colors"
                  >
                    Browse Toilets
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setSearchModalOpen(true)}
                    className="w-full h-[40px] bg-transparent border border-neutral-200 hover:bg-neutral-50 text-neutral-600 text-[13px] font-medium rounded-xl transition-colors"
                  >
                    Search a Place
                  </motion.button>
                </>
              ) : isFinalFailure ? (
                <>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      setBrowseWithoutCoords(false);
                      getPosition(true);
                    }}
                    className="w-full h-[40px] bg-brand-green hover:bg-brand-greenDark text-white text-[13px] font-medium rounded-xl transition-colors shadow-button flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry GPS</span>
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setBrowseWithoutCoords(true)}
                    className="w-full h-[40px] bg-transparent border border-neutral-200 hover:bg-neutral-50 text-neutral-600 text-[13px] font-medium rounded-xl transition-colors"
                  >
                    Browse Toilets
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setSearchModalOpen(true)}
                    className="w-full h-[40px] bg-transparent border border-neutral-200 hover:bg-neutral-50 text-neutral-600 text-[13px] font-medium rounded-xl transition-colors"
                  >
                    Search a Place
                  </motion.button>
                </>
              ) : secondsLoading >= 10 ? (
                <>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setBrowseWithoutCoords(true)}
                    className="w-full h-[40px] bg-transparent border border-neutral-200 hover:bg-neutral-50 text-neutral-600 text-[13px] font-medium rounded-xl transition-colors"
                  >
                    Browse Toilets
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setSearchModalOpen(true)}
                    className="w-full h-[40px] bg-transparent border border-neutral-200 hover:bg-neutral-50 text-neutral-600 text-[13px] font-medium rounded-xl transition-colors"
                  >
                    Search a Place
                  </motion.button>
                </>
              ) : null}
            </div>

          </div>
        </main>
        {renderSearchModal()}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col relative overflow-x-hidden"
    >
      
      <header className="sticky top-0 z-50 h-[52px] px-4 flex justify-between items-center bg-white/90 backdrop-blur-md backdrop-saturate-[180%] border-b border-neutral-200/80">
        <div className="flex items-center">
          <Link href="/" className="text-[15px] font-medium text-neutral-900 tracking-tight">
            SafeToilets
          </Link>
        </div>

        <div className="flex items-center gap-3 min-h-[32px]">
          {authLoading ? (
            <div className="w-7 h-7 rounded-full bg-neutral-100 animate-pulse" />
          ) : isAuthenticated ? (
            <div className="flex items-center gap-2.5">
              <Link
                href="/profile"
                className="w-7 h-7 rounded-full bg-brand-greenLight text-brand-greenText text-[12px] font-medium flex items-center justify-center transition-colors hover:bg-brand-greenLight/80"
              >
                {getInitials(profile?.full_name)}
              </Link>
              <button
                onClick={logout}
                className="text-[13px] text-neutral-600 hover:text-neutral-900 font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-[13px] text-neutral-600 hover:text-neutral-900 font-medium transition-colors"
            >
              Sign in
            </Link>
          )}

          <Link href="/add">
            <motion.button
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.08 }}
              className="bg-brand-green hover:bg-brand-greenDark text-white text-[13px] font-medium h-[32px] px-3 rounded-lg shadow-button transition-colors"
            >
              + Add
            </motion.button>
          </Link>
        </div>
      </header>

      {/* PWA Install Banner */}
      {showInstallBanner && (
        <div className="mx-4 my-2 bg-neutral-100 border border-neutral-200 p-2.5 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-neutral-600" />
            <div className="flex flex-col text-left">
              <span className="text-xs font-medium text-neutral-900">Install SafeToilets App</span>
              <span className="text-[10px] text-neutral-600">Access restrooms quickly from your home screen</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <motion.button
              onClick={handleInstallClick}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.08 }}
              className="bg-brand-green hover:bg-brand-greenDark text-white text-[11px] font-medium h-[28px] px-3 rounded-lg transition-colors"
            >
              Install
            </motion.button>
            <motion.button
              onClick={() => setShowInstallBanner(false)}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.08 }}
              className="text-neutral-600 hover:text-neutral-900 text-xs px-2 py-1 font-medium"
            >
              Dismiss
            </motion.button>
          </div>
        </div>
      )}

      {/* Geolocation Access Denied Banner */}
      {browseWithoutCoords && geoError && (
        <div className="mx-4 my-3 bg-brand-yellowLight text-brand-yellowText border border-brand-yellow/30 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-5 h-5 text-brand-yellow" />
            <div className="flex flex-col text-left">
              <span className="text-sm font-medium">
                {geoError.toLowerCase().includes("denied") ? "Location access was denied." : "Location access issue"}
              </span>
              <span className="text-xs text-neutral-600 mt-0.5">{geoError}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {geoError.toLowerCase().includes("denied") ? (
              <a
                href="https://support.google.com/chrome/answer/142065"
                target="_blank"
                rel="noopener noreferrer"
              >
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  transition={{ duration: 0.08 }}
                  className="bg-brand-green hover:bg-brand-greenDark text-white text-xs font-medium rounded-lg px-4 py-2 transition-colors"
                >
                  Open Settings to Enable
                </motion.button>
              </a>
            ) : (
              <motion.button
                onClick={() => {
                  setBrowseWithoutCoords(false);
                  getPosition(true);
                }}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.08 }}
                className="bg-brand-green hover:bg-brand-greenDark text-white text-xs font-medium rounded-lg px-4 py-2 transition-colors"
              >
                Retry GPS
              </motion.button>
            )}
            <motion.button
              onClick={() => {
                setGeoState((prev) => ({ ...prev, error: null }));
              }}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.08 }}
              className="bg-white hover:bg-neutral-100 text-brand-yellowText border border-neutral-200 text-xs font-medium rounded-lg px-4 py-2 transition-colors"
            >
              Browse All Toilets in Kerala
            </motion.button>
          </div>
        </div>
      )}

      {/* Main content grid */}
      <main className="flex-1 flex flex-col sm:flex-row">
        
        {/* Map Container */}
        <section 
          className={`w-full sm:w-1/2 flex-shrink-0 ${
            mobileView === "list" ? "hidden sm:block" : "block"
          }`}
        >
          <div className="h-[52vh] w-full rounded-b-[20px] overflow-hidden border-b border-neutral-200 relative">
            <MapView
              toilets={toilets}
              selectedToilet={selectedToilet}
              onSelectToilet={(toilet) => {
                setSelectedToilet(toilet);
                handleViewChange("list");
              }}
              userCoords={latitude && longitude ? { latitude, longitude } : null}
              isAddingMode={false}
              onBoundsChange={(bounds) => setMapBounds(bounds)}
            />
            {geoLoading && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-white/95 px-3 py-1 rounded-full flex items-center gap-2 shadow-sm border border-neutral-200">
                <div className="w-2 h-2 bg-brand-green rounded-full animate-ping" />
                <span className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider">Locating...</span>
              </div>
            )}
          </div>
        </section>

        {/* List Section */}
        <section 
          className={`flex-1 flex flex-col ${
            mobileView === "map" ? "hidden sm:block" : "block"
          }`}
        >
          {/* Filter Bar */}
          <FilterPills activeFilters={activeFilters} onChange={setActiveFilters} />

          {/* List Header */}
          <div className="px-4 pt-6 pb-2 flex justify-between items-center bg-white flex-shrink-0">
            <div className="flex items-center gap-1.5 text-[11px] font-medium tracking-widest uppercase text-neutral-400">
              <span>Nearby</span>
              <span className="text-neutral-200 font-normal">·</span>
              <span className="font-mono font-normal tracking-normal lowercase">{toiletsLoading ? "scanning..." : `${sortedToilets.length} found`}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <motion.button 
                onClick={() => mutate()}
                disabled={toiletsLoading}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.08 }}
                className="text-[13px] text-neutral-600 flex items-center gap-1 hover:text-neutral-900 transition-colors disabled:opacity-50"
              >
                <span>Closest</span>
                <svg className={`w-3.5 h-3.5 text-current ${toiletsLoading ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </motion.button>

              {/* List/Map toggle */}
              <div className="flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200">
                <motion.button 
                  onClick={() => handleViewChange("map")} 
                  whileTap={{ scale: 0.96 }}
                  transition={{ duration: 0.08 }}
                  className={`px-2 py-0.5 text-xs font-medium rounded transition ${
                    mobileView === "map" ? "bg-white text-neutral-900 shadow-sm border border-neutral-200" : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  Map
                </motion.button>
                <motion.button 
                  onClick={() => handleViewChange("list")} 
                  whileTap={{ scale: 0.96 }}
                  transition={{ duration: 0.08 }}
                  className={`px-2 py-0.5 text-xs font-medium rounded transition ${
                    mobileView === "list" ? "bg-white text-neutral-900 shadow-sm border border-neutral-200" : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  List
                </motion.button>
                <motion.button 
                  onClick={() => handleViewChange("both")} 
                  whileTap={{ scale: 0.96 }}
                  transition={{ duration: 0.08 }}
                  className={`hidden sm:block px-2 py-0.5 text-xs font-medium rounded transition ${
                    mobileView === "both" ? "bg-white text-neutral-900 shadow-sm border border-neutral-200" : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  Both
                </motion.button>
              </div>
            </div>
          </div>

          {/* Toilet list items container */}
          <div 
            className="overflow-y-auto pb-8 no-scrollbar bg-white"
            style={{ height: "calc(100dvh - 52px - 52vh - 44px)" }}
          >
            {toiletsError ? (
              <div className="mx-4 my-2 py-3 px-4 bg-brand-coralLight border border-brand-coral/30 rounded-xl flex items-center gap-2">
                <span className="text-brand-coralText text-xs flex-1">
                  Couldn&apos;t load. Check connection.
                </span>
                <motion.button 
                  whileTap={{ scale: 0.96 }}
                  transition={{ duration: 0.08 }}
                  className="text-brand-greenText text-xs font-medium px-2.5 py-1 rounded hover:bg-neutral-100"
                  onClick={() => mutate()}
                >
                  Retry
                </motion.button>
              </div>
            ) : toiletsLoading ? (
              <div className="px-4 space-y-3">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : sortedToilets.length === 0 ? (
              !activeFilters.includes("all") ? (
                <div className="py-16 flex flex-col items-center gap-3 text-center px-4">
                  <div className="w-10 h-10 border border-neutral-200 rounded-xl flex items-center justify-center text-xl text-neutral-400">
                    <Inbox className="w-5 h-5 text-neutral-400" />
                  </div>
                  <h3 className="text-base font-medium text-neutral-900">No matching toilets</h3>
                  <p className="text-sm text-neutral-600 text-center max-w-[240px] leading-relaxed">
                    No toilets match your selected filters. Try removing some filters to see results.
                  </p>
                  <motion.button
                    onClick={() => setActiveFilters(["all"])}
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.08 }}
                    className="mt-2 bg-brand-green hover:bg-brand-greenDark text-white text-[13px] font-medium h-[32px] px-4 rounded-lg transition-colors"
                  >
                    Clear Filters
                  </motion.button>
                </div>
              ) : (
                /* Empty State (Notion style) */
                <div className="py-16 flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border border-neutral-200 rounded-xl flex items-center justify-center text-xl text-neutral-400 font-mono">
                    ?
                  </div>
                  <h3 className="text-base font-medium text-neutral-900">No toilets here yet</h3>
                  <p className="text-sm text-neutral-600 text-center max-w-[200px] leading-relaxed">
                    Add the first one and help your community.
                  </p>
                  <Link href="/add" className="mt-2">
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      transition={{ duration: 0.08 }}
                      className="bg-brand-green hover:bg-brand-greenDark text-white text-[13px] font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                      + Add toilet
                    </motion.button>
                  </Link>
                </div>
              )
            ) : (
              <motion.div
                variants={{
                  show: { transition: { staggerChildren: 0.055 } }
                }}
                initial="hidden"
                animate="show"
                className="bg-white rounded-[20px] overflow-hidden border border-neutral-200 mx-4 flex flex-col divide-y divide-neutral-200 shadow-card"
              >
                {sortedToilets.map((toilet) => (
                  <ToiletCard
                    key={toilet.id}
                    toilet={toilet}
                    distance={refCoords ? calculateDistance(refCoords.latitude, refCoords.longitude, toilet.latitude, toilet.longitude) : null}
                  />
                ))}
              </motion.div>
            )}
          </div>
        </section>

      </main>

      {/* Geolocation Permission Onboarding Modal */}
      {showLocationPrompt && (
        <div className="fixed inset-0 z-[120] bg-black/5 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-xl p-6 border border-neutral-200 shadow-lg flex flex-col gap-4 text-left">
            <h3 className="text-[18px] font-semibold text-neutral-900">Location Access</h3>
            <p className="text-[14px] text-neutral-600 leading-relaxed">
              SafeToilets needs your location to find nearby toilets. Allow browser permission to continue.
            </p>
            <div className="flex flex-col gap-2 mt-2">
              <motion.button
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.08 }}
                className="w-full h-[40px] bg-brand-green hover:bg-brand-greenDark text-white text-[14px] font-medium rounded-lg transition-colors"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    localStorage.setItem("geolocation_allowed", "true");
                  }
                  setShowLocationPrompt(false);
                  getPosition();
                }}
              >
                Allow Location Access
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.08 }}
                className="w-full h-[40px] bg-transparent border border-neutral-200 hover:bg-neutral-100 text-neutral-600 text-[14px] font-medium rounded-lg transition-colors"
                onClick={() => {
                  setShowLocationPrompt(false);
                }}
              >
                Browse Without Location
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {renderSearchModal()}

    </motion.div>
  );
}
