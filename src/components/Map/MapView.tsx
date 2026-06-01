import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Restroom } from "@/types";

interface MapViewProps {
  toilets: Restroom[];
  selectedToilet: Restroom | null;
  onSelectToilet: (toilet: Restroom) => void;
  userCoords: { latitude: number; longitude: number } | null;
  isAddingMode: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
  onBoundsChange?: (bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) => void;
  interactive?: boolean; // If false, acts as a static mini-map
}

export default function MapView({
  toilets,
  selectedToilet,
  onSelectToilet,
  userCoords,
  isAddingMode,
  onLocationSelect,
  onBoundsChange,
  interactive = true,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: { marker: L.Marker; score: number } }>({});
  const userMarkerRef = useRef<L.Marker | null>(null);
  const additionMarkerRef = useRef<L.Marker | null>(null);
  const lastFlownRef = useRef<{ latitude: number; longitude: number } | null>(null);

  // Fix webpack marker icon issues (Section 3d)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: "/icons/marker-default.png",
      iconRetinaUrl: "/icons/marker-default-2x.png",
      shadowUrl: "/icons/marker-shadow.png",
    });
  }, []);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || map) return;

    const initialLat = selectedToilet?.latitude || userCoords?.latitude || 10.8505;
    const initialLng = selectedToilet?.longitude || userCoords?.longitude || 76.2711;
    const initialZoom = selectedToilet ? 16 : (userCoords ? 15 : 10);

    const mapInstance = L.map(mapContainerRef.current, {
      zoomControl: interactive,
      dragging: interactive,
      touchZoom: interactive,
      doubleClickZoom: interactive,
      scrollWheelZoom: interactive,
      boxZoom: interactive,
      attributionControl: true,
    }).setView([initialLat, initialLng], initialZoom);

    setMap(mapInstance);

    // Send initial bounds back to parent
    if (interactive && onBoundsChange) {
      const bounds = mapInstance.getBounds();
      onBoundsChange({
        minLat: bounds.getSouth(),
        maxLat: bounds.getNorth(),
        minLng: bounds.getWest(),
        maxLng: bounds.getEast(),
      });
    }

    // Attach bounds listeners
    if (interactive && onBoundsChange) {
      const handleMoveEnd = () => {
        const bounds = mapInstance.getBounds();
        onBoundsChange({
          minLat: bounds.getSouth(),
          maxLat: bounds.getNorth(),
          minLng: bounds.getWest(),
          maxLng: bounds.getEast(),
        });
      };
      mapInstance.on("moveend", handleMoveEnd);
    }

    return () => {
      mapInstance.remove();
      setMap(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ResizeObserver to invalidate map size (Section 2g)
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || !map) return;

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });

    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
    };
  }, [map]);

  // Fly to user coordinates whenever a new location is fetched (Section 2d)
  useEffect(() => {
    if (!map || !userCoords) return;
    const isNew = !lastFlownRef.current || 
                  lastFlownRef.current.latitude !== userCoords.latitude || 
                  lastFlownRef.current.longitude !== userCoords.longitude;
    if (isNew) {
      map.flyTo([userCoords.latitude, userCoords.longitude], 15, {
        animate: true,
        duration: 1.5,
      });
      lastFlownRef.current = userCoords;
    }
  }, [map, userCoords]);

  // 2. Tile Layer (Light tiles only to support paper aesthetic)
  useEffect(() => {
    if (!map) return;
 
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    const tileUrl = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
    const attribution = `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>`;

    L.tileLayer(tileUrl, { attribution, maxZoom: 19 }).addTo(map);
  }, [map]);

  // 3. Render Restroom Markers (Only if NOT in adding mode)
  useEffect(() => {
    if (!map) return;

    if (isAddingMode || !interactive) {
      // Clear all restroom markers
      Object.keys(markersRef.current).forEach((id) => {
        map.removeLayer(markersRef.current[id].marker);
        delete markersRef.current[id];
      });

      // If static mini-map, only render the target pin
      if (!interactive && selectedToilet) {
        const color = selectedToilet.overall_score >= 4 ? "green" : selectedToilet.overall_score >= 2.5 ? "yellow" : "red";
        
        const pinIcon = L.divIcon({
          className: `w-3.5 h-3.5 rounded-full border-2 border-white shadow bg-brand-${color === "green" ? "green" : color === "yellow" ? "yellow" : "coral"}`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        const singleMarker = L.marker([selectedToilet.latitude, selectedToilet.longitude], { icon: pinIcon }).addTo(map);
        markersRef.current["single"] = { marker: singleMarker, score: selectedToilet.overall_score };
      }
      return;
    }

    // Clean up single marker if it exists
    if (markersRef.current["single"]) {
      map.removeLayer(markersRef.current["single"].marker);
      delete markersRef.current["single"];
    }

    const currentRestroomIds = new Set(toilets.filter((r) => !r.is_hidden).map((r) => r.id));

    // 1. Remove markers for restrooms that are no longer in search bounds
    Object.keys(markersRef.current).forEach((id) => {
      if (id === "single") return;
      if (!currentRestroomIds.has(id)) {
        map.removeLayer(markersRef.current[id].marker);
        delete markersRef.current[id];
      }
    });

    // 2. Add or update markers for current restrooms
    toilets.forEach((restroom) => {
      if (restroom.is_hidden) return;

      const score = restroom.overall_score;
      const color = score >= 4 ? "green" : score >= 2.5 ? "yellow" : "red";

      const existing = markersRef.current[restroom.id];
      if (existing) {
        if (existing.score === score) {
          return; // Skip recreation if score is identical
        }
        // Score changed, recreate this marker
        map.removeLayer(existing.marker);
      }

      // Div icon marker
      const customIcon = L.divIcon({
        className: `w-3.5 h-3.5 rounded-full border-2 border-white shadow bg-brand-${color === "green" ? "green" : color === "yellow" ? "yellow" : "coral"}`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker([restroom.latitude, restroom.longitude], { icon: customIcon })
        .addTo(map)
        .on("click", () => {
          onSelectToilet(restroom);
        });

      markersRef.current[restroom.id] = { marker, score };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, toilets, isAddingMode, interactive]);

  // 4. Center Selected Toilet
  useEffect(() => {
    if (!map || !selectedToilet || isAddingMode) return;

    map.setView([selectedToilet.latitude, selectedToilet.longitude], 16, {
      animate: true,
      duration: 0.5,
    });
  }, [map, selectedToilet, isAddingMode]);

  // 5. User Pulse Dot Location Marker
  useEffect(() => {
    if (!map || !userCoords) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userCoords.latitude, userCoords.longitude]);
    } else {
      const userIcon = L.divIcon({
        className: "",
        html: `
          <div class="relative w-4 h-4">
            <div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-md z-10 relative"></div>
            <div class="w-4 h-4 bg-blue-400 rounded-full absolute top-0 left-0 animate-location-pulse"></div>
          </div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      userMarkerRef.current = L.marker([userCoords.latitude, userCoords.longitude], { icon: userIcon }).addTo(map);
    }
  }, [map, userCoords]);

  // 6. Dropping pin in Adding Mode
  useEffect(() => {
    if (!map) return;

    if (isAddingMode) {
      const pinLat = userCoords?.latitude || 10.8505;
      const pinLng = userCoords?.longitude || 76.2711;

      map.setView([pinLat, pinLng], 16);

      const dragIcon = L.divIcon({
        className: "",
        html: `
          <div class="flex flex-col items-center select-none" style="transform: translateY(-40px);">
            <div class="bg-neutral-900 text-white px-2 py-0.5 text-[10px] font-medium rounded shadow-sm whitespace-nowrap mb-1 uppercase tracking-wide">DRAG ME</div>
            <div class="w-6 h-6 rounded-full bg-neutral-900 border-2 border-white shadow-lg flex items-center justify-center">
              <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>
          </div>
        `,
        iconSize: [100, 80],
        iconAnchor: [50, 40],
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

      map.on("click", (e: L.LeafletMouseEvent) => {
        additionMarker.setLatLng(e.latlng);
        if (onLocationSelect) {
          onLocationSelect(e.latlng.lat, e.latlng.lng);
        }
      });
    } else {
      if (additionMarkerRef.current) {
        map.removeLayer(additionMarkerRef.current);
        additionMarkerRef.current = null;
      }
      map.off("click");
    }
  }, [map, isAddingMode, userCoords, onLocationSelect]);

  return (
    <div className="w-full h-full relative overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />
    </div>
  );
}
