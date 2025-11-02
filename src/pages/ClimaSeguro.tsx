import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import logoSvg from "@/assets/clima-seguro-logo.svg";
import Map from "@/components/Map";
import ZoneDetailModal from "@/components/ZoneDetailModal";

// Mock data - substituir pelos dados reais depois
const cities = [
  { code: "4106902", name: "Curitiba", state: "PR", coordinates: { lat: -25.4284, lon: -49.2733 } },
  { code: "3550308", name: "São Paulo", state: "SP", coordinates: { lat: -23.5505, lon: -46.6333 } },
  { code: "3304557", name: "Rio de Janeiro", state: "RJ", coordinates: { lat: -22.9068, lon: -43.1729 } },
];

// Mock zones de risco - apenas ALTO e CRÍTICO
const mockZones = [
  {
    id: 1,
    coordinates: { lat: -25.4284, lon: -49.2733 },
    score: 85,
    level: "CRÍTICO",
    total_imoveis: 47,
    populacao_estimada: 152,
  },
  {
    id: 2,
    coordinates: { lat: -25.4384, lon: -49.2633 },
    score: 72,
    level: "CRÍTICO",
    total_imoveis: 38,
    populacao_estimada: 121,
  },
  {
    id: 3,
    coordinates: { lat: -25.4184, lon: -49.2833 },
    score: 78,
    level: "CRÍTICO",
    total_imoveis: 41,
    populacao_estimada: 135,
  },
  {
    id: 4,
    coordinates: { lat: -25.4484, lon: -49.2533 },
    score: 65,
    level: "ALTO",
    total_imoveis: 32,
    populacao_estimada: 98,
  },
  {
    id: 5,
    coordinates: { lat: -25.4184, lon: -49.2633 },
    score: 58,
    level: "ALTO",
    total_imoveis: 28,
    populacao_estimada: 84,
  },
  {
    id: 6,
    coordinates: { lat: -25.4384, lon: -49.2833 },
    score: 62,
    level: "ALTO",
    total_imoveis: 35,
    populacao_estimada: 105,
  },
  {
    id: 7,
    coordinates: { lat: -25.4484, lon: -49.2733 },
    score: 69,
    level: "ALTO",
    total_imoveis: 40,
    populacao_estimada: 118,
  },
  {
    id: 8,
    coordinates: { lat: -25.4084, lon: -49.2733 },
    score: 81,
    level: "CRÍTICO",
    total_imoveis: 45,
    populacao_estimada: 142,
  },
  {
    id: 9,
    coordinates: { lat: -25.4284, lon: -49.2533 },
    score: 55,
    level: "ALTO",
    total_imoveis: 29,
    populacao_estimada: 87,
  },
  {
    id: 10,
    coordinates: { lat: -25.4584, lon: -49.2633 },
    score: 74,
    level: "CRÍTICO",
    total_imoveis: 43,
    populacao_estimada: 138,
  },
];

const ClimaSeguro = () => {
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedZone, setSelectedZone] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  const getCityCoordinates = (): [number, number] => {
    const city = cities.find(c => c.code === selectedCity);
    return city ? [city.coordinates.lat, city.coordinates.lon] : [-25.4284, -49.2733];
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <StatCard
                icon="🔴"
                label="Crítico"
                value="5"
                color="bg-red-100 text-red-700 border-red-300"
              />
              <StatCard
                icon="🟠"
                label="Alto"
                value="5"
                color="bg-orange-100 text-orange-700 border-orange-300"
              />
            </div>

            {/* Mapa Leaflet */}
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-foreground">
                🗺️ Mapa de Zonas de Risco
              </h3>
              <Map 
                center={getCityCoordinates()} 
                zones={mockZones}
                onZoneClick={handleZoneClick}
              />
              <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500"></div>
                  <span>Crítico (≥70)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-orange-500"></div>
                  <span>Alto (50-69)</span>
                </div>
              </div>
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
