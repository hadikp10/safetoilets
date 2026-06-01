import L from "leaflet";

export function createMarkerIcon(color: "green" | "yellow" | "red") {
  const bgClass = color === "green" ? "bg-brand-green" : color === "yellow" ? "bg-brand-greenLight" : "bg-text-secondary";
  return L.divIcon({
    className: `w-3.5 h-3.5 rounded-full border-2 border-white shadow ${bgClass}`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}
