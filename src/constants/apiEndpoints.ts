/**
 * URLs das APIs externas utilizadas no cálculo de risco
 * Baseado no arquivo risco_regional_opensource.js (linha 13-24)
 */

export const API_ENDPOINTS = {
  INMET_AVISOS: 'https://apiprevmet3.inmet.gov.br/avisos/ativos',
  IBGE_MALHA: 'https://servicodados.ibge.gov.br/api/v3/malhas/municipios',
  OVERPASS_API: 'https://overpass-api.de/api/interpreter',
  OPEN_ELEVATION: 'https://api.open-elevation.com/api/v1/lookup',
  NOMINATIM: 'https://nominatim.openstreetmap.org/search'
} as const;

/**
 * Configurações de timeout e retry para cada API
 */
export const API_CONFIG = {
  TIMEOUT: {
    NOMINATIM: 10000,        // 10s - API rápida
    IBGE_MALHA: 15000,       // 15s - pode ser lenta
    OVERPASS: 30000,         // 30s - muito lenta, queries complexas
    OPEN_ELEVATION: 20000,   // 20s - depende do número de pontos
    INMET: 10000            // 10s - geralmente rápida
  },
  RETRY: {
    MAX_ATTEMPTS: 3,
    BACKOFF_MS: 1000        // 1s, 2s, 4s
  }
} as const;

/**
 * Headers padrão para as APIs
 */
export const API_HEADERS = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'User-Agent': 'ClimaSeguro/1.0 (Risk Assessment Platform)'
} as const;