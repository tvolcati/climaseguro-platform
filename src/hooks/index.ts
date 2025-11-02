/**
 * Hooks para cálculo de risco - Exportações centralizadas
 */

export { 
  useRiskCalculation, 
  useRiskCalculationCache, 
  useRiskCalculationStats,
  RISK_CALCULATION_KEYS 
} from './useRiskCalculation';

export { 
  useSimpleRiskCalculation, 
  useRiskCalculationProgress 
} from './useSimpleRiskCalculation';

// Re-export tipos relacionados para conveniência
export type { CalculationProgress, ZoneRiskResult } from '@/types';