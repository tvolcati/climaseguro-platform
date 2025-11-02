import React, { useEffect, useRef, useMemo, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./Map.css";

// Tipos otimizados
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
  height?: number;
  initialZoom?: number;
}

// Cache de ícones para performance
const iconCache = new globalThis.Map<string, L.DivIcon>();

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

// Criar ícone simplificado
const createIcon = (score: number, id: number): L.DivIcon => {
  const cacheKey = `${score}_${id}`;
  
  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey)!;
  }
  
  const color = score >= 75 ? "#dc2626" : score >= 50 ? "#ea580c" : score >= 25 ? "#f59e0b" : "#16a34a";
  const size = score >= 75 ? 44 : score >= 50 ? 40 : 36;
  
  const icon = L.divIcon({
    html: `<div style="
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      color: white;
      border-radius: 50%;
      font-weight: bold;
      font-size: 12px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      border: 3px solid white;
    ">${id}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
  
  iconCache.set(cacheKey, icon);
  return icon;
};

const Map: React.FC<MapProps> = ({ 
  center, 
  zones, 
  onZoneClick,
  height = 600,
  initialZoom = 13
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  
  const handleZoneClick = useCallback((zone: RiskZone) => {
    onZoneClick?.(zone);
  }, [onZoneClick]);
  
  // Inicialização do mapa
  useEffect(() => {
    if (!containerRef.current) return;

    initLeafletIcons();

    const map = L.map(containerRef.current, {
      center,
      zoom: initialZoom,
      zoomControl: true,
      attributionControl: false,
    });
    mapRef.current = map;

    // Camada Satélite
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "&copy; Esri" }
    ).addTo(map);

    // Overlay Ruas
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      opacity: 0.4,
    }).addTo(map);

    // Grupo de marcadores
    markersLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, [initialZoom]);

  // Atualizar centro APENAS quando realmente mudar
  useEffect(() => {
    if (mapRef.current && center) {
      const map = mapRef.current;
      const currentCenter = map.getCenter();
      
      // Só mover se a distância for significativa (> 1km aprox)
      const distance = currentCenter.distanceTo(L.latLng(center));
      if (distance > 1000) {
        map.setView(center, initialZoom);
      }
    }
  }, [center[0], center[1], initialZoom]);

  // RENDERIZAÇÃO CONTROLADA DOS MARCADORES
  useEffect(() => {
    if (!markersLayerRef.current || !zones || zones.length === 0) return;
    
    const layer = markersLayerRef.current;
    const map = mapRef.current;
    
    // IMPORTANTE: Só limpar se realmente mudaram as zonas
    const currentCount = layer.getLayers().length;
    if (currentCount === zones.length) {
      // Não re-renderizar se já tem o mesmo número de marcadores
      return;
    }
    
    // Limpar marcadores existentes
    layer.clearLayers();
    
    // Adicionar cada marcador diretamente
    zones.forEach((zone) => {
      try {
        // Criar marcador
        const marker = L.marker([zone.coordinates.lat, zone.coordinates.lon], {
          icon: createIcon(zone.score, zone.id)
        });

        // Popup simples
        marker.bindPopup(`
          <div style="text-align: center; font-family: system-ui;">
            <div style="font-weight: bold; margin-bottom: 4px;">Zona ${zone.id}</div>
            <div style="font-size: 12px;">Score: ${zone.score.toFixed(1)}%</div>
            <div style="font-size: 11px; color: #666;">${zone.level}</div>
          </div>
        `);

        // Click
        marker.on('click', () => handleZoneClick(zone));
        
        // Adicionar ao layer
        marker.addTo(layer);
        
      } catch (error) {
        console.error(`Erro na zona ${zone.id}:`, error);
      }
    });
    
    console.log(`✅ MARCADORES: ${layer.getLayers().length}/${zones.length} adicionados`);
    
  }, [zones?.length, handleZoneClick]); // Só re-renderizar se o NÚMERO de zonas mudar
  
  // Ajustar bounds SEPARADAMENTE, só quando necessário
  useEffect(() => {
    if (!markersLayerRef.current || !mapRef.current) return;
    
    const layer = markersLayerRef.current;
    const map = mapRef.current;
    const layerCount = layer.getLayers().length;
    
    if (layerCount > 0) {
      // Pequeno delay para garantir que marcadores foram renderizados
      setTimeout(() => {
        try {
          const group = L.featureGroup(layer.getLayers());
          const bounds = group.getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
          }
        } catch (error) {
          console.error('Erro ajustando bounds:', error);
        }
      }, 100);
    }
  }, [zones?.length]); // Só quando o número de zonas mudar

  return (
    <div className="rounded-lg shadow-lg relative z-0" style={{ width: "100%", height: `${height}px` }}>
      {/* Contador de zonas */}
      {zones && zones.length > 0 && (
        <div className="absolute bottom-4 left-4 z-50 bg-white bg-opacity-95 px-3 py-2 rounded-md shadow-md">
          <div className="text-xs font-medium text-gray-700">
            {zones.length} zona{zones.length !== 1 ? 's' : ''} de risco
          </div>
        </div>
      )}
      
      {/* Container do mapa */}
      <div ref={containerRef} className="w-full h-full rounded-lg" />
    </div>
  );
};

export default Map;