/**
 * Serviço de geocoding para obter bounding box de municípios
 * Baseado na função buscarBoundingBox() do risco_regional_opensource.js (linha 88-148)
 * 
 * Fluxo: Nominatim (rápido) → Fallback IBGE malha (confiável)
 */

import { BoundingBox } from '@/types';
import { API_ENDPOINTS, API_CONFIG, API_HEADERS } from '@/constants/apiEndpoints';

interface NominatimResponse {
  boundingbox: [string, string, string, string]; // [minLat, maxLat, minLon, maxLon]
  lat: string;
  lon: string;
  display_name: string;
}

interface IBGEMalhaResponse {
  geometry: {
    coordinates: [number, number][][][]; // GeoJSON MultiPolygon: [[[lon, lat], ...], ...]
  };
}

/**
 * Busca bounding box usando Nominatim (OpenStreetMap)
 * Primeira tentativa - mais rápida
 */
async function fetchBoundingBoxNominatim(
  nomeMunicipio: string, 
  uf: string
): Promise<BoundingBox | null> {
  try {
    const query = `${nomeMunicipio}, ${uf}, Brasil`;
    const url = `${API_ENDPOINTS.NOMINATIM}?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`;
    
    console.log('🌍 Buscando bbox via Nominatim:', query);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: API_HEADERS,
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT.NOMINATIM)
    });

    if (!response.ok) {
      throw new Error(`Nominatim HTTP ${response.status}: ${response.statusText}`);
    }

    const data: NominatimResponse[] = await response.json();
    
    if (!data || data.length === 0) {
      console.warn('⚠️ Nominatim: Nenhum resultado encontrado para', query);
      return null;
    }

    const result = data[0];
    const [minLat, maxLat, minLon, maxLon] = result.boundingbox.map(Number);
    
    const bbox: BoundingBox = {
      minLat,
      maxLat,
      minLon,
      maxLon,
      centerLat: Number(result.lat),
      centerLon: Number(result.lon)
    };

    console.log('✅ Nominatim bbox obtido:', bbox);
    return bbox;
    
  } catch (error) {
    console.warn('⚠️ Erro no Nominatim:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Busca bounding box usando API IBGE malha municipal (fallback)
 * Mais confiável para municípios brasileiros
 */
async function fetchBoundingBoxIBGE(codigoIBGE: string): Promise<BoundingBox | null> {
  try {
    const url = `${API_ENDPOINTS.IBGE_MALHA}/${codigoIBGE}?formato=application/vnd.geo+json`;
    
    console.log('🇧🇷 Buscando bbox via IBGE malha:', codigoIBGE);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: API_HEADERS,
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT.IBGE_MALHA)
    });

    if (!response.ok) {
      throw new Error(`IBGE HTTP ${response.status}: ${response.statusText}`);
    }

    const data: IBGEMalhaResponse = await response.json();
    
    if (!data.geometry || !data.geometry.coordinates) {
      throw new Error('Geometria inválida na resposta do IBGE');
    }

    // Extrair bounds de todas as coordenadas do MultiPolygon
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLon = Infinity;
    let maxLon = -Infinity;

    for (const polygon of data.geometry.coordinates) {
      for (const ring of polygon) {
        for (const [lon, lat] of ring) {
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
          minLon = Math.min(minLon, lon);
          maxLon = Math.max(maxLon, lon);
        }
      }
    }

    const bbox: BoundingBox = {
      minLat,
      maxLat,
      minLon,
      maxLon,
      centerLat: (minLat + maxLat) / 2,
      centerLon: (minLon + maxLon) / 2
    };

    console.log('✅ IBGE bbox calculado:', bbox);
    return bbox;
    
  } catch (error) {
    console.error('❌ Erro no IBGE malha:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Função principal para buscar bounding box de um município
 * Implementa o mesmo fluxo do backend: Nominatim → Fallback IBGE
 * 
 * @param nomeMunicipio Nome do município (ex: "Curitiba")
 * @param uf Sigla do estado (ex: "PR") 
 * @param codigoIBGE Código IBGE do município (ex: "4106902")
 * @returns BoundingBox do município ou null se não encontrado
 */
export async function fetchBoundingBox(
  nomeMunicipio: string,
  uf: string,
  codigoIBGE: string
): Promise<BoundingBox | null> {
  console.log(`🗺️ Iniciando busca de bbox para: ${nomeMunicipio}/${uf} (${codigoIBGE})`);
  
  // Tentativa 1: Nominatim (mais rápido)
  let bbox = await fetchBoundingBoxNominatim(nomeMunicipio, uf);
  
  if (bbox) {
    console.log('✅ Bbox obtido via Nominatim');
    return bbox;
  }

  // Tentativa 2: IBGE malha (fallback confiável)
  console.log('🔄 Tentando fallback via IBGE malha...');
  bbox = await fetchBoundingBoxIBGE(codigoIBGE);
  
  if (bbox) {
    console.log('✅ Bbox obtido via IBGE malha');
    return bbox;
  }

  console.error('❌ Falha ao obter bbox por ambos os métodos');
  return null;
}

/**
 * Função utilitária para validar se um bbox é válido geograficamente
 */
export function validateBoundingBox(bbox: BoundingBox): boolean {
  return (
    bbox.minLat < bbox.maxLat &&
    bbox.minLon < bbox.maxLon &&
    bbox.minLat >= -90 && bbox.maxLat <= 90 &&
    bbox.minLon >= -180 && bbox.maxLon <= 180 &&
    !isNaN(bbox.centerLat) && !isNaN(bbox.centerLon)
  );
}