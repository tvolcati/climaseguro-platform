import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import logoSvg from "@/assets/clima-seguro-logo.svg";
import Map from "@/components/Map_SIMPLE";
import ZoneDetailModal from "@/components/ZoneDetailModal";
import { useSimpleRiskCalculation } from "@/hooks";
import { ZoneRiskResult } from "@/types";

// Mock data - substituir pelos dados reais depois
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
    level: zoneResult.nivel.replace(/🔴|🟠|🟡|🟢/, '').trim(), // Remove emoji, fica só texto
    total_imoveis: Math.floor(Math.random() * 50) + 20, // Mock - será substituído por dados reais
    populacao_estimada: Math.floor(Math.random() * 150) + 50, // Mock - será substituído por dados reais
    // Adicionar dados extras do cálculo real para o modal
    _originalData: zoneResult // Para modal detalhado
  };
}

const ClimaSeguro = () => {
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedZone, setSelectedZone] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Buscar dados da cidade selecionada
  const selectedCityData = cities.find(c => c.code === selectedCity);
  
  // Hook para cálculo de risco (só executa quando cidade está selecionada)
  const riskCalculation = useSimpleRiskCalculation({
    cityCode: selectedCity || "",
    cityUF: selectedCityData?.state || "",
    autoStart: !!selectedCity, // Só auto-start se cidade selecionada
    highRiskOnly: false, // TEMPORÁRIO: Desabilitar filtro para debug
    onComplete: (zones) => {
      console.log(`✅ Cálculo concluído para ${selectedCityData?.name}: ${zones.length} zonas calculadas`);
    }
  });
  
  // Converter dados para interface do Map.tsx
  const mapZones = useMemo(() => {
    // TESTE: Se não há dados reais, usar mock para testar rendering
    const mockZones = [
      {
        id: 1,
        coordinates: { lat: -25.4284, lon: -49.2733 },
        score: 75,
        level: "Muito Alto",
        total_imoveis: 45,
        populacao_estimada: 150
      },
      {
        id: 2,
        coordinates: { lat: -25.4300, lon: -49.2750 },
        score: 60,
        level: "Alto",
        total_imoveis: 38,
        populacao_estimada: 120
      },
      {
        id: 3,
        coordinates: { lat: -25.4250, lon: -49.2700 },
        score: 55,
        level: "Alto",
        total_imoveis: 32,
        populacao_estimada: 95
      }
    ];
    
    if (!riskCalculation.zones || riskCalculation.zones.length === 0) {
      console.log('❌ [ClimaSeguro] Usando MOCK DATA - nenhuma zona calculada');
      return mockZones;
    }
    
    const converted = riskCalculation.zones.map(mapZoneRiskToMapZone);
    console.log(`✅ [ClimaSeguro] ${converted.length} zonas convertidas para mapa`);
    
    return converted;
  }, [riskCalculation.zones]);
  
  const getCityCoordinates = (): [number, number] => {
    return selectedCityData ? [selectedCityData.coordinates.lat, selectedCityData.coordinates.lon] : [-25.4284, -49.2733];
  };

  const handleZoneClick = (zone: any) => {
    setSelectedZone(zone);
    setModalOpen(true);
  };
  
  // Reset quando troca cidade
  useEffect(() => {
    if (selectedCity) {
      setSelectedZone(null);
      setModalOpen(false);
    }
  }, [selectedCity]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src={logoSvg} alt="ClimaSeguro" className="h-12 w-auto" />
            <div>
              <h1 className="text-xl font-bold text-foreground">ClimaSeguro</h1>
              <p className="text-sm text-muted-foreground">Análise de Risco</p>
            </div>
          </div>

          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Selecione uma cidade" />
            </SelectTrigger>
            <SelectContent>
              {cities.map((city) => (
                <SelectItem key={city.code} value={city.code}>
                  {city.name} - {city.state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {!selectedCity ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <div className="mb-4 text-6xl">🌍</div>
              <h2 className="mb-2 text-2xl font-bold text-foreground">
                Selecione uma cidade
              </h2>
              <p className="text-muted-foreground">
                Escolha uma cidade no dropdown acima para visualizar as zonas de risco
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatCard
                icon="🔴"
                label="Muito Alto"
                value={riskCalculation.isLoading ? "..." : riskCalculation.stats.veryHigh.toString()}
                color="bg-red-100 text-red-700 border-red-300"
              />
              <StatCard
                icon="🟠"
                label="Moderado"
                value={riskCalculation.isLoading ? "..." : (riskCalculation.stats.high - riskCalculation.stats.veryHigh).toString()}
                color="bg-orange-100 text-orange-700 border-orange-300"
              />
              <StatCard
                icon="📊"
                label="Total Analisadas"
                value={riskCalculation.isLoading ? "..." : riskCalculation.stats.total.toString()}
                color="bg-blue-100 text-blue-700 border-blue-300"
              />
            </div>

            {/* Mapa Leaflet */}
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-foreground">
                🗺️ Mapa de Zonas de Risco
              </h3>
              
              {/* Loading State */}
              {riskCalculation.isLoading && (
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
              {!riskCalculation.isLoading && !riskCalculation.isError && (
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
                        <span>Muito Alto (≥75%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-orange-500"></div>
                        <span>Moderado (50-74%)</span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {mapZones.length > 0 
                        ? `${mapZones.length} zonas de risco exibidas` 
                        : 'Nenhuma zona de alto risco encontrada'
                      }
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal de Detalhes da Zona */}
      <ZoneDetailModal 
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

export default ClimaSeguro;
