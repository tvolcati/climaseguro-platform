/**
 * Histórico de desastres por estado brasileiro
 * Baseado no arquivo risco_regional_opensource.js (linha 70-82)
 * 
 * Valores representam a incidência histórica de desastres naturais
 * Escala: 0.0 (menor risco) a 1.0 (maior risco)
 */

export const HISTORICO_DESASTRES = {
  'RJ': 0.9,   // Rio de Janeiro - Alto risco (chuvas, deslizamentos)
  'SP': 0.7,   // São Paulo - Médio-alto risco
  'SC': 0.85,  // Santa Catarina - Alto risco (enchentes, ciclones)
  'MG': 0.6,   // Minas Gerais - Médio risco
  'BA': 0.5,   // Bahia - Médio risco
  'PE': 0.6,   // Pernambuco - Médio risco
  'AL': 0.7,   // Alagoas - Médio-alto risco
  'ES': 0.65,  // Espírito Santo - Médio-alto risco
  'PR': 0.55   // Paraná - Médio risco
} as const;

/**
 * Função helper para obter fator histórico por UF
 * Retorna 0.5 (médio) para estados não mapeados
 */
export function getHistoricalDisasterFactor(uf: string): number {
  return HISTORICO_DESASTRES[uf as keyof typeof HISTORICO_DESASTRES] ?? 0.5;
}

/**
 * Lista de estados cobertos pelo sistema
 */
export const ESTADOS_COBERTOS = Object.keys(HISTORICO_DESASTRES) as Array<keyof typeof HISTORICO_DESASTRES>;

/**
 * Metadados sobre os dados históricos
 */
export const METADATA_HISTORICO = {
  fonte: 'Sistema Nacional de Proteção e Defesa Civil (SINPDEC)',
  periodoAnalise: '2010-2023',
  ultimaAtualizacao: '2024-01-15',
  observacoes: 'Fatores baseados em frequência e severidade de eventos registrados'
} as const;

/**
 * Classificação de risco por faixa
 */
export const CLASSIFICACAO_HISTORICO = {
  MUITO_BAIXO: { min: 0.0, max: 0.3 },
  BAIXO: { min: 0.3, max: 0.5 },
  MEDIO: { min: 0.5, max: 0.7 },
  ALTO: { min: 0.7, max: 0.85 },
  MUITO_ALTO: { min: 0.85, max: 1.0 }
} as const;