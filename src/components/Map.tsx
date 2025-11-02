import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix ícones Leaflet
const initLeaflet = () => {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
};

// Criar ícones customizados
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

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

const Map = ({ center, zones, onZoneClick }: MapProps) => {
  useEffect(() => {
    initLeaflet();
  }, []);

  return (
    <MapContainer center={center} zoom={13} style={{ width: "100%", height: "600px" }} className="rounded-lg shadow-lg z-0">
      <ChangeView center={center} />
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="&copy; Esri" />
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" opacity={0.5} />
      {zones.map((zone) => (
        <Marker key={zone.id} position={[zone.coordinates.lat, zone.coordinates.lon]} icon={createIcon(zone.score, zone.id)} eventHandlers={{ click: () => onZoneClick?.(zone) }}>
          <Popup>
            <div className="text-center">
              <p className="font-bold">Zona {zone.id}</p>
              <p className="text-sm">{zone.level}</p>
              <p className="text-xs">Score: {zone.score}/100</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default Map;
