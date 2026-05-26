import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Restroom } from "@/types";
import { KERALA_CENTER } from "@/hooks/useGeolocation";

interface MapContainerProps {
  restrooms: Restroom[];
  selectedRestroom: Restroom | null;
  onSelectRestroom: (restroom: Restroom) => void;
  userCoords: { latitude: number; longitude: number } | null;
  isAddingMode: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
  centerOverride?: { latitude: number; longitude: number } | null;
}

export default function MapContainer({
  restrooms,
  selectedRestroom,
  onSelectRestroom,
  userCoords,
  isAddingMode,
  onLocationSelect,
  centerOverride,
}: MapContainerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const userMarkerRef = useRef<L.Marker | null>(null);
  const additionMarkerRef = useRef<L.Marker | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Track system theme changes for map tiles
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(isDark ? "dark" : "light");
      
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => setTheme(e.matches ? "dark" : "light");
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, []);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Use user location, selected restroom, center override, or Kerala center as default starting point
    const initialLat = selectedRestroom?.latitude 
      || centerOverride?.latitude
      || userCoords?.latitude 
      || KERALA_CENTER.latitude;
    const initialLng = selectedRestroom?.longitude 
      || centerOverride?.longitude
      || userCoords?.longitude 
      || KERALA_CENTER.longitude;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([initialLat, initialLng], selectedRestroom ? 16 : centerOverride ? 8 : 14);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Effect to watch centerOverride changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !centerOverride || isAddingMode) return;

    map.setView([centerOverride.latitude, centerOverride.longitude], 8, {
      animate: true,
      duration: 0.5,
    });
  }, [centerOverride, isAddingMode]);

  // 2. Update Map Tile Layer based on theme (Light vs Dark)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing tile layers
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    // Minimalistic modern theme tiles (CartoDB Positron/Dark Matter are clean and minimalist)
    const tileUrl = theme === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    const attribution = "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OSM</a> contributors &copy; <a href=\"https://carto.com/attributions\">CARTO</a>";

    L.tileLayer(tileUrl, { attribution, maxZoom: 19 }).addTo(map);
  }, [theme]);

  // 3. Render Restroom Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || isAddingMode) return;

    // Clear old markers
    Object.values(markersRef.current).forEach((marker) => map.removeLayer(marker));
    markersRef.current = {};

    restrooms.forEach((restroom) => {
      if (restroom.is_hidden) return;

      const score = restroom.overall_score;
      // Green = Clean (>= 4.0), Yellow = Average (>= 2.5), Red = Poor (< 2.5)
      let colorClass = "bg-brand-green border-brand-green text-white";
      if (score > 0 && score < 2.5) {
        colorClass = "bg-rose-500 border-rose-500 text-white";
      } else if (score >= 2.5 && score < 4.0) {
        colorClass = "bg-amber-500 border-amber-500 text-white";
      } else if (score === 0) {
        colorClass = "bg-stone-500 border-stone-500 text-white"; // Unverified / New
      }

      // Modern information-rich pill marker
      const scoreStr = score > 0 ? Number(score).toFixed(1) : "New";
      const customIcon = L.divIcon({
        className: "custom-leaflet-icon-pill",
        html: `
          <div class="marker-pill-container flex flex-col items-center group transition-transform duration-150 ease-out hover:scale-105 active:scale-95" style="transform-origin: bottom center;">
            <div class="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-marker border ${colorClass}">
              <span>🚽</span>
              <span>${scoreStr}</span>
            </div>
            <div class="w-1.5 h-1.5 -mt-0.5 rotate-45 border-r border-b ${colorClass}"></div>
          </div>
        `,
        iconSize: [54, 26],
        iconAnchor: [27, 26],
      });

      const marker = L.marker([restroom.latitude, restroom.longitude], { icon: customIcon })
        .addTo(map)
        .on("click", () => {
          onSelectRestroom(restroom);
        });

      markersRef.current[restroom.id] = marker;
    });
  }, [restrooms, isAddingMode]);

  // 4. Center Map on Selected Restroom
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedRestroom || isAddingMode) return;

    map.setView([selectedRestroom.latitude, selectedRestroom.longitude], 16, {
      animate: true,
      duration: 0.5,
    });
  }, [selectedRestroom, isAddingMode]);

  // 4.5. Scale selected marker
  useEffect(() => {
    // Reset all markers
    Object.keys(markersRef.current).forEach((id) => {
      const marker = markersRef.current[id];
      const el = marker.getElement();
      if (el) {
        const container = el.querySelector(".marker-pill-container") as HTMLElement;
        if (container) {
          container.style.transform = "scale(1)";
        }
      }
    });

    // Scale active marker
    if (selectedRestroom) {
      const selectedMarker = markersRef.current[selectedRestroom.id];
      if (selectedMarker) {
        const el = selectedMarker.getElement();
        if (el) {
          const container = el.querySelector(".marker-pill-container") as HTMLElement;
          if (container) {
            container.style.transform = "scale(1.4)";
          }
        }
      }
    }
  }, [selectedRestroom, restrooms]);

  // 5. Render User Location Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userCoords) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userCoords.latitude, userCoords.longitude]);
    } else {
      const userIcon = L.divIcon({
        className: "user-location-icon",
        html: `
          <div class="relative flex items-center justify-center w-8 h-8">
            <div class="absolute w-6 h-6 bg-blue-500/30 rounded-full location-ring"></div>
            <div class="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg"></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      userMarkerRef.current = L.marker([userCoords.latitude, userCoords.longitude], { icon: userIcon })
        .addTo(map);
    }
  }, [userCoords]);

  // 6. Handle "Adding Mode" - Drop Pin
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (isAddingMode) {
      // Clear toilet markers from map temporarily to prevent clutter
      Object.values(markersRef.current).forEach((marker) => map.removeLayer(marker));

      const pinLat = userCoords?.latitude || KERALA_CENTER.latitude;
      const pinLng = userCoords?.longitude || KERALA_CENTER.longitude;

      map.setView([pinLat, pinLng], 16);

      const dragIcon = L.divIcon({
        className: "addition-draggable-pin",
        html: `
          <div class="flex flex-col items-center">
            <div class="bg-black text-white px-2 py-1 text-[10px] font-bold rounded shadow-lg whitespace-nowrap mb-1">DRAG ME</div>
            <div class="w-8 h-8 bg-black rounded-full border-4 border-white shadow-xl flex items-center justify-center">
              <div class="w-2.5 h-2.5 bg-white rounded-full"></div>
            </div>
          </div>
        `,
        iconSize: [80, 60],
        iconAnchor: [40, 60],
      });

      if (additionMarkerRef.current) {
        map.removeLayer(additionMarkerRef.current);
      }

      const additionMarker = L.marker([pinLat, pinLng], {
        icon: dragIcon,
        draggable: true,
      }).addTo(map);

      additionMarkerRef.current = additionMarker;

      if (onLocationSelect) {
        onLocationSelect(pinLat, pinLng);
      }

      additionMarker.on("dragend", () => {
        const position = additionMarker.getLatLng();
        if (onLocationSelect) {
          onLocationSelect(position.lat, position.lng);
        }
      });

      // Also let users tap map to reposition the pin
      map.on("click", (e: L.LeafletMouseEvent) => {
        additionMarker.setLatLng(e.latlng);
        if (onLocationSelect) {
          onLocationSelect(e.latlng.lat, e.latlng.lng);
        }
      });
    } else {
      // Clean up addition pin
      if (additionMarkerRef.current) {
        map.removeLayer(additionMarkerRef.current);
        additionMarkerRef.current = null;
      }
      map.off("click");
    }
  }, [isAddingMode]);

  return (
    <div className="relative w-full h-full bg-stone-100 dark:bg-stone-900 rounded-b-3xl overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full z-10 rounded-b-3xl overflow-hidden" />
    </div>
  );
}
