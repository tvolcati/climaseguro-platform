// ===== GEO & COORDENADAS =====
export interface Coordinates {
  lat: number;
  lon: number;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
  centerLat: number;
  centerLon: number;
}

// ===== CIDADES =====
export interface City {
  code: string;           // Código IBGE
  name: string;
  state: string;          // UF
  coordinates: Coordinates;
}

// ===== ZONAS DE RISCO =====
export interface RiskZone {
  id: number;
  coordinates: Coordinates;
  bbox?: BoundingBox;     // Opcional para compatibilidade com Map.tsx
  score: number;          // 0-100
  level: string;          // Para manter compatibilidade inicial, depois virar RiskLevel
  total_imoveis?: number;
  populacao_estimada?: number;
}

export type RiskLevel = 
  | "MUITO_ALTO"   // ≥75%
  | "ALTO"         // ≥50%
  | "MODERADO"     // ≥30%
  | "BAIXO";       // <30%

export interface RiskClassification {
  nivel: string;        // "🔴 MUITO ALTO"
  cor: string;          // "#991b1b"
  prioridade: number;   // 1-5
}

// ===== FATORES DE RISCO =====
export interface RiskFactor {
  nome: string;
  valor: number | string;
  peso: number;         // 0-1
  score?: number;       // 0-1
}

// ===== INFRAESTRUTURA OSM =====
export interface OSMElement {
  id: number;
  type: string;
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
  nodes?: number[];
}

export interface InfrastructureData {
  rios: OSMElement[];
  construcoes: OSMElement[];
  areasVerdes: OSMElement[];
  vias: OSMElement[];
  totalElementos: number;
}

// ===== ELEVAÇÃO =====
export interface ElevationPoint {
  latitude: number;
  longitude: number;
  elevation: number;
}

// ===== RESULTADO DE CÁLCULO =====
export interface ZoneRiskResult {
  id: number;
  coordinates: Coordinates;
  bbox: BoundingBox;
  scoreNormalizado: number;   // 0-100
  score: number;              // 0-1
  nivel: string;
  cor: string;
  prioridade: number;
  fatores: RiskFactor[];
  declividade: number;
  recomendacoes: string[];
}

// ===== PROGRESSO DE CÁLCULO =====
export interface CalculationProgress {
  total: number;
  completed: number;
  percentage: number;
  currentZone?: number;
  status: "idle" | "fetching_data" | "calculating" | "done" | "error";
  error?: string;
}

// ===== PROPS DE COMPONENTES (compatibilidade) =====
export interface MapProps {
  center: [number, number];  // [lat, lon]
  zones: RiskZone[];
  onZoneClick?: (zone: RiskZone) => void;
}

export interface ZoneDetailModalProps {
  zone: {
    id: number;
    score: number;
    level: string;
    total_imoveis?: number;
    populacao_estimada?: number;
    coordinates: { lat: number; lon: number };
    // Campos adicionais que serão calculados:
    fatores?: RiskFactor[];
    declividade?: number;
    recomendacoes?: string[];
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}