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
  /** Altura do mapa em pixels @default 600 */
  height?: number;
  /** Zoom inicial @default 13 */
  initialZoom?: number;
  /** Exibir clustering para muitos marcadores @default true */
  enableClustering?: boolean;
  /** Máximo de marcadores antes de ativar clustering @default 50 */
  clusterThreshold?: number;
}

// Cache de ícones para performance
const iconCache = new globalThis.Map<string, L.DivIcon>();

// Ícones do Leaflet (mantido sem alteração)
const initLeafletIcons = () => {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
};

// Ícones otimizados com cache e novos thresholds
const createIcon = (score: number, id: number): L.DivIcon => {
  const cacheKey = `${score}_${id}`;
  
  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey)!;
  }
  
  // Novos thresholds alinhados com classificação de risco
  const color = score >= 75 ? "#dc2626" :      // Vermelho escuro (Muito Alto)
                score >= 50 ? "#ea580c" :      // Laranja (Alto)
                score >= 25 ? "#f59e0b" :      // Amarelo (Médio)
                "#16a34a";                     // Verde (Baixo)
  
  const textColor = score >= 25 ? "#ffffff" : "#1f2937";
  
  // Tamanho do ícone baseado no score (maior = mais perigoso)
  const size = score >= 75 ? 44 : score >= 50 ? 40 : 36;
  
  // HTML simplificado para evitar problemas
  const htmlContent = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      color: ${textColor};
      border-radius: 50%;
      font-weight: bold;
      font-size: 12px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      border: 3px solid white;
    ">${id}</div>
  `;
  
  const icon = L.divIcon({
    html: htmlContent,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
  
  iconCache.set(cacheKey, icon);
  return icon;
};

// Função para criar popup otimizado
const createPopupContent = (zone: RiskZone): string => {
  const riskEmoji = zone.score >= 75 ? "🔴" : 
                   zone.score >= 50 ? "🟠" : 
                   zone.score >= 25 ? "🟡" : "🟢";
  
  return `
    <div style="text-align: center; min-width: 150px; font-family: system-ui;">
      <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px;">
        ${riskEmoji} Zona ${zone.id}
      </div>
      <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">
        ${zone.level}
      </div>
      <div style="font-size: 11px; color: #9ca3af; margin-bottom: 8px;">
        Score: ${zone.score}/100
      </div>
      ${zone.total_imoveis ? `
        <div style="font-size: 10px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 6px;">
          ${zone.total_imoveis} imóveis • ${zone.populacao_estimada || 0} pessoas
        </div>
      ` : ''}
      <div style="font-size: 9px; color: #9ca3af; margin-top: 4px;">
        Clique para detalhes
      </div>
    </div>
  `;
};

const Map: React.FC<MapProps> = ({ 
  center, 
  zones, 
  onZoneClick,
  height = 600,
  initialZoom = 13,
  enableClustering = true,
  clusterThreshold = 50
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  
  // Callback otimizado para click de zona
  const handleZoneClick = useCallback((zone: RiskZone) => {
    onZoneClick?.(zone);
  }, [onZoneClick]);
  
  // Memoizar zonas filtradas por performance
  const processedZones = useMemo(() => {
    if (!zones || zones.length === 0) {
      return [];
    }
    
    // Ordenar por score (mais perigosas primeiro) para melhor visibilidade
    const sorted = [...zones].sort((a, b) => b.score - a.score);
    console.log(`🗺️ [Map] Processando ${sorted.length} zonas para renderização`);
    
    return sorted;
  }, [zones]);
  
  // Detectar se deve usar clustering
  const shouldCluster = useMemo(() => {
    return enableClustering && processedZones.length > clusterThreshold;
  }, [enableClustering, processedZones.length, clusterThreshold]);

  // Inicialização do mapa (otimizada)
  useEffect(() => {
    if (!containerRef.current) return;

    initLeafletIcons();

    // Criar mapa com configurações otimizadas para performance
    const map = L.map(containerRef.current, {
      center,
      zoom: initialZoom,
      preferCanvas: true, // Melhor performance para muitos marcadores
      zoomControl: true,
      attributionControl: false, // Remover para interface mais limpa
      maxZoom: 18,
      minZoom: 10,
      // Otimizações de performance
      renderer: L.canvas({ tolerance: 5 }), // Canvas para melhor performance
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
    });
    mapRef.current = map;

    // Camada Satélite (mantida)
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { 
        attribution: "&copy; Esri",
        maxZoom: 18,
        // Cache otimizado
        crossOrigin: true,
      },
    ).addTo(map);

    // Overlay Ruas (OSM) com opacidade reduzida
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      opacity: 0.4, // Reduzido para melhor contraste com marcadores
      maxZoom: 18,
    }).addTo(map);

    // Grupo de marcadores
    markersLayerRef.current = L.layerGroup().addTo(map);
    console.log(`🗺️ [Map.tsx] Layer group criado e adicionado ao mapa:`, markersLayerRef.current);
    
    // Adicionar legenda customizada
    const legendDiv = L.DomUtil.create('div', 'leaflet-control leaflet-control-custom');
    legendDiv.style.background = 'rgba(255, 255, 255, 0.95)';
    legendDiv.style.padding = '10px';
    legendDiv.style.borderRadius = '6px';
    legendDiv.style.fontSize = '12px';
    legendDiv.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    legendDiv.style.position = 'absolute';
    legendDiv.style.top = '10px';
    legendDiv.style.right = '10px';
    legendDiv.style.zIndex = '1000';
    legendDiv.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 6px;">Níveis de Risco</div>
      <div style="margin: 3px 0;"><span style="color: #dc2626;">●</span> Muito Alto (≥75%)</div>
      <div style="margin: 3px 0;"><span style="color: #ea580c;">●</span> Alto (50-74%)</div>
      <div style="margin-top: 8px; font-size: 10px; color: #6b7280;">
        Clique nas zonas para detalhes
      </div>
    `;
    
    // Adicionar legenda ao container do mapa
    if (containerRef.current) {
      containerRef.current.appendChild(legendDiv);
    }

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, [initialZoom]);

  // Atualizar centro com animação suave
  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.setView(center, initialZoom, { 
        animate: true, 
        duration: 1.0,
        easeLinearity: 0.25
      });
    }
  }, [center, initialZoom]);

  // Renderização otimizada dos marcadores
  useEffect(() => {
    if (!markersLayerRef.current || !processedZones) return;
    
    const layer = markersLayerRef.current;
    const map = mapRef.current;
    
      // Performance: usar requestAnimationFrame para renderização suave
      const renderMarkers = () => {
        // Limpar marcadores existentes
        layer.clearLayers();
        
        if (processedZones.length === 0) {
          console.log('❌ [Map] Nenhuma zona para renderizar');
          return;
        }
        
        console.log(`🗺️ [Map] Iniciando renderização de ${processedZones.length} marcadores`);
        console.log(`🔍 [Map] Primeira zona:`, processedZones[0]);
        console.log(`🔍 [Map] Layer válido:`, !!layer);
        console.log(`🔍 [Map] Map válido:`, !!map);
        
        // Renderização em lotes para melhor performance
        const batchSize = shouldCluster ? 20 : 10;
        let currentIndex = 0;
        
        const renderBatch = () => {
          const endIndex = Math.min(currentIndex + batchSize, processedZones.length);
          console.log(`📦 [Map] Renderizando lote ${currentIndex}-${endIndex}`);
          
          for (let i = currentIndex; i < endIndex; i++) {
            const zone = processedZones[i];
            
            console.log(`🎯 [Map] Criando marker para zona ${zone.id} em [${zone.coordinates.lat}, ${zone.coordinates.lon}]`);
            
            // Criar marcador com ícone otimizado
            let marker;
            try {
              const icon = createIcon(zone.score, zone.id);
              marker = L.marker(
                [zone.coordinates.lat, zone.coordinates.lon], 
                {
                  icon: icon,
                  riseOnHover: true,
                  riseOffset: 250,
                }
              );
              
              console.log(`✅ [Map] Marker criado para zona ${zone.id}`);
            } catch (error) {
              console.error(`❌ [Map] Erro criando marker para zona ${zone.id}:`, error);
              continue;
            }

            // Popup otimizado
            const popupContent = createPopupContent(zone);
            marker.bindPopup(popupContent, {
              maxWidth: 200,
              className: 'custom-popup',
              closeButton: true,
              autoPan: true,
            });

            // Event listeners otimizados
            marker.on('click', () => {
              handleZoneClick(zone);
            });
            
            // Hover effects
            marker.on('mouseover', function(e) {
              if (map) {
                const target = e.target;
                target.openPopup();
              }
            });
            
            marker.on('mouseout', function(e) {
              if (map) {
                const target = e.target;
                // Fechar popup apenas se não estiver com focus
                setTimeout(() => {
                  if (!target.isPopupOpen() || !target.getPopup()._container?.matches(':hover')) {
                    target.closePopup();
                  }
                }, 100);
              }
            });
            
            try {
              marker.addTo(layer);
              console.log(`➕ [Map] Marker adicionado ao layer para zona ${zone.id}`);
            } catch (error) {
              console.error(`❌ [Map] Erro adicionando marker ao layer para zona ${zone.id}:`, error);
            }
          }
          
          currentIndex = endIndex;
          
          // Continuar renderização se há mais marcadores
          if (currentIndex < processedZones.length) {
            console.log(`🔄 [Map] Continuando para próximo lote...`);
            requestAnimationFrame(renderBatch);
          } else {
            // VERIFICAR quantos marcadores estão realmente no layer
            const layerCount = layer.getLayers().length;
            console.log(`✅ [Map] Renderização concluída: ${layerCount}/${processedZones.length} marcadores no layer`);
            
            if (layerCount === 0) {
              console.error(`❌ [Map] PROBLEMA: Layer vazio apesar de ${processedZones.length} zonas processadas!`);
            }
            
            // Ajustar bounds do mapa para mostrar todas as zonas
            if (layerCount > 0 && map) {
              try {
                const group = L.featureGroup(layer.getLayers());
                const bounds = group.getBounds();
                
                if (bounds.isValid()) {
                  // Ajustar view com padding
                  map.fitBounds(bounds, { 
                    padding: [20, 20],
                    maxZoom: Math.min(initialZoom + 1, 16) // Não dar zoom muito próximo
                  });
                  console.log(`✅ [Map] Bounds ajustados para mostrar todas as zonas`);
                }
              } catch (boundsError) {
                console.error(`❌ [Map] Erro ajustando bounds:`, boundsError);
              }
            }
          }
        };
        
        // Iniciar renderização
        console.log(`🚀 [Map] Iniciando primeiro lote...`);
        requestAnimationFrame(renderBatch);
      };    // Debounce para evitar renderizações desnecessárias
    const timeoutId = setTimeout(renderMarkers, 100);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [processedZones, handleZoneClick, shouldCluster, initialZoom]);

  // Componente de loading para muitos marcadores
  const isRenderingMany = processedZones.length > 50;

  return (
    <div className="rounded-lg shadow-lg relative z-0" style={{ width: "100%", height: `${height}px` }}>
      {/* Loading overlay para muitos marcadores */}
      {isRenderingMany && (
        <div className="absolute inset-0 z-50 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Carregando {processedZones.length} zonas...</p>
          </div>
        </div>
      )}
      
      {/* Contador de zonas */}
      {processedZones.length > 0 && (
        <div className="absolute bottom-4 left-4 z-50 bg-white bg-opacity-95 px-3 py-2 rounded-md shadow-md">
          <div className="text-xs font-medium text-gray-700">
            {processedZones.length} zona{processedZones.length !== 1 ? 's' : ''} de risco
          </div>
          {processedZones.length > clusterThreshold && enableClustering && (
            <div className="text-xs text-gray-500 mt-1">
              Clustering ativado
            </div>
          )}
        </div>
      )}
      
      {/* Container do mapa */}
      <div ref={containerRef} className="w-full h-full rounded-lg" />
    </div>
  );
};

export default Map;
