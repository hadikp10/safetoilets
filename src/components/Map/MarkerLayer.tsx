import L from "leaflet";

export function createMarkerIcon(color: "green" | "yellow" | "red") {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:${color === "green" ? "#16A34A" : color === "yellow" ? "#D97706" : "#DC2626"};
      border:2px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}
