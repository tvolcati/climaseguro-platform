import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Tipos
interface RiskZone {
  id: number;
  coordinates: { lat: number; lon: number };
  score: number;
  level: string;
  total_imoveis?: number;
  populacao_estimada?: number;
}

interface MapProps {
  center: [number, number];
  zones: RiskZone[];
  onZoneClick?: (zone: RiskZone) => void;
}

// Ícones do Leaflet
const initLeafletIcons = () => {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
};

const createIcon = (score: number, id: number) => {
  const color = score >= 70 ? "#ef4444" : score >= 50 ? "#f97316" : score >= 30 ? "#eab308" : "#22c55e";
  const textColor = score >= 30 && score < 50 ? "#1f2937" : "#ffffff";

  return L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;background:${color};color:${textColor};border-radius:50%;font-weight:bold;box-shadow:0 4px 6px rgba(0,0,0,0.2);border:2px solid white;">${id}</div>`,
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });
};

const Map: React.FC<MapProps> = ({ center, zones, onZoneClick }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Inicialização do mapa
  useEffect(() => {
    if (!containerRef.current) return;

    initLeafletIcons();

    // Criar mapa
    const map = L.map(containerRef.current, {
      center,
      zoom: 13,
      preferCanvas: true,
    });
    mapRef.current = map;

    // Camada Satélite
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "&copy; Esri" },
    ).addTo(map);

    // Overlay Ruas (OSM)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      opacity: 0.5,
    }).addTo(map);

    // Grupo de marcadores
    markersLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Atualizar centro
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, 13, { animate: true });
    }
  }, [center]);

  // Renderizar marcadores quando "zones" mudar
  useEffect(() => {
    if (!markersLayerRef.current) return;
    const layer = markersLayerRef.current;
    layer.clearLayers();

    zones.forEach((zone) => {
      const marker = L.marker([zone.coordinates.lat, zone.coordinates.lon], {
        icon: createIcon(zone.score, zone.id),
      });

      const popupHtml = `
        <div style="text-align:center">
          <p style="font-weight:700">Zona ${zone.id}</p>
          <p style="font-size:12px">${zone.level}</p>
          <p style="font-size:11px;color:#6b7280">Score: ${zone.score}/100</p>
        </div>
      `;
      marker.bindPopup(popupHtml);

      marker.on("click", () => onZoneClick?.(zone));
      marker.addTo(layer);
    });
  }, [zones, onZoneClick]);

  return (
    <div className="rounded-lg shadow-lg z-0" style={{ width: "100%", height: "600px" }}>
      <div ref={containerRef} className="w-full h-full rounded-lg" />
    </div>
  );
};

export default Map;
