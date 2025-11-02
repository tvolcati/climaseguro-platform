import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix do ícone padrão do Leaflet
const fixLeafletIcons = () => {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
};

// Criar ícones customizados por nível de risco
const createCustomIcon = (score: number, zoneId: number) => {
  let bgColor = "bg-green-500";
  let textColor = "text-white";

  if (score >= 70) {
    bgColor = "bg-red-500";
  } else if (score >= 50) {
    bgColor = "bg-orange-500";
  } else if (score >= 30) {
    bgColor = "bg-yellow-500";
    textColor = "text-gray-900";
  }

  return L.divIcon({
    html: `<div class="flex items-center justify-center w-10 h-10 rounded-full ${bgColor} ${textColor} font-bold shadow-lg border-2 border-white">${zoneId}</div>`,
    className: "custom-marker",
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

// Componente para atualizar o centro do mapa quando mudar
function ChangeMapView({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  
  return null;
}

const Map = ({ center, zones, onZoneClick }: MapProps) => {
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    fixLeafletIcons();
    setMapReady(true);
  }, []);

  if (!mapReady) {
    return (
      <div className="flex items-center justify-center" style={{ width: "100%", height: "600px" }}>
        <div className="text-center">
          <div className="text-4xl mb-2">🗺️</div>
          <p className="text-muted-foreground">Carregando mapa...</p>
        </div>
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ width: "100%", height: "600px" }}
      className="rounded-lg shadow-lg z-0"
    >
      <ChangeMapView center={center} />
      
      {/* Camada de satélite (Esri) */}
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution="&copy; Esri"
      />

      {/* Camada de ruas (overlay transparente) */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        opacity={0.5}
      />

      {/* Markers de risco */}
      {zones.map((zone) => (
        <Marker
          key={zone.id}
          position={[zone.coordinates.lat, zone.coordinates.lon]}
          icon={createCustomIcon(zone.score, zone.id)}
          eventHandlers={{
            click: () => onZoneClick?.(zone),
          }}
        >
          <Popup>
            <div className="text-center">
              <p className="font-bold text-base">Zona {zone.id}</p>
              <p className="text-sm font-medium text-gray-700">{zone.level}</p>
              <p className="text-xs text-gray-600">Score: {zone.score}/100</p>
              {zone.total_imoveis && (
                <p className="text-xs text-gray-600 mt-1">
                  {zone.total_imoveis} imóveis
                </p>
              )}
              {zone.populacao_estimada && (
                <p className="text-xs text-gray-600">
                  ~{zone.populacao_estimada} pessoas
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default Map;
