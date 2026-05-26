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
import Button from "@/components/ui/Button";
import { Restroom } from "@/types";

// Dynamic map view to prevent Leaflet SSR errors (Section 3c)
const MapView = dynamic(() => import("@/components/Map/MapView"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export default function HomePage() {
  const { isAuthenticated, loading: authLoading, loginWithGoogle, logout } = useSupabase();
  const { latitude, longitude, error: geoError, loading: geoLoading, getPosition, setState: setGeoState } = useLocation();

  const [filter, setFilter] = useState("all");
  const [mobileView, setMobileView] = useState<"both" | "map" | "list">("both");
  const [mapBounds, setMapBounds] = useState<{ minLat: number; maxLat: number; minLng: number; maxLng: number } | null>(null);
  const [selectedToilet, setSelectedToilet] = useState<Restroom | null>(null);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);

  // Auto trigger location check on startup if permission previously granted (Section 2a)
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

  // Fetch toilets within current map bounds + 500m buffer using SWR (Section 9b / 9c)
  const { toilets, isLoading: toiletsLoading, error: toiletsError, mutate } = useNearbyToilets(mapBounds, filter);

  // Compute distances relative to user geolocation coords
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
    <div className="min-h-screen bg-surface-bg dark:bg-dark-bg text-text-primary dark:text-text-inverse flex flex-col relative overflow-x-hidden">
      
      {/* 1. Header Bar (Section 4) */}
      <header className="h-[56px] sticky top-0 z-50 bg-surface-card dark:bg-dark-card border-b border-surface-border dark:border-dark-border px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-brand-green font-bold text-xl tracking-tight">ST</span>
          <span className="text-xs font-semibold text-text-secondary bg-brand-greenLight text-brand-green dark:bg-brand-green/20 px-1.5 py-0.5 rounded-md uppercase">
            Kerala
          </span>
        </div>

        <div className="flex items-center gap-2 min-h-[36px]">
          {authLoading ? (
            <div className="w-16 h-8 rounded-full bg-surface-muted dark:bg-dark-muted animate-pulse" />
          ) : isAuthenticated ? (
            <Button variant="ghost" className="h-9 px-3 text-xs" onClick={logout}>
              Logout
            </Button>
          ) : (
            <Button variant="ghost" className="h-9 px-3 text-xs" onClick={loginWithGoogle}>
              Login
            </Button>
          )}
          <Link href="/add">
            <Button className="h-9 px-4 bg-brand-green text-text-inverse text-xs rounded-full font-semibold">
              Add Toilet
            </Button>
          </Link>
        </div>
      </header>

      {/* 2. Geolocation Access Denied Banner (Section 8f) */}
      {geoError && (
        <div className="mx-4 my-3 bg-brand-yellowLight text-text-primary border border-brand-yellow/30 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-start gap-2.5">
            <span className="text-xl">📍</span>
            <div className="flex flex-col">
              <span className="text-sm font-bold">
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
                <Button className="h-10 px-4 bg-brand-yellow text-text-inverse text-xs rounded-xl font-bold active:scale-95">
                  Open Settings to Enable
                </Button>
              </a>
            ) : (
              <Button
                onClick={getPosition}
                className="h-10 px-4 bg-brand-yellow text-text-inverse text-xs rounded-xl font-bold active:scale-95"
              >
                Retry GPS
              </Button>
            )}
            <Button
              onClick={() => setGeoState((prev) => ({ ...prev, error: null }))}
              className="h-10 px-4 bg-surface-muted text-text-secondary border border-surface-border text-xs rounded-xl font-bold active:scale-95 dark:bg-dark-muted dark:border-dark-border"
            >
              Browse All Toilets in Kerala
            </Button>
          </div>
        </div>
      )}

      {/* Main content grid */}
      <main className="flex-1 flex flex-col sm:flex-row">
        
        {/* Map Container (Section 4) */}
        <section 
          className={`w-full sm:w-1/2 flex-shrink-0 ${
            mobileView === "list" ? "hidden sm:block" : "block"
          }`}
        >
          <div className="h-[55vh] min-h-[300px] w-full rounded-b-2xl overflow-hidden border-b border-surface-border dark:border-dark-border relative">
            <MapView
              toilets={toilets}
              selectedToilet={selectedToilet}
              onSelectToilet={(toilet) => {
                setSelectedToilet(toilet);
                setMobileView("list"); // Auto shift on selection to card
              }}
              userCoords={userCoords}
              isAddingMode={false}
              onBoundsChange={(bounds) => setMapBounds(bounds)}
            />
            {geoLoading && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-surface-card/90 dark:bg-dark-card/90 px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow-md border border-surface-border dark:border-dark-border animate-pulse">
                <div className="w-2.5 h-2.5 bg-brand-sky rounded-full animate-ping" />
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Locating Device...</span>
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
          {/* 3. Filter Bar */}
          <FilterPills activeFilter={filter} onChange={setFilter} />

          {/* 4. List Header */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-surface-border dark:border-dark-border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text-secondary">
                {toiletsLoading ? "Scanning..." : `${sortedToilets.length} toilets nearby`}
              </span>
              <button
                onClick={() => mutate()}
                disabled={toiletsLoading}
                className="p-1 rounded-lg text-text-secondary hover:text-text-primary dark:hover:text-text-inverse hover:bg-surface-muted dark:hover:bg-dark-muted active:scale-90 transition disabled:opacity-50"
                title="Refresh listings"
              >
                <svg className={`w-4 h-4 ${toiletsLoading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3" />
                </svg>
              </button>
            </div>
            
            {/* List/Map toggle (Section 4) */}
            <div className="flex bg-surface-muted dark:bg-dark-muted p-0.5 rounded-lg border border-surface-border dark:border-dark-border">
              <button 
                onClick={() => setMobileView("map")} 
                className={`px-3 py-1 text-xs font-bold rounded-md min-w-[44px] transition ${
                  mobileView === "map" ? "bg-brand-green text-text-inverse shadow-sm" : "text-text-secondary hover:text-text-primary dark:hover:text-text-inverse"
                }`}
              >
                Map
              </button>
              <button 
                onClick={() => setMobileView("list")} 
                className={`px-3 py-1 text-xs font-bold rounded-md min-w-[44px] transition ${
                  mobileView === "list" ? "bg-brand-green text-text-inverse shadow-sm" : "text-text-secondary hover:text-text-primary dark:hover:text-text-inverse"
                }`}
              >
                List
              </button>
              <button 
                onClick={() => setMobileView("both")} 
                className={`hidden sm:block px-3 py-1 text-xs font-bold rounded-md min-w-[44px] transition ${
                  mobileView === "both" ? "bg-brand-green text-text-inverse shadow-sm" : "text-text-secondary hover:text-text-primary dark:hover:text-text-inverse"
                }`}
              >
                Both
              </button>
            </div>
          </div>

          {/* 5. Toilet list items container */}
          <div 
            className="overflow-y-auto page-scroll p-4 space-y-3 pb-[env(safe-area-inset-bottom)] no-scrollbar"
            style={{ height: "calc(100dvh - 56px - 55vh - 44px)" }}
          >
            {toiletsError ? (
              <div className="py-6 px-4 bg-brand-redLight text-brand-red rounded-xl text-xs font-semibold flex flex-col gap-2 items-center text-center">
                <span>Couldn&apos;t load data. Check your connection.</span>
                <Button onClick={() => mutate()} variant="outline" className="h-8 px-4 text-[10px]">
                  Retry
                </Button>
              </div>
            ) : toiletsLoading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : sortedToilets.length === 0 ? (
              /* Empty State (Section 4) */
              <div className="py-12 flex flex-col items-center text-center max-w-xs mx-auto animate-fade-in">
                <svg className="w-16 h-16 text-text-disabled dark:text-text-secondary mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h4 className="text-base font-bold text-text-primary dark:text-text-inverse">No toilets mapped here yet</h4>
                <p className="text-xs text-text-secondary mt-1">Be the first to help your community by registering a restroom.</p>
                <Link href="/add" className="w-full mt-6">
                  <Button variant="primary" fullWidth className="rounded-xl">
                    Add a Toilet
                  </Button>
                </Link>
              </div>
            ) : (
              sortedToilets.map((toilet) => (
                <ToiletCard
                  key={toilet.id}
                  toilet={toilet}
                  distance={userCoords ? calculateDistance(userCoords.latitude, userCoords.longitude, toilet.latitude, toilet.longitude) : null}
                />
              ))
            )}
          </div>
        </section>

      </main>

      {/* Geolocation Permission Onboarding Modal (Section 2a) */}
      {showLocationPrompt && (
        <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-card dark:bg-dark-card w-full max-w-sm rounded-2xl p-6 border border-surface-border dark:border-dark-border shadow-2xl flex flex-col gap-4 text-center animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-brand-green/10 text-brand-green flex items-center justify-center text-xl mx-auto">
              📍
            </div>
            <h3 className="font-bold text-text-primary dark:text-text-inverse text-lg">Location Access</h3>
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

    </div>
  );
}
