import L from "leaflet";

export function createMarkerIcon(color: "green" | "yellow" | "red") {
  return L.divIcon({
    className: `w-3.5 h-3.5 rounded-full border-2 border-white shadow bg-brand-${color === "green" ? "green" : color === "yellow" ? "yellow" : "coral"}`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}
