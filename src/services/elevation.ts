/**
 * Serviço de elevação usando Open-Elevation API
 * Baseado na função buscarElevacao() do risco_regional_opensource.js (linha 221-258)
 */

import { BoundingBox, ElevationPoint } from '@/types';
import { API_ENDPOINTS, API_CONFIG, API_HEADERS } from '@/constants/apiEndpoints';

interface OpenElevationRequest {
  locations: Array<{
    latitude: number;
    longitude: number;
  }>;
}

interface OpenElevationResponse {
  results: Array<{
    latitude: number;
    longitude: number;
    elevation: number;
  }>;
}

/**
 * Cria uma grade de pontos dentro do bounding box para amostragem de elevação
 * Baseado no algoritmo do backend (linha 224-233)
 * 
 * @param bbox Bounding box da área
 * @param gridSize Tamanho da grade (ex: 5 = 5x5 = 25 pontos)
 * @returns Array de coordenadas para consulta
 */
function createElevationGrid(bbox: BoundingBox, gridSize: number): Array<{ latitude: number; longitude: number }> {
  const latStep = (bbox.maxLat - bbox.minLat) / (gridSize - 1);
  const lonStep = (bbox.maxLon - bbox.minLon) / (gridSize - 1);
  
  const points: Array<{ latitude: number; longitude: number }> = [];
  
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const latitude = bbox.minLat + (i * latStep);
      const longitude = bbox.minLon + (j * lonStep);
      
      points.push({ latitude, longitude });
    }
  }
  
  console.log(`📏 Grade de elevação criada: ${gridSize}x${gridSize} = ${points.length} pontos`);
  return points;
}

/**
 * Consulta elevação para múltiplos pontos via Open-Elevation API
 * Faz uma única requisição com todos os pontos (mais eficiente)
 * 
 * @param locations Array de coordenadas para consultar
 * @returns Array de pontos com elevação ou null se falhar
 */
async function queryOpenElevationAPI(
  locations: Array<{ latitude: number; longitude: number }>
): Promise<ElevationPoint[] | null> {
  try {
    const requestBody: OpenElevationRequest = { locations };
    
    console.log(`🏔️ Consultando elevação para ${locations.length} pontos...`);
    
    const response = await fetch(API_ENDPOINTS.OPEN_ELEVATION, {
      method: 'POST',
      headers: {
        ...API_HEADERS,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT.OPEN_ELEVATION)
    });

    if (!response.ok) {
      throw new Error(`Open-Elevation HTTP ${response.status}: ${response.statusText}`);
    }

    const data: OpenElevationResponse = await response.json();
    
    if (!data.results || data.results.length === 0) {
      throw new Error('Nenhum resultado de elevação retornado');
    }

    // Validar que temos elevação para todos os pontos solicitados
    if (data.results.length !== locations.length) {
      console.warn(`⚠️ Elevação: ${data.results.length}/${locations.length} pontos retornados`);
    }

    // Filtrar resultados inválidos (elevação null/undefined)
    const validResults = data.results.filter(result => 
      typeof result.elevation === 'number' && 
      !isNaN(result.elevation)
    );

    if (validResults.length === 0) {
      throw new Error('Nenhum ponto com elevação válida');
    }

    console.log(`✅ Elevação obtida para ${validResults.length} pontos válidos`);
    return validResults;
    
  } catch (error) {
    console.error('❌ Erro na API Open-Elevation:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Função principal para buscar dados de elevação de uma área
 * Implementa o mesmo fluxo do backend: criar grade → consultar API → validar
 * 
 * @param bbox Bounding box da área para análise
 * @param gridSize Resolução da grade (default 5 = 25 pontos, como no backend)
 * @returns Array de pontos com elevação ou null se falhar
 */
export async function fetchElevation(
  bbox: BoundingBox, 
  gridSize: number = 5
): Promise<ElevationPoint[] | null> {
  console.log(`🗻 Iniciando busca de elevação para bbox:`, bbox);
  
  // Validar parâmetros
  if (!bbox || gridSize < 2 || gridSize > 20) {
    console.error('❌ Parâmetros inválidos para elevação');
    return null;
  }

  // Criar grade de pontos
  const gridPoints = createElevationGrid(bbox, gridSize);
  
  if (gridPoints.length === 0) {
    console.error('❌ Falha ao criar grade de pontos');
    return null;
  }

  // Consultar API
  const elevationData = await queryOpenElevationAPI(gridPoints);
  
  if (!elevationData) {
    console.error('❌ Falha ao obter dados de elevação');
    return null;
  }

  console.log(`✅ Dados de elevação processados: ${elevationData.length} pontos`);
  return elevationData;
}

/**
 * Função utilitária para obter estatísticas básicas de elevação
 * Útil para debug e validação
 */
export function getElevationStats(points: ElevationPoint[]): {
  min: number;
  max: number;
  avg: number;
  range: number;
} {
  if (points.length === 0) {
    return { min: 0, max: 0, avg: 0, range: 0 };
  }

  const elevations = points.map(p => p.elevation);
  const min = Math.min(...elevations);
  const max = Math.max(...elevations);
  const avg = elevations.reduce((sum, val) => sum + val, 0) / elevations.length;
  const range = max - min;

  return { min, max, avg, range };
}

/**
 * Função para reduzir resolução em caso de falha
 * Estratégia de fallback: tentar com menos pontos se API falhar
 */
export async function fetchElevationWithFallback(
  bbox: BoundingBox
): Promise<ElevationPoint[] | null> {
  // Tentar resoluções decrescentes: 5x5 → 4x4 → 3x3
  const gridSizes = [5, 4, 3];
  
  for (const size of gridSizes) {
    console.log(`🔄 Tentando elevação com grade ${size}x${size}...`);
    
    const result = await fetchElevation(bbox, size);
    if (result) {
      return result;
    }
    
    console.warn(`⚠️ Falha com grade ${size}x${size}, tentando menor...`);
  }
  
  console.error('❌ Todas as tentativas de elevação falharam');
  return null;
}