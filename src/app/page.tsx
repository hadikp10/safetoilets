"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSupabase } from "@/hooks/useSupabase";
import { useLocation } from "@/lib/hooks/useLocation";
import { useNearbyToilets } from "@/lib/hooks/useNearbyToilets";
import { calculateDistance } from "@/lib/utils/distance";
import FilterPills from "@/components/ui/FilterPills";
import ToiletCard from "@/components/toilet/ToiletCard";
import SkeletonCard from "@/components/ui/SkeletonCard";
import MapSkeleton from "@/components/Map/MapSkeleton";
import { Restroom } from "@/types";

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

export default function HomePage() {
  const { isAuthenticated, loading: authLoading, profile, logout } = useSupabase();
  const { latitude, longitude, error: geoError, loading: geoLoading, getPosition, setState: setGeoState } = useLocation();

  const [filter, setFilter] = useState("all");
  const [mobileView, setMobileView] = useState<"both" | "map" | "list">("both");
  const [mapBounds, setMapBounds] = useState<{ minLat: number; maxLat: number; minLng: number; maxLng: number } | null>(null);
  const [selectedToilet, setSelectedToilet] = useState<Restroom | null>(null);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);

  // Auto trigger location check on startup if permission previously granted
  useEffect(() => {
    if (typeof window !== "undefined") {
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
  const { toilets, isLoading: toiletsLoading, error: toiletsError, mutate } = useNearbyToilets(mapBounds, filter);

  // Compute distances relative to user coords
  const getSortedToilets = () => {
    if (!latitude || !longitude) return toilets;
    return [...toilets].sort((a, b) => {
      const distA = calculateDistance(latitude, longitude, a.latitude, a.longitude);
      const distB = calculateDistance(latitude, longitude, b.latitude, b.longitude);
      return distA - distB;
    });
  };

  const sortedToilets = getSortedToilets();
  const userCoords = latitude && longitude ? { latitude, longitude } : null;

  return (
    <div className="min-h-screen bg-white text-[#191919] flex flex-col relative overflow-x-hidden animate-fadeIn">
      
      {/* Header Bar */}
      <header className="sticky top-0 z-50 h-[52px] px-4 flex justify-between items-center bg-white/90 backdrop-blur-md backdrop-saturate-[180%] border-b border-[#E9E9E7]/80">
        <div className="flex items-center">
          <Link href="/" className="text-[15px] font-semibold text-[#191919] tracking-tight">
            SafeToilets
          </Link>
        </div>

        <div className="flex items-center gap-3 min-h-[32px]">
          {authLoading ? (
            <div className="w-7 h-7 rounded-full bg-[#F5F5F4] animate-pulse" />
          ) : isAuthenticated ? (
            <div className="flex items-center gap-2.5">
              <Link
                href="/profile"
                className="w-7 h-7 rounded-full bg-[#EBFBEE] text-[#1E6E2E] text-[12px] font-medium flex items-center justify-center transition-colors hover:bg-[#d3f9d8]"
              >
                {getInitials(profile?.full_name)}
              </Link>
              <button
                onClick={logout}
                className="text-[13px] text-[#6B6B6B] hover:text-[#191919] font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-[13px] text-[#6B6B6B] hover:text-[#191919] font-medium transition-colors"
            >
              Sign in
            </Link>
          )}

          <Link href="/add">
            <button className="bg-[#191919] hover:bg-[#2F9E44] text-white text-[13px] font-medium h-[32px] px-3 rounded-lg shadow-button transition-colors active:scale-[0.97]">
              + Add
            </button>
          </Link>
        </div>
      </header>

      {/* Geolocation Access Denied Banner */}
      {geoError && (
        <div className="mx-4 my-3 bg-[#FFF4E6] text-[#B85C00] border border-[#E67700]/30 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm animate-fadeIn">
          <div className="flex items-start gap-2.5">
            <span className="text-xl">📍</span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">
                {geoError.toLowerCase().includes("denied") ? "Location access was denied." : "Location access issue"}
              </span>
              <span className="text-xs text-[#6B6B6B] mt-0.5">{geoError}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {geoError.toLowerCase().includes("denied") ? (
              <a
                href="https://support.google.com/chrome/answer/142065"
                target="_blank"
                rel="noopener noreferrer"
              >
                <button className="bg-[#E67700] hover:bg-[#B85C00] text-white text-xs font-semibold rounded-lg px-4 py-2 transition-colors active:scale-95">
                  Open Settings to Enable
                </button>
              </a>
            ) : (
              <button
                onClick={getPosition}
                className="bg-[#E67700] hover:bg-[#B85C00] text-white text-xs font-semibold rounded-lg px-4 py-2 transition-colors active:scale-95"
              >
                Retry GPS
              </button>
            )}
            <button
              onClick={() => setGeoState((prev) => ({ ...prev, error: null }))}
              className="bg-white hover:bg-[#F7F7F5] text-[#B85C00] border border-[#E9E9E7] text-xs font-semibold rounded-lg px-4 py-2 transition-colors"
            >
              Browse All Toilets in Kerala
            </button>
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
          <div className="h-[52vh] w-full rounded-b-[20px] overflow-hidden border-b border-[#E9E9E7] relative">
            <MapView
              toilets={toilets}
              selectedToilet={selectedToilet}
              onSelectToilet={(toilet) => {
                setSelectedToilet(toilet);
                setMobileView("list");
              }}
              userCoords={userCoords}
              isAddingMode={false}
              onBoundsChange={(bounds) => setMapBounds(bounds)}
            />
            {geoLoading && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-white/95 px-3 py-1 rounded-full flex items-center gap-2 shadow-sm border border-[#E9E9E7] animate-pulse">
                <div className="w-2 h-2 bg-[#2F9E44] rounded-full animate-ping" />
                <span className="text-[10px] font-medium text-[#6B6B6B] uppercase tracking-wider">Locating...</span>
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
          <FilterPills activeFilter={filter} onChange={setFilter} />

          {/* List Header */}
          <div className="px-4 pt-6 pb-2 flex justify-between items-center bg-white flex-shrink-0">
            <div className="flex items-center gap-1.5 text-[11px] font-medium tracking-widest uppercase text-[#999999]">
              <span>Nearby</span>
              <span className="text-[#D3D3CF] font-normal">·</span>
              <span className="font-mono font-normal tracking-normal lowercase">{toiletsLoading ? "scanning..." : `${sortedToilets.length} found`}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => mutate()}
                disabled={toiletsLoading}
                className="text-[13px] text-[#6B6B6B] flex items-center gap-1 hover:text-[#191919] transition-colors disabled:opacity-50"
              >
                <span>Closest</span>
                <svg className={`w-3.5 h-3.5 text-current ${toiletsLoading ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>

              {/* List/Map toggle */}
              <div className="flex bg-[#F7F7F5] p-0.5 rounded-lg border border-[#E9E9E7]">
                <button 
                  onClick={() => setMobileView("map")} 
                  className={`px-2 py-0.5 text-xs font-medium rounded transition ${
                    mobileView === "map" ? "bg-white text-[#191919] shadow-sm border border-[#E9E9E7]" : "text-[#6B6B6B] hover:text-[#191919]"
                  }`}
                >
                  Map
                </button>
                <button 
                  onClick={() => setMobileView("list")} 
                  className={`px-2 py-0.5 text-xs font-medium rounded transition ${
                    mobileView === "list" ? "bg-white text-[#191919] shadow-sm border border-[#E9E9E7]" : "text-[#6B6B6B] hover:text-[#191919]"
                  }`}
                >
                  List
                </button>
                <button 
                  onClick={() => setMobileView("both")} 
                  className={`hidden sm:block px-2 py-0.5 text-xs font-medium rounded transition ${
                    mobileView === "both" ? "bg-white text-[#191919] shadow-sm border border-[#E9E9E7]" : "text-[#6B6B6B] hover:text-[#191919]"
                  }`}
                >
                  Both
                </button>
              </div>
            </div>
          </div>

          {/* Toilet list items container */}
          <div 
            className="overflow-y-auto pb-8 no-scrollbar bg-white"
            style={{ height: "calc(100dvh - 52px - 52vh - 44px)" }}
          >
            {toiletsError ? (
              <div className="mx-4 my-2 py-3 px-4 bg-[#FFF0F0] border border-[#E03131]/30 rounded-xl flex items-center gap-2">
                <span className="text-[#C21010] text-xs flex-1">
                  Couldn&apos;t load. Check connection.
                </span>
                <button 
                  className="text-[#1971C2] text-xs font-medium px-2.5 py-1 rounded hover:bg-[#EFEEEB]"
                  onClick={() => mutate()}
                >
                  Retry
                </button>
              </div>
            ) : toiletsLoading ? (
              <div className="px-4 space-y-3">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : sortedToilets.length === 0 ? (
              /* Empty State (Notion style) */
              <div className="py-16 flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-[1.5px] border-[#D3D3CF] rounded-xl flex items-center justify-center text-xl text-[#999999] font-mono">
                  ?
                </div>
                <h3 className="text-base font-medium text-[#191919]">No toilets here yet</h3>
                <p className="text-sm text-[#6B6B6B] text-center max-w-[200px] leading-relaxed">
                  Add the first one and help your community.
                </p>
                <Link href="/add" className="mt-2">
                  <button className="bg-[#191919] hover:bg-[#2F9E44] text-white text-[13px] font-medium px-4 py-2 rounded-lg transition-colors active:scale-[0.97]">
                    + Add toilet
                  </button>
                </Link>
              </div>
            ) : (
              <div className="bg-[#F7F7F5] rounded-2xl overflow-hidden border border-[#E9E9E7] mx-4 flex flex-col divide-y divide-[#E9E9E7]">
                {sortedToilets.map((toilet) => (
                  <ToiletCard
                    key={toilet.id}
                    toilet={toilet}
                    distance={userCoords ? calculateDistance(userCoords.latitude, userCoords.longitude, toilet.latitude, toilet.longitude) : null}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

      </main>

      {/* Geolocation Permission Onboarding Modal */}
      {showLocationPrompt && (
        <div className="fixed inset-0 z-[120] bg-black/5 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-xl p-6 border border-[#E9E9E7] shadow-lg flex flex-col gap-4 text-left animate-fadeIn">
            <h3 className="text-[18px] font-semibold text-[#191919]">Location Access</h3>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed">
              SafeToilets needs your location to find nearby toilets. Allow browser permission to continue.
            </p>
            <div className="flex flex-col gap-2 mt-2">
              <button
                className="w-full h-[40px] bg-[#191919] hover:bg-[#2F9E44] text-white text-[14px] font-medium rounded-lg transition-colors"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    localStorage.setItem("geolocation_allowed", "true");
                  }
                  setShowLocationPrompt(false);
                  getPosition();
                }}
              >
                Allow Location Access
              </button>
              <button
                className="w-full h-[40px] bg-transparent border border-[#E9E9E7] hover:bg-[#EFEEEB] text-[#6B6B6B] text-[14px] font-medium rounded-lg transition-colors"
                onClick={() => {
                  setShowLocationPrompt(false);
                }}
              >
                Browse Without Location
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
