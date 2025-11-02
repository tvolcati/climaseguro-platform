/**
 * Hook simplificado para cálculo de risco com configuração automática
 * Para casos de uso mais diretos sem configuração complexa
 */

import { useEffect, useMemo } from 'react';
import { useRiskCalculation } from './useRiskCalculation';
import { ZoneRiskResult } from '@/types';

interface UseSimpleRiskCalculationOptions {
  /**
   * Código IBGE da cidade
   */
  cityCode: string;
  
  /**
   * UF da cidade 
   */
  cityUF: string;
  
  /**
   * Auto-iniciar cálculo quando o hook é montado
   * @default true
   */
  autoStart?: boolean;
  
  /**
   * Mostrar apenas zonas de alto risco (≥50%)
   * @default true  
   */
  highRiskOnly?: boolean;
  
  /**
   * Callback quando cálculo termina
   */
  onComplete?: (zones: ZoneRiskResult[]) => void;
}

/**
 * Hook simplificado que encapsula useRiskCalculation com configurações padrão
 * Ideal para componentes que só precisam calcular e exibir dados
 */
export function useSimpleRiskCalculation(options: UseSimpleRiskCalculationOptions) {
  const {
    cityCode,
    cityUF,
    autoStart = true,
    highRiskOnly = true,
    onComplete
  } = options;
  
  const riskCalculation = useRiskCalculation({
    filterHighRisk: highRiskOnly,
    enableFallback: true,
    onComplete
  });
  
  // Auto-iniciar cálculo se solicitado
  useEffect(() => {
    if (autoStart && cityCode && cityUF && !riskCalculation.isCalculating) {
      riskCalculation.calculateRisk(cityCode, cityUF);
    }
  }, [cityCode, cityUF, autoStart, riskCalculation]);
  
  // Dados processados para uso direto
  const processedData = useMemo(() => {
    const zones = riskCalculation.filteredZones || [];
    
    return {
      zones,
      isEmpty: zones.length === 0,
      hasHighRisk: zones.some(z => z.scoreNormalizado >= 75),
      averageScore: zones.length > 0 
        ? Math.round(zones.reduce((sum, z) => sum + z.scoreNormalizado, 0) / zones.length)
        : 0,
      topRiskZones: zones.slice(0, 5), // Top 5 zonas mais perigosas
    };
  }, [riskCalculation.filteredZones]);
  
  return {
    // Estados essenciais
    isLoading: riskCalculation.isCalculating,
    isError: riskCalculation.isError,
    error: riskCalculation.error,
    progress: riskCalculation.progress,
    
    // Dados processados
    ...processedData,
    
    // Estatísticas
    stats: riskCalculation.zoneCount,
    
    // Ações básicas
    retry: () => riskCalculation.calculateRisk(cityCode, cityUF),
    refresh: () => {
      riskCalculation.invalidateCache(cityCode, cityUF);
      riskCalculation.calculateRisk(cityCode, cityUF);
    }
  };
}

/**
 * Hook para monitorar progresso de cálculo em tempo real
 * Útil para barras de progresso e feedback visual
 */
export function useRiskCalculationProgress() {
  const riskCalculation = useRiskCalculation();
  
  const progressInfo = useMemo(() => {
    const progress = riskCalculation.progress;
    
    if (!progress) {
      return {
        isActive: false,
        percentage: 0,
        statusText: 'Aguardando...',
        currentStep: null,
        estimatedTimeRemaining: null
      };
    }
    
    let statusText = '';
    switch (progress.status) {
      case 'fetching_data':
        statusText = 'Buscando dados da cidade...';
        break;
      case 'calculating':
        statusText = `Calculando zona ${progress.currentZone || '?'} de ${progress.total}`;
        break;
      case 'done':
        statusText = 'Cálculo concluído!';
        break;
      case 'error':
        statusText = `Erro: ${progress.error || 'Erro desconhecido'}`;
        break;
      default:
        statusText = 'Processando...';
    }
    
    // Estimativa de tempo baseada no progresso atual
    const estimatedTimeRemaining = progress.completed > 0 && progress.percentage < 100
      ? Math.round(((100 - progress.percentage) / progress.percentage) * 2) // ~2min por cálculo
      : null;
    
    return {
      isActive: progress.status === 'calculating' || progress.status === 'fetching_data',
      percentage: progress.percentage,
      statusText,
      currentStep: progress.currentZone,
      estimatedTimeRemaining,
      hasError: progress.status === 'error'
    };
  }, [riskCalculation.progress]);
  
  return {
    ...progressInfo,
    reset: riskCalculation.reset
  };
}