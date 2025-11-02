/**
 * Utilitários para cálculos de terreno e declividade
 * Baseado na função calcularDeclividade() do risco_regional_opensource.js (linha 264-300)
 */

import { ElevationPoint } from '@/types';

/**
 * Calcula a distância entre dois pontos usando fórmula de Haversine
 * Retorna distância em metros
 * 
 * @param lat1 Latitude do primeiro ponto
 * @param lon1 Longitude do primeiro ponto  
 * @param lat2 Latitude do segundo ponto
 * @param lon2 Longitude do segundo ponto
 * @returns Distância em metros
 */
function calculateHaversineDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371000; // Raio da Terra em metros
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calcula a declividade entre dois pontos de elevação
 * Retorna declividade em percentual
 * 
 * @param point1 Primeiro ponto com elevação
 * @param point2 Segundo ponto com elevação
 * @returns Declividade em % (0-100+)
 */
function calculateSlopeBetweenPoints(
  point1: ElevationPoint, 
  point2: ElevationPoint
): number {
  const horizontalDistance = calculateHaversineDistance(
    point1.latitude, 
    point1.longitude,
    point2.latitude, 
    point2.longitude
  );

  if (horizontalDistance === 0) {
    return 0;
  }

  const verticalDistance = Math.abs(point2.elevation - point1.elevation);
  const slope = (verticalDistance / horizontalDistance) * 100;

  return slope;
}

/**
 * Calcula a declividade média de uma área baseada em pontos de elevação
 * Implementa o mesmo algoritmo do backend (linha 264-300)
 * 
 * @param elevationPoints Array de pontos com coordenadas e elevação
 * @returns Declividade média em percentual (0-100+)
 */
export function calculateSlope(elevationPoints: ElevationPoint[]): number {
  if (!elevationPoints || elevationPoints.length < 2) {
    console.warn('⚠️ Pontos insuficientes para calcular declividade');
    return 0;
  }

  // Filtrar pontos com elevação válida
  const validPoints = elevationPoints.filter(point => 
    typeof point.elevation === 'number' && 
    !isNaN(point.elevation) &&
    typeof point.latitude === 'number' && 
    typeof point.longitude === 'number' &&
    !isNaN(point.latitude) && 
    !isNaN(point.longitude)
  );

  if (validPoints.length < 2) {
    console.warn('⚠️ Pontos válidos insuficientes para calcular declividade');
    return 0;
  }

  console.log(`📐 Calculando declividade com ${validPoints.length} pontos válidos`);

  // Calcular declividade para todos os pares de pontos consecutivos
  const slopes: number[] = [];
  
  for (let i = 0; i < validPoints.length - 1; i++) {
    for (let j = i + 1; j < validPoints.length; j++) {
      const slope = calculateSlopeBetweenPoints(validPoints[i], validPoints[j]);
      if (slope > 0) { // Só incluir declividades positivas
        slopes.push(slope);
      }
    }
  }

  if (slopes.length === 0) {
    console.warn('⚠️ Nenhuma declividade calculada (terreno plano?)');
    return 0;
  }

  // Calcular média das declividades
  const averageSlope = slopes.reduce((sum, slope) => sum + slope, 0) / slopes.length;
  
  console.log(`📊 Declividade calculada: ${averageSlope.toFixed(2)}% (${slopes.length} medições)`);
  
  return Math.round(averageSlope * 100) / 100; // Arredondar para 2 casas decimais
}

/**
 * Classifica o tipo de terreno baseado na declividade
 * Usa os mesmos thresholds do backend (THRESHOLDS_DECLIVIDADE)
 * 
 * @param slopePercentage Declividade em percentual
 * @returns Tipo de terreno e peso correspondente
 */
export function classifyTerrain(slopePercentage: number): {
  type: 'PLANO' | 'SUAVE' | 'ONDULADO' | 'FORTE' | 'MONTANHOSO';
  weight: number;
  description: string;
} {
  if (slopePercentage < 3) {
    return {
      type: 'PLANO',
      weight: 0.1,
      description: '0-3% - Terreno plano, baixo risco de deslizamento'
    };
  } else if (slopePercentage < 8) {
    return {
      type: 'SUAVE',
      weight: 0.3,
      description: '3-8% - Terreno suavemente ondulado'
    };
  } else if (slopePercentage < 20) {
    return {
      type: 'ONDULADO',
      weight: 0.6,
      description: '8-20% - Terreno ondulado, risco moderado'
    };
  } else if (slopePercentage < 45) {
    return {
      type: 'FORTE',
      weight: 0.85,
      description: '20-45% - Terreno fortemente ondulado, risco alto'
    };
  } else {
    return {
      type: 'MONTANHOSO',
      weight: 1.0,
      description: '>45% - Terreno montanhoso, risco muito alto'
    };
  }
}

/**
 * Calcula estatísticas detalhadas de elevação para debug
 * 
 * @param elevationPoints Array de pontos de elevação
 * @returns Estatísticas completas
 */
export function getElevationStatistics(elevationPoints: ElevationPoint[]): {
  count: number;
  minElevation: number;
  maxElevation: number;
  avgElevation: number;
  elevationRange: number;
  slope: number;
  terrainType: string;
  validPoints: number;
} {
  const validPoints = elevationPoints.filter(p => 
    !isNaN(p.elevation) && !isNaN(p.latitude) && !isNaN(p.longitude)
  );

  if (validPoints.length === 0) {
    return {
      count: 0,
      minElevation: 0,
      maxElevation: 0,
      avgElevation: 0,
      elevationRange: 0,
      slope: 0,
      terrainType: 'INDETERMINADO',
      validPoints: 0
    };
  }

  const elevations = validPoints.map(p => p.elevation);
  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);
  const avgElevation = elevations.reduce((sum, elev) => sum + elev, 0) / elevations.length;
  const elevationRange = maxElevation - minElevation;
  
  const slope = calculateSlope(validPoints);
  const terrain = classifyTerrain(slope);

  return {
    count: elevationPoints.length,
    minElevation: Math.round(minElevation),
    maxElevation: Math.round(maxElevation),
    avgElevation: Math.round(avgElevation),
    elevationRange: Math.round(elevationRange),
    slope: Math.round(slope * 100) / 100,
    terrainType: terrain.type,
    validPoints: validPoints.length
  };
}