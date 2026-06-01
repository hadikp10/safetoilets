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
import Button from "@/components/ui/Button";
import { Restroom } from "@/types";
import { MapPin, Smartphone, Inbox, Compass, Search, AlertCircle, Lock, RefreshCw, Sparkles, ShieldCheck, Accessibility, Clock, Image as ImageIcon } from "lucide-react";

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
  const [hasAcceptedLanding, setHasAcceptedLanding] = useState(false);

  // If coordinates are in URL query, bypass landing page
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("lat") && searchParams.get("lng")) {
        setHasAcceptedLanding(true);
      }
    }
  }, []);

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
            <h3 className="text-[16px] font-semibold text-neutral-900 font-sans">Search a Place</h3>
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
              <Search className="absolute left-3 top-3 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                placeholder="E.g. Kochi, Trivandrum, Kozhikode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearchPlaces();
                }}
                className="w-full h-10 pl-9 pr-4 border border-surface-border bg-white placeholder-text-disabled rounded-xl text-sm text-text-primary focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/20 transition-all shadow-sm"
              />
            </div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleSearchPlaces}
              disabled={searchLoading}
              className="bg-brand-green hover:bg-brand-greenDark text-white text-sm font-medium h-10 px-4 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
            >
              {searchLoading ? "Searching..." : "Search"}
            </motion.button>
          </div>

          {searchError && (
            <span className="text-xs text-text-secondary bg-brand-greenVeryLight px-3 py-1.5 rounded-lg border border-brand-green/20">
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
    if (!hasAcceptedLanding) return;

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
  }, [getPosition, hasAcceptedLanding]);

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

  if (!hasAcceptedLanding) {
    return (
      <div className="min-h-screen bg-surface-bg text-text-primary flex flex-col relative overflow-x-hidden">
        {/* Header Bar */}
        <header className="h-[52px] bg-surface-card border-b border-surface-border px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-brand-green font-bold text-xl tracking-tight">SafeToilets</span>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary">Hi, {profile?.full_name || "User"}</span>
                <Button variant="ghost" className="h-8 px-2 text-xs" onClick={logout}>
                  Logout
                </Button>
              </div>
            ) : (
              <Link href="/login">
                <Button variant="ghost" className="h-8 px-2 text-xs">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-md mx-auto w-full text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex flex-col items-center w-full"
          >
            {/* Tag Badge */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-greenLight text-brand-greenDark mb-6 border border-brand-green/10">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              100% Verified Community Restrooms
            </span>

            {/* Headline */}
            <h1 className="text-3xl font-extrabold tracking-tight leading-tight text-text-primary sm:text-4xl">
              Find Public Toilets Near You
            </h1>

            {/* Supporting Text */}
            <p className="text-sm text-text-secondary mt-3 max-w-sm leading-relaxed">
              Find toilets with details that matter before you go.
            </p>

            {/* CTA Button */}
            <div className="w-full mt-8 px-4 flex flex-col gap-2">
              <Button
                onClick={() => {
                  if (typeof window !== "undefined") {
                    localStorage.setItem("geolocation_allowed", "true");
                  }
                  getPosition();
                  setHasAcceptedLanding(true);
                }}
                className="w-full h-12 bg-brand-green hover:bg-brand-greenDark text-text-inverse font-bold text-sm shadow-md rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 group border-none"
              >
                <MapPin className="w-4 h-4 group-hover:animate-bounce" />
                Find Toilets Near Me
              </Button>
              <button
                onClick={() => {
                  setBrowseWithoutCoords(true);
                  setHasAcceptedLanding(true);
                }}
                className="text-xs text-text-secondary hover:text-text-primary underline mt-2 transition"
              >
                Or browse all restrooms
              </button>
            </div>
          </motion.div>

          {/* Trust Indicators Grid */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.08, ease: "easeOut" }}
            className="w-full mt-10"
          >
            <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider text-left mb-4 px-2">
              Why SafeToilets?
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-card border border-surface-border rounded-2xl p-4 text-left shadow-sm flex flex-col justify-between h-28">
                <ShieldCheck className="w-5 h-5 text-brand-green" />
                <div>
                  <h3 className="text-xs font-bold text-text-primary font-sans">Community-Contributed</h3>
                  <p className="text-[10px] text-text-secondary mt-0.5">Verified updates from visitors.</p>
                </div>
              </div>
              <div className="bg-surface-card border border-surface-border rounded-2xl p-4 text-left shadow-sm flex flex-col justify-between h-28">
                <Accessibility className="w-5 h-5 text-brand-green" />
                <div>
                  <h3 className="text-xs font-bold text-text-primary font-sans">Gender & Access</h3>
                  <p className="text-[10px] text-text-secondary mt-0.5">Accessibility & safety indicators.</p>
                </div>
              </div>
              <div className="bg-surface-card border border-surface-border rounded-2xl p-4 text-left shadow-sm flex flex-col justify-between h-28">
                <Sparkles className="w-5 h-5 text-brand-green" />
                <div>
                  <h3 className="text-xs font-bold text-text-primary font-sans">Amenities Listed</h3>
                  <p className="text-[10px] text-text-secondary mt-0.5">Soap, mirrors, bins documented.</p>
                </div>
              </div>
              <div className="bg-surface-card border border-surface-border rounded-2xl p-4 text-left shadow-sm flex flex-col justify-between h-28">
                <Compass className="w-5 h-5 text-brand-green" />
                <div>
                  <h3 className="text-xs font-bold text-text-primary font-sans">Location Search</h3>
                  <p className="text-[10px] text-text-secondary mt-0.5 font-sans">Real-time distance metrics.</p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Features Detail Section */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.16, ease: "easeOut" }}
            className="w-full mt-10 border-t border-surface-border pt-8 pb-4"
          >
            <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider text-left mb-4 px-2">
              Features
            </h2>
            <div className="space-y-3.5 text-left px-2">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-brand-greenLight text-brand-green">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-text-primary font-sans">Cleanliness Ratings</h4>
                  <p className="text-[10px] text-text-secondary mt-0.5 font-sans">Five-star scores on hygiene, smell, lighting, safety, and water.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-brand-greenLight text-brand-green">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-text-primary font-sans">Visitor Photos</h4>
                  <p className="text-[10px] text-text-secondary mt-0.5 font-sans">Real user uploads to preview cleanliness before arriving.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-brand-greenLight text-brand-green">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-text-primary font-sans">Opening Hours</h4>
                  <p className="text-[10px] text-text-secondary mt-0.5 font-sans">Checks on night safety and 24-hour service flags.</p>
                </div>
              </div>
            </div>
          </motion.section>
        </main>
      </div>
    );
  }

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
                <div className="w-12 h-12 text-text-secondary bg-surface-muted rounded-full flex items-center justify-center animate-pulse">
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
      className="min-h-screen bg-surface-bg text-text-primary flex flex-col relative overflow-x-hidden"
    >
      
      <header className="sticky top-0 z-50 h-[52px] px-4 flex justify-between items-center bg-surface-card/90 backdrop-blur-md backdrop-saturate-[180%] border-b border-surface-border">
        <div className="flex items-center">
          <Link href="/" className="text-sm font-bold text-text-primary tracking-tight flex items-center gap-1.5">
            <span className="text-brand-green">SafeToilets</span>
          </Link>
        </div>

        <div className="flex items-center gap-3 min-h-[32px]">
          {authLoading ? (
            <div className="w-7 h-7 rounded-full bg-surface-muted animate-pulse" />
          ) : isAuthenticated ? (
            <div className="flex items-center gap-2.5">
              <Link
                href="/profile"
                className="w-7 h-7 rounded-full bg-brand-greenLight text-brand-greenDark text-[12px] font-medium flex items-center justify-center transition-colors hover:bg-brand-greenLight/80"
              >
                {getInitials(profile?.full_name)}
              </Link>
              <button
                onClick={logout}
                className="text-[13px] text-text-secondary hover:text-text-primary font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link href="/login">
              <Button variant="ghost" className="h-8 px-2.5 text-xs font-semibold">
                Sign In
              </Button>
            </Link>
          )}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSearchModalOpen(true)}
            className="text-text-secondary hover:text-text-primary rounded-full min-h-[28px] min-w-[28px]"
            aria-label="Search places"
          >
            <Search className="w-4 h-4" />
          </Button>

          <Link href="/add">
            <Button size="sm" className="bg-brand-green hover:bg-brand-greenDark text-text-inverse rounded-full font-semibold px-4">
              Add Toilet
            </Button>
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
        <div className="mx-4 my-3 bg-brand-greenVeryLight text-text-primary border border-brand-green/20 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-5 h-5 text-brand-green" />
            <div className="flex flex-col text-left">
              <span className="text-sm font-medium">
                {geoError.toLowerCase().includes("denied") ? "Location access was denied." : "Location access issue"}
              </span>
              <span className="text-xs text-text-secondary mt-0.5">{geoError}</span>
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
              className="bg-white hover:bg-neutral-100 text-text-secondary border border-neutral-200 text-xs font-medium rounded-lg px-4 py-2 transition-colors"
            >
              Browse All Toilets
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
            className="overflow-y-auto pb-8 no-scrollbar bg-surface-bg py-4"
            style={{ height: "calc(100dvh - 52px - 52vh - 44px)" }}
          >
            {toiletsError ? (
              <div className="mx-4 my-2 py-3 px-4 bg-brand-greenVeryLight border border-brand-green/20 rounded-xl flex items-center gap-2">
                <span className="text-text-secondary text-xs flex-1">
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
                /* Polished Empty State (Apple/Notion style) */
                <div className="py-12 px-6 mx-4 my-2 bg-white rounded-2xl border border-surface-border text-center flex flex-col items-center gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_1px_2px_rgba(0,0,0,0.03)]">
                  <div className="w-12 h-12 bg-neutral-50 rounded-full border border-neutral-100 flex items-center justify-center text-lg shadow-sm">
                    📍
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-text-primary">No toilets added in this area</h3>
                    <p className="text-xs text-text-secondary max-w-[240px] leading-relaxed mx-auto">
                      Be the first to help your community by mapping a nearby public restroom.
                    </p>
                  </div>
                  <Link href="/add">
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      transition={{ duration: 0.08 }}
                      className="bg-brand-green hover:bg-brand-greenDark text-white text-xs font-semibold h-9 px-4 rounded-xl shadow-sm transition-colors flex items-center gap-1"
                    >
                      <span>+ Add Restroom</span>
                    </motion.button>
                  </Link>
                </div>
              )
            ) : (
              <motion.div
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.04
                    }
                  }
                }}
                className="space-y-3.5 px-4"
              >
                {sortedToilets.map((toilet) => (
                  <motion.div
                    key={toilet.id}
                    variants={{
                      hidden: { opacity: 0, y: 8 },
                      show: { opacity: 1, y: 0 }
                    }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    <ToiletCard
                      toilet={toilet}
                      distance={refCoords ? calculateDistance(refCoords.latitude, refCoords.longitude, toilet.latitude, toilet.longitude) : null}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </section>

      </main>

      {/* Geolocation Permission Onboarding Modal */}
      {showLocationPrompt && (
        <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-card w-full max-w-sm rounded-2xl p-6 border border-surface-border shadow-2xl flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-brand-green/10 text-brand-green flex items-center justify-center text-xl mx-auto">
              📍
            </div>
            <h3 className="font-bold text-text-primary text-lg">Location Access</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              SafeToilets needs your location to find nearby toilets.
            </p>
            <div className="flex flex-col gap-2 mt-2">
              <Button
                variant="primary"
                fullWidth
                onClick={() => {
                  if (typeof window !== "undefined") {
                    localStorage.setItem("geolocation_allowed", "true");
                  }
                  setShowLocationPrompt(false);
                  getPosition();
                }}
              >
                Allow Location Access
              </Button>
              <Button
                variant="ghost"
                fullWidth
                onClick={() => {
                  setShowLocationPrompt(false);
                }}
              >
                Browse Without Location
              </Button>
            </div>
          </div>
        </div>
      )}

      {renderSearchModal()}

    </motion.div>
  );
}
