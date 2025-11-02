/**
 * Utilitários para divisão de áreas em grid de zonas
 * Baseado na função dividirEmZonas() do risco_regional_opensource.js (linha 306-328)
 * 
 * MODIFICADO: Gera 100 zonas (10x10) em vez de 9 (3x3) do backend original
 */

import { BoundingBox, RiskZone, Coordinates } from '@/types';

/**
 * Divide uma área (bounding box) em grid regular de zonas
 * Implementa algoritmo do backend com modificação para 100 zonas
 * 
 * @param bbox Bounding box da cidade/área
 * @param numZonas Número total de zonas (default 100 = 10x10)
 * @returns Array de zonas com bbox e coordenadas centrais
 */
export function divideIntoZones(
  bbox: BoundingBox, 
  numZonas: number = 100
): RiskZone[] {
  console.log(`🗺️ Dividindo área em ${numZonas} zonas`);
  
  // Validar parâmetros
  if (!bbox || bbox.minLat >= bbox.maxLat || bbox.minLon >= bbox.maxLon) {
    console.error('❌ Bounding box inválido para divisão');
    return [];
  }

  // Calcular dimensões do grid (assumindo grid quadrado)
  const gridSize = Math.sqrt(numZonas);
  
  if (!Number.isInteger(gridSize)) {
    console.error(`❌ Número de zonas deve ser quadrado perfeito. ${numZonas} → √${gridSize}`);
    return [];
  }

  console.log(`📐 Grid: ${gridSize}x${gridSize} = ${numZonas} zonas`);

  // Calcular step de latitude e longitude
  const latStep = (bbox.maxLat - bbox.minLat) / gridSize;
  const lonStep = (bbox.maxLon - bbox.minLon) / gridSize;

  console.log(`📏 Steps: lat=${latStep.toFixed(6)}, lon=${lonStep.toFixed(6)}`);

  const zones: RiskZone[] = [];
  let zoneId = 1;

  // Criar grid de zonas (linha por linha, da esquerda para direita)
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      
      // Calcular bounds da zona atual
      const zoneMinLat = bbox.minLat + (row * latStep);
      const zoneMaxLat = bbox.minLat + ((row + 1) * latStep);
      const zoneMinLon = bbox.minLon + (col * lonStep);
      const zoneMaxLon = bbox.minLon + ((col + 1) * lonStep);

      // Coordenadas centrais da zona
      const centerLat = (zoneMinLat + zoneMaxLat) / 2;
      const centerLon = (zoneMinLon + zoneMaxLon) / 2;

      // Criar objeto zona
      const zone: RiskZone = {
        id: zoneId,
        coordinates: {
          lat: centerLat,
          lon: centerLon
        },
        bbox: {
          minLat: zoneMinLat,
          maxLat: zoneMaxLat,
          minLon: zoneMinLon,
          maxLon: zoneMaxLon,
          centerLat: centerLat,
          centerLon: centerLon
        },
        score: 0, // Será calculado posteriormente
        level: 'BAIXO' // Será atualizado após cálculo
      };

      zones.push(zone);
      zoneId++;
    }
  }

  console.log(`✅ ${zones.length} zonas criadas com sucesso`);
  
  // Validação final
  if (zones.length !== numZonas) {
    console.error(`❌ Erro na divisão: esperadas ${numZonas}, criadas ${zones.length}`);
  }

  return zones;
}

/**
 * Calcula a área aproximada de uma zona em km²
 * Útil para validações e cálculos de densidade
 * 
 * @param zone Zona com bounding box
 * @returns Área em km² (aproximada)
 */
export function calculateZoneAreaKm2(zone: RiskZone): number {
  if (!zone.bbox) {
    return 0;
  }

  const latDiff = zone.bbox.maxLat - zone.bbox.minLat;
  const lonDiff = zone.bbox.maxLon - zone.bbox.minLon;
  
  // Aproximação: 1 grau ≈ 111 km (varia com latitude)
  const avgLat = (zone.bbox.minLat + zone.bbox.maxLat) / 2;
  const latKmPerDegree = 111;
  const lonKmPerDegree = 111 * Math.cos(avgLat * Math.PI / 180);
  
  const areaKm2 = (latDiff * latKmPerDegree) * (lonDiff * lonKmPerDegree);
  
  return Math.round(areaKm2 * 100) / 100; // 2 casas decimais
}

/**
 * Encontra zona que contém uma coordenada específica
 * Útil para mapear elementos OSM para zonas
 * 
 * @param zones Array de zonas
 * @param coordinate Coordenada a localizar
 * @returns Zona que contém a coordenada ou null
 */
export function findZoneContainingPoint(
  zones: RiskZone[], 
  coordinate: Coordinates
): RiskZone | null {
  return zones.find(zone => {
    if (!zone.bbox) return false;
    
    return (
      coordinate.lat >= zone.bbox.minLat &&
      coordinate.lat <= zone.bbox.maxLat &&
      coordinate.lon >= zone.bbox.minLon &&
      coordinate.lon <= zone.bbox.maxLon
    );
  }) || null;
}

/**
 * Calcula zonas vizinhas (adjacentes) a uma zona específica
 * Útil para análises de contexto regional
 * 
 * @param zones Array de todas as zonas
 * @param targetZone Zona para encontrar vizinhas
 * @param gridSize Tamanho do grid (ex: 10 para 10x10)
 * @returns Array de zonas vizinhas
 */
export function getNeighboringZones(
  zones: RiskZone[], 
  targetZone: RiskZone, 
  gridSize: number = 10
): RiskZone[] {
  const targetIndex = zones.findIndex(z => z.id === targetZone.id);
  
  if (targetIndex === -1) {
    return [];
  }

  // Calcular posição no grid (linha, coluna)
  const row = Math.floor(targetIndex / gridSize);
  const col = targetIndex % gridSize;

  const neighbors: RiskZone[] = [];

  // Verificar 8 direções (N, NE, E, SE, S, SW, W, NW)
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],  // Linha superior
    [0, -1],           [0, 1],   // Mesma linha
    [1, -1],  [1, 0],  [1, 1]    // Linha inferior
  ];

  for (const [deltaRow, deltaCol] of directions) {
    const neighborRow = row + deltaRow;
    const neighborCol = col + deltaCol;

    // Verificar bounds do grid
    if (
      neighborRow >= 0 && neighborRow < gridSize &&
      neighborCol >= 0 && neighborCol < gridSize
    ) {
      const neighborIndex = neighborRow * gridSize + neighborCol;
      if (neighborIndex < zones.length) {
        neighbors.push(zones[neighborIndex]);
      }
    }
  }

  return neighbors;
}

/**
 * Valida se grid de zonas está correto
 * Verifica cobertura completa, sem gaps ou overlaps
 * 
 * @param zones Array de zonas
 * @param originalBbox Bounding box original
 * @returns Resultado da validação
 */
export function validateZoneGrid(
  zones: RiskZone[], 
  originalBbox: BoundingBox
): {
  isValid: boolean;
  errors: string[];
  coverage: number; // % de cobertura da área original
} {
  const errors: string[] = [];
  
  // Verificar se todas as zonas têm bbox
  const zonesWithoutBbox = zones.filter(z => !z.bbox);
  if (zonesWithoutBbox.length > 0) {
    errors.push(`${zonesWithoutBbox.length} zonas sem bounding box`);
  }

  // Verificar IDs únicos e sequenciais
  const ids = zones.map(z => z.id).sort((a, b) => a - b);
  const expectedIds = Array.from({length: zones.length}, (_, i) => i + 1);
  
  if (JSON.stringify(ids) !== JSON.stringify(expectedIds)) {
    errors.push('IDs das zonas não são sequenciais ou únicos');
  }

  // Calcular cobertura aproximada
  const totalZoneArea = zones.reduce((sum, zone) => sum + calculateZoneAreaKm2(zone), 0);
  const originalArea = calculateZoneAreaKm2({
    id: 0,
    coordinates: { lat: 0, lon: 0 },
    score: 0,
    level: 'BAIXO',
    bbox: originalBbox
  });
  
  const coverage = originalArea > 0 ? (totalZoneArea / originalArea) * 100 : 0;

  // Cobertura deve ser próxima de 100%
  if (Math.abs(coverage - 100) > 5) {
    errors.push(`Cobertura anormal: ${coverage.toFixed(1)}%`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    coverage: Math.round(coverage * 100) / 100
  };
}

/**
 * Função utilitária para debug: exibe estatísticas do grid
 * 
 * @param zones Array de zonas
 * @param originalBbox Bounding box original
 */
export function logGridStatistics(zones: RiskZone[], originalBbox: BoundingBox): void {
  const validation = validateZoneGrid(zones, originalBbox);
  const avgArea = zones.reduce((sum, zone) => sum + calculateZoneAreaKm2(zone), 0) / zones.length;
  
  console.log('📊 Estatísticas do Grid:');
  console.log(`  • Total de zonas: ${zones.length}`);
  console.log(`  • Área média por zona: ${avgArea.toFixed(2)} km²`);
  console.log(`  • Cobertura: ${validation.coverage.toFixed(1)}%`);
  console.log(`  • Válido: ${validation.isValid ? '✅' : '❌'}`);
  
  if (validation.errors.length > 0) {
    console.log('  • Erros:', validation.errors);
  }
}