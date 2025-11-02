/**
 * Pesos de risco para cálculo de score de zona
 * Baseado no arquivo risco_regional_opensource.js (linha 33-64)
 * 
 * IMPORTANTE: Manter valores idênticos ao backend para consistência
 */

export const PESOS_RISCO = {
  DECLIVIDADE: {
    PLANO: 0.1,        // 0-3%
    SUAVE: 0.3,        // 3-8%
    ONDULADO: 0.6,     // 8-20%
    FORTE: 0.85,       // 20-45%
    MONTANHOSO: 1.0    // >45%
  },
  DISTANCIA_RIO: {
    MUITO_PERTO: 1.0,  // <50m
    PERTO: 0.8,        // 50-100m
    PROXIMO: 0.5,      // 100-300m
    MEDIO: 0.2,        // 300-500m
    LONGE: 0.0         // >500m
  },
  DENSIDADE_URBANA: {
    MUITO_ALTA: 1.0,   // >80% construído
    ALTA: 0.75,        // 60-80%
    MEDIA: 0.5,        // 40-60%
    BAIXA: 0.25,       // 20-40%
    RURAL: 0.1         // <20%
  },
  VEGETACAO: {
    SEM_VEGETACAO: 1.0,  // 0-10% verde
    BAIXA: 0.7,          // 10-30%
    MEDIA: 0.4,          // 30-50%
    ALTA: 0.15,          // 50-70%
    MUITO_ALTA: 0.05     // >70%
  },
  TIPO_VIA: {
    TERRA: 1.0,
    CALCAMENTO: 0.7,
    ASFALTO_SEM_DRENO: 0.6,
    ASFALTO_COM_DRENO: 0.2
  }
} as const;

/**
 * Pesos relativos dos fatores no cálculo final
 * Total deve somar 1.0 (100%)
 */
export const PESO_FATORES = {
  HISTORICO: 0.20,      // 20%
  DECLIVIDADE: 0.30,    // 30%
  RIOS: 0.25,           // 25%
  URBANIZACAO: 0.15,    // 15%
  VEGETACAO: 0.10       // 10%
} as const;

/**
 * Thresholds para classificação de declividade (percentual)
 */
export const THRESHOLDS_DECLIVIDADE = {
  PLANO: { min: 0, max: 3 },
  SUAVE: { min: 3, max: 8 },
  ONDULADO: { min: 8, max: 20 },
  FORTE: { min: 20, max: 45 },
  MONTANHOSO: { min: 45, max: Infinity }
} as const;

/**
 * Thresholds para classificação de distância de rios (metros)
 */
export const THRESHOLDS_DISTANCIA_RIO = {
  MUITO_PERTO: { min: 0, max: 50 },
  PERTO: { min: 50, max: 100 },
  PROXIMO: { min: 100, max: 300 },
  MEDIO: { min: 300, max: 500 },
  LONGE: { min: 500, max: Infinity }
} as const;

/**
 * Thresholds para densidade urbana (percentual de construções)
 */
export const THRESHOLDS_DENSIDADE_URBANA = {
  RURAL: { min: 0, max: 20 },
  BAIXA: { min: 20, max: 40 },
  MEDIA: { min: 40, max: 60 },
  ALTA: { min: 60, max: 80 },
  MUITO_ALTA: { min: 80, max: 100 }
} as const;

/**
 * Thresholds para cobertura vegetal (percentual de áreas verdes)
 */
export const THRESHOLDS_VEGETACAO = {
  SEM_VEGETACAO: { min: 0, max: 10 },
  BAIXA: { min: 10, max: 30 },
  MEDIA: { min: 30, max: 50 },
  ALTA: { min: 50, max: 70 },
  MUITO_ALTA: { min: 70, max: 100 }
} as const;