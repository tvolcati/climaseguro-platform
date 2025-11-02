/**
 * Serviço de infraestrutura OSM usando Overpass API
 * Baseado na função buscarInfraestruturaOSM() do risco_regional_opensource.js (linha 154-215)
 */

import { BoundingBox, OSMElement, InfrastructureData } from '@/types';
import { API_ENDPOINTS, API_CONFIG, API_HEADERS } from '@/constants/apiEndpoints';

/**
 * Gera query Overpass para buscar elementos de infraestrutura
 * Baseado na query do backend que busca: rios, construções, áreas verdes, vias
 */
function buildOverpassQuery(bbox: BoundingBox): string {
  const { minLat, minLon, maxLat, maxLon } = bbox;
  
  // Query Overpass QL para buscar elementos relevantes para cálculo de risco
  return `
[out:json][timeout:25];
(
  // RIOS E CORPOS D'ÁGUA
  way["waterway"~"^(river|stream|canal|ditch)$"](${minLat},${minLon},${maxLat},${maxLon});
  relation["waterway"~"^(river|stream|canal|ditch)$"](${minLat},${minLon},${maxLat},${maxLon});
  way["natural"~"^(water|wetland)$"](${minLat},${minLon},${maxLat},${maxLon});
  relation["natural"~"^(water|wetland)$"](${minLat},${minLon},${maxLat},${maxLon});
  
  // CONSTRUÇÕES E EDIFICAÇÕES
  way["building"](${minLat},${minLon},${maxLat},${maxLon});
  relation["building"](${minLat},${minLon},${maxLat},${maxLon});
  way["landuse"~"^(residential|commercial|industrial|retail)$"](${minLat},${minLon},${maxLat},${maxLon});
  relation["landuse"~"^(residential|commercial|industrial|retail)$"](${minLat},${minLon},${maxLat},${maxLon});
  
  // ÁREAS VERDES E VEGETAÇÃO
  way["landuse"~"^(forest|grass|meadow|orchard|vineyard|farmland)$"](${minLat},${minLon},${maxLat},${maxLon});
  relation["landuse"~"^(forest|grass|meadow|orchard|vineyard|farmland)$"](${minLat},${minLon},${maxLat},${maxLon});
  way["natural"~"^(wood|grassland|scrub|heath)$"](${minLat},${minLon},${maxLat},${maxLon});
  relation["natural"~"^(wood|grassland|scrub|heath)$"](${minLat},${minLon},${maxLat},${maxLon});
  way["leisure"~"^(park|garden|nature_reserve)$"](${minLat},${minLon},${maxLat},${maxLon});
  relation["leisure"~"^(park|garden|nature_reserve)$"](${minLat},${minLon},${maxLat},${maxLon});
  
  // VIAS E SISTEMA VIÁRIO
  way["highway"~"^(primary|secondary|tertiary|residential|trunk|motorway)$"](${minLat},${minLon},${maxLat},${maxLon});
  way["highway"="unclassified"](${minLat},${minLon},${maxLat},${maxLon});
);
out geom;
`.trim();
}

/**
 * Classifica elementos OSM por categoria para cálculo de risco
 */
function classifyOSMElements(elements: OSMElement[]): {
  rios: OSMElement[];
  construcoes: OSMElement[];
  areasVerdes: OSMElement[];
  vias: OSMElement[];
} {
  const rios: OSMElement[] = [];
  const construcoes: OSMElement[] = [];
  const areasVerdes: OSMElement[] = [];
  const vias: OSMElement[] = [];

  for (const element of elements) {
    const tags = element.tags || {};
    
    // Classificar RIOS
    if (tags.waterway || tags.natural === 'water' || tags.natural === 'wetland') {
      rios.push(element);
    }
    
    // Classificar CONSTRUÇÕES
    else if (
      tags.building || 
      ['residential', 'commercial', 'industrial', 'retail'].includes(tags.landuse)
    ) {
      construcoes.push(element);
    }
    
    // Classificar ÁREAS VERDES
    else if (
      ['forest', 'grass', 'meadow', 'orchard', 'vineyard', 'farmland'].includes(tags.landuse) ||
      ['wood', 'grassland', 'scrub', 'heath'].includes(tags.natural) ||
      ['park', 'garden', 'nature_reserve'].includes(tags.leisure)
    ) {
      areasVerdes.push(element);
    }
    
    // Classificar VIAS
    else if (tags.highway) {
      vias.push(element);
    }
  }

  return { rios, construcoes, areasVerdes, vias };
}

/**
 * Consulta Overpass API para obter elementos de infraestrutura
 * Timeout generoso pois Overpass pode ser lenta
 */
async function queryOverpassAPI(query: string): Promise<OSMElement[] | null> {
  try {
    console.log('🌐 Consultando Overpass API...');
    console.log('Query:', query.substring(0, 200) + '...');
    
    const response = await fetch(API_ENDPOINTS.OVERPASS_API, {
      method: 'POST',
      headers: {
        ...API_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT.OVERPASS)
    });

    if (!response.ok) {
      throw new Error(`Overpass HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.elements || !Array.isArray(data.elements)) {
      throw new Error('Resposta Overpass inválida: faltam elements');
    }

    console.log(`✅ Overpass retornou ${data.elements.length} elementos`);
    return data.elements;
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('❌ Timeout na Overpass API (30s)');
    } else {
      console.error('❌ Erro na Overpass API:', error instanceof Error ? error.message : error);
    }
    return null;
  }
}

/**
 * Função principal para buscar dados de infraestrutura OSM de uma área
 * Implementa o mesmo fluxo do backend: query → classify → validate
 * 
 * @param bbox Bounding box da área para análise
 * @returns Dados de infraestrutura classificados ou null se falhar
 */
export async function fetchOSMInfrastructure(bbox: BoundingBox): Promise<InfrastructureData | null> {
  console.log('🏗️ Iniciando busca de infraestrutura OSM para bbox:', bbox);
  
  // Validar bbox
  if (!bbox || bbox.minLat >= bbox.maxLat || bbox.minLon >= bbox.maxLon) {
    console.error('❌ Bounding box inválido para infraestrutura');
    return null;
  }

  // Verificar se área não é muito grande (proteção contra queries muito pesadas)
  const area = (bbox.maxLat - bbox.minLat) * (bbox.maxLon - bbox.minLon);
  if (area > 0.1) { // ~11km x 11km no equador
    console.warn('⚠️ Área muito grande para consulta OSM, pode ser lenta');
  }

  // Gerar e executar query
  const query = buildOverpassQuery(bbox);
  const elements = await queryOverpassAPI(query);
  
  if (!elements) {
    console.error('❌ Falha ao obter elementos OSM');
    return null;
  }

  // Classificar elementos por categoria
  const classified = classifyOSMElements(elements);
  
  const infrastructureData: InfrastructureData = {
    ...classified,
    totalElementos: elements.length
  };

  console.log('📊 Infraestrutura classificada:', {
    rios: classified.rios.length,
    construcoes: classified.construcoes.length, 
    areasVerdes: classified.areasVerdes.length,
    vias: classified.vias.length,
    total: elements.length
  });

  return infrastructureData;
}

/**
 * Função para buscar apenas rios (usado no cálculo de proximidade)
 * Otimização para casos onde só precisamos de dados de rios
 */
export async function fetchRiversOnly(bbox: BoundingBox): Promise<OSMElement[] | null> {
  const query = `
[out:json][timeout:15];
(
  way["waterway"~"^(river|stream|canal|ditch)$"](${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon});
  relation["waterway"~"^(river|stream|canal|ditch)$"](${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon});
  way["natural"~"^(water|wetland)$"](${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon});
);
out geom;
`.trim();

  console.log('🌊 Buscando apenas rios...');
  
  const elements = await queryOverpassAPI(query);
  if (!elements) return null;

  const { rios } = classifyOSMElements(elements);
  console.log(`✅ Encontrados ${rios.length} rios`);
  
  return rios;
}

/**
 * Função utilitária para calcular densidade de elementos por km²
 */
export function calculateElementDensity(
  elements: OSMElement[], 
  bbox: BoundingBox
): number {
  // Aproximação grosseira da área em km²
  const latDiff = bbox.maxLat - bbox.minLat;
  const lonDiff = bbox.maxLon - bbox.minLon;
  const areaKm2 = latDiff * lonDiff * 111 * 111; // ~111km por grau
  
  return areaKm2 > 0 ? elements.length / areaKm2 : 0;
}