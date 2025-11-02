import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import logoSvg from "@/assets/clima-seguro-logo.svg";
import Map from "@/components/Map_SIMPLE";
import PrefeituraZoneModal from "@/components/PrefeituraZoneModal";
import { useSimpleRiskCalculation } from "@/hooks";
import { ZoneRiskResult } from "@/types";

// Mock cities
const cities = [
  { code: "4106902", name: "Curitiba", state: "PR", coordinates: { lat: -25.4284, lon: -49.2733 } },
  { code: "3550308", name: "São Paulo", state: "SP", coordinates: { lat: -23.5505, lon: -46.6333 } },
  { code: "3304557", name: "Rio de Janeiro", state: "RJ", coordinates: { lat: -22.9068, lon: -43.1729 } },
];

function mapZoneRiskToMapZone(zoneResult: ZoneRiskResult): any {
  return {
    id: zoneResult.id,
    coordinates: {
      lat: zoneResult.coordinates.lat,
      lon: zoneResult.coordinates.lon
    },
    score: zoneResult.scoreNormalizado,
    level: zoneResult.nivel.replace(/🔴|🟠|🟡|🟢/, '').trim(),
    total_imoveis: Math.floor(Math.random() * 50) + 20,
    populacao_estimada: Math.floor(Math.random() * 150) + 50,
    _originalData: zoneResult
  };
}

const Prefeitura = () => {
  const [selectedCity] = useState<string>("4106902"); // Curitiba fixo
  const [selectedZone, setSelectedZone] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [useMockData, setUseMockData] = useState(false);

  // Buscar dados da cidade selecionada
  const selectedCityData = cities.find(c => c.code === selectedCity);

  // Hook para cálculo de risco
  const riskCalculation = useSimpleRiskCalculation({
    cityCode: selectedCity || "",
    cityUF: selectedCityData?.state || "",
    autoStart: !!selectedCity && !useMockData,
    highRiskOnly: false,
    onComplete: (zones) => {
      console.log(`✅ [Prefeitura] Cálculo concluído: ${zones.length} zonas calculadas`);
    }
  });

  // Função para gerar dados mockados
  const generateMockZones = (): ZoneRiskResult[] => {
    const baseCoords = selectedCityData?.coordinates || { lat: -25.4284, lon: -49.2733 };
    const mockZones: ZoneRiskResult[] = [];
    
    for (let i = 0; i < 100; i++) {
      const latOffset = (Math.random() - 0.5) * 0.1;
      const lonOffset = (Math.random() - 0.5) * 0.1;
      const scoreValue = Math.random();
      const scoreNorm = Math.round(scoreValue * 100);
      
      let nivel = "🟢 Baixo";
      let cor = "#10b981";
      if (scoreNorm >= 75) {
        nivel = "🔴 Muito Alto";
        cor = "#ef4444";
      } else if (scoreNorm >= 50) {
        nivel = "🟠 Moderado";
        cor = "#f97316";
      } else if (scoreNorm >= 25) {
        nivel = "🟡 Médio";
        cor = "#eab308";
      }
      
      mockZones.push({
        id: i + 1,
        coordinates: {
          lat: baseCoords.lat + latOffset,
          lon: baseCoords.lon + lonOffset
        },
        bbox: {
          minLat: baseCoords.lat + latOffset - 0.001,
          maxLat: baseCoords.lat + latOffset + 0.001,
          minLon: baseCoords.lon + lonOffset - 0.001,
          maxLon: baseCoords.lon + lonOffset + 0.001,
          centerLat: baseCoords.lat + latOffset,
          centerLon: baseCoords.lon + lonOffset
        },
        scoreNormalizado: scoreNorm,
        score: scoreValue,
        nivel,
        cor,
        prioridade: scoreNorm >= 75 ? 1 : scoreNorm >= 50 ? 2 : 3,
        fatores: [
          { 
            nome: 'Histórico de Desastres', 
            valor: Math.random() * 0.20, // 0-20% do score
            peso: 0.20,
            descricao: `Fator regional baseado no histórico do estado PR`
          },
          { 
            nome: 'Declividade do Terreno', 
            valor: Math.random() * 0.30, // 0-30% do score
            peso: 0.30,
            descricao: `Terreno com ${(Math.random() * 20).toFixed(1)}% de inclinação`
          },
          { 
            nome: 'Proximidade de Rios', 
            valor: Math.random() * 0.25, // 0-25% do score
            peso: 0.25,
            descricao: `${Math.floor(Math.random() * 5)} rio(s) identificado(s) na zona`
          },
          { 
            nome: 'Densidade Urbana', 
            valor: Math.random() * 0.15, // 0-15% do score
            peso: 0.15,
            descricao: `${Math.floor(Math.random() * 50)} construções e ${Math.floor(Math.random() * 20)} vias mapeadas`
          },
          { 
            nome: 'Cobertura Vegetal', 
            valor: Math.random() * 0.10, // 0-10% do score
            peso: 0.10,
            descricao: `${Math.floor(Math.random() * 10)} área(s) verde(s) - proteção natural`
          }
        ],
        declividade: Math.random() * 30,
        recomendacoes: [
          'Instalar sistema de drenagem pluvial',
          'Monitoramento contínuo de chuvas',
          'Manter áreas verdes preservadas'
        ]
      });
    }
    
    return mockZones;
  };

  const handleSkipLoading = () => {
    console.log('⏭️ [PREFEITURA-SKIP] Botão clicado!');
    console.log('📊 [PREFEITURA-SKIP] Estado atual:', {
      isLoading: riskCalculation.isLoading,
      hasZones: !!riskCalculation.zones,
      zonesCount: riskCalculation.zones?.length || 0,
      useMockData
    });
    
    setUseMockData(true);
    console.log('✅ [PREFEITURA-SKIP] useMockData setado para TRUE');
  };

  // Converter dados para interface do Map.tsx
  const mapZones = useMemo(() => {
    if (useMockData) {
      const mockZonesData = generateMockZones();
      console.log('🎭 [Prefeitura] Usando MOCK DATA (SKIP ativado)');
      return mockZonesData.map(mapZoneRiskToMapZone);
    }
    
    if (!riskCalculation.zones || riskCalculation.zones.length === 0) {
      console.log('⏳ [Prefeitura] Aguardando cálculo de risco...');
      return [];
    }
    
    const converted = riskCalculation.zones.map(mapZoneRiskToMapZone);
    console.log(`✅ [Prefeitura] ${converted.length} zonas convertidas para mapa`);
    
    return converted;
  }, [riskCalculation.zones, useMockData, selectedCityData]);

  const getCityCoordinates = (): [number, number] => {
    return selectedCityData ? [selectedCityData.coordinates.lat, selectedCityData.coordinates.lon] : [-25.4284, -49.2733];
  };

  const handleZoneClick = (zone: any) => {
    setSelectedZone(zone);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src={logoSvg} alt="ClimaSeguro" className="h-12 w-auto" />
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Prefeitura de {selectedCityData?.name || "Curitiba"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Gestão de Riscos e Prevenção
              </p>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.href = '/'}
            className="gap-2"
          >
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard
              icon=""
              label="Zonas Críticas"
              value={riskCalculation.isLoading ? "..." : riskCalculation.stats.veryHigh.toString()}
              color="bg-red-100 text-red-700 border-red-300"
            />
            <StatCard
              icon=""
              label="Zonas Críticas"
              value={riskCalculation.isLoading ? "..." : (riskCalculation.stats.high - riskCalculation.stats.veryHigh).toString()}
              color="bg-orange-100 text-orange-700 border-orange-300"
            />
            <StatCard
              icon=""
              label="Total Monitoradas"
              value={riskCalculation.isLoading ? "..." : riskCalculation.stats.total.toString()}
              color="bg-blue-100 text-blue-700 border-blue-300"
            />
          </div>

          {/* Map */}
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-foreground">
              Mapa de Zonas de Risco
            </h2>

            {/* DEBUG INFO */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-4 p-2 bg-yellow-100 border border-yellow-400 rounded text-xs">
                <strong>DEBUG:</strong> isLoading={String(riskCalculation.isLoading)} | 
                useMockData={String(useMockData)} | 
                zones={riskCalculation.zones?.length || 0} | 
                mapZones={mapZones.length}
              </div>
            )}

            {/* Loading State */}
            {riskCalculation.isLoading && !useMockData && (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <div className="text-center">
                  <p className="text-sm font-medium">Calculando risco para {selectedCityData?.name}...</p>
                  {riskCalculation.progress && (
                    <div className="mt-2 w-64">
                      <Progress value={riskCalculation.progress.percentage} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {riskCalculation.progress.percentage}% - {riskCalculation.progress.status === 'calculating' ? `Zona ${riskCalculation.progress.currentZone}/100` : 'Preparando...'}
                      </p>
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4 bg-white hover:bg-gray-50"
                    onClick={handleSkipLoading}
                  >
                    Pular e usar dados mockados
                  </Button>
                </div>
              </div>
            )}

            {/* Error State */}
            {riskCalculation.isError && (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <div className="text-center">
                  <p className="text-sm font-medium text-red-700">Erro no cálculo de risco</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {riskCalculation.error?.message || 'Erro desconhecido'}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={riskCalculation.retry}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Tentar novamente
                  </Button>
                </div>
              </div>
            )}

            {/* Map */}
            {(!riskCalculation.isLoading || useMockData) && !riskCalculation.isError && (
              <>
                <Map 
                  center={getCityCoordinates()} 
                  zones={mapZones}
                  onZoneClick={handleZoneClick}
                />
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-500"></div>
                      <span>Crítico (≥75%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-orange-500"></div>
                      <span>Alto (50-74%)</span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {mapZones.length > 0 
                      ? `${mapZones.length} zonas monitoradas ${useMockData ? '(dados mockados)' : ''}` 
                      : 'Aguardando cálculo...'
                    }
                  </div>
                </div>
              </>
            )}
          </div>

          {/* High Risk Zones List */}
          {mapZones.length > 0 && (
            <div>
              <h2 className="mb-4 text-xl font-bold text-foreground">
                Zonas Críticas
              </h2>

              <div className="space-y-3">
                {mapZones
                  .filter(zone => zone.score >= 50)
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 10)
                  .map((zone) => (
                    <div
                      key={zone.id}
                      onClick={() => handleZoneClick(zone)}
                      className="cursor-pointer rounded-lg bg-card p-4 shadow-sm transition-all hover:shadow-lg hover:scale-[1.02] border-l-4"
                      style={{ 
                        borderLeftColor: zone.score >= 75 ? '#ef4444' : '#f97316' 
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="h-3 w-3 rounded-full inline-block" style={{backgroundColor: zone.score >= 75 ? '#ef4444' : '#f97316'}}></span>
                          <div>
                            <p className="font-bold text-foreground">
                              Zona {zone.id} - {zone.level}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Score: {zone.score}/100 | {zone.total_imoveis} imóveis em risco
                            </p>
                            <p className="text-xs text-muted-foreground">
                              População estimada: {zone.populacao_estimada} pessoas | 
                              Coordenadas: {zone.coordinates.lat.toFixed(4)}, {zone.coordinates.lon.toFixed(4)}
                            </p>
                          </div>
                        </div>
                        <button className="text-accent hover:text-accent/80 font-medium">
                          Ver Detalhes →
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              {mapZones.filter(z => z.score >= 50).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhuma zona crítica identificada</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal de Detalhes */}
      <PrefeituraZoneModal 
        zone={selectedZone}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
};

const StatCard = ({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) => {
  return (
    <div className={`rounded-lg border p-4 ${color}`}>
      <div className="flex items-center gap-3">
        <span className="text-3xl">{icon}</span>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default Prefeitura;
