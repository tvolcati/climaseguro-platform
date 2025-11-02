/**
 * Hook customizado para cálculo de risco de cidade com cache e progress
 * Usa TanStack Query para otimização de cache e gerenciamento de estado
 * 
 * Baseado na investigação do INTEGRACAO_CALCULO_RISCO.md
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { ZoneRiskResult, CalculationProgress } from '@/types';
import { calculateCityRisk, calculateCityRiskWithFallback } from '@/services/riskCalculation';
import { filterZonesForDisplay } from '@/utils/riskClassification';

// Chaves para cache do TanStack Query
export const RISK_CALCULATION_KEYS = {
  cityRisk: (cityCode: string, cityUF: string) => ['cityRisk', cityCode, cityUF] as const,
  allCalculations: () => ['cityRisk'] as const,
};

// Configuração do cache (30 minutos para cálculos completos)
const CACHE_TIME = 30 * 60 * 1000; // 30min
const STALE_TIME = 10 * 60 * 1000; // 10min

interface UseRiskCalculationOptions {
  /**
   * Filtrar apenas zonas com risco ≥50% (Alto/Muito Alto)
   * @default true
   */
  filterHighRisk?: boolean;
  
  /**
   * Tentar fallback em caso de erro
   * @default true
   */
  enableFallback?: boolean;
  
  /**
   * Callback customizado para progresso
   */
  onProgress?: (progress: CalculationProgress) => void;
  
  /**
   * Callback para quando cálculo é concluído
   */
  onComplete?: (zones: ZoneRiskResult[]) => void;
  
  /**
   * Callback para erros
   */
  onError?: (error: Error) => void;
}

interface UseRiskCalculationReturn {
  // Estado do cálculo
  isCalculating: boolean;
  isError: boolean;
  error: Error | null;
  progress: CalculationProgress | null;
  
  // Dados
  zones: ZoneRiskResult[] | null;
  filteredZones: ZoneRiskResult[] | null; // Apenas ≥50% se filterHighRisk=true
  zoneCount: {
    total: number;
    high: number; // ≥50%
    veryHigh: number; // ≥75%
  };
  
  // Ações
  calculateRisk: (cityCode: string, cityUF: string) => void;
  reset: () => void;
  invalidateCache: (cityCode?: string, cityUF?: string) => void;
  
  // Cache status
  isCached: boolean;
  cacheAge: number | null; // Em minutos
}

/**
 * Hook principal para cálculo de risco de cidade
 */
export function useRiskCalculation(options: UseRiskCalculationOptions = {}): UseRiskCalculationReturn {
  const {
    filterHighRisk = true,
    enableFallback = true,
    onProgress,
    onComplete,
    onError
  } = options;
  
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<CalculationProgress | null>(null);
  const [currentCalculation, setCurrentCalculation] = useState<{ cityCode: string; cityUF: string } | null>(null);
  
  // Progress handler que combina estado local + callback externo
  const handleProgress = useCallback((progressData: CalculationProgress) => {
    setProgress(progressData);
    onProgress?.(progressData);
  }, [onProgress]);
  
  // Mutation para cálculo de risco (operação assíncrona longa)
  const calculateMutation = useMutation({
    mutationFn: async ({ cityCode, cityUF }: { cityCode: string; cityUF: string }) => {
      console.log(`🚀 Iniciando cálculo de risco para ${cityCode}/${cityUF}`);
      setCurrentCalculation({ cityCode, cityUF });
      
      const calculationFn = enableFallback ? calculateCityRiskWithFallback : calculateCityRisk;
      const zones = await calculationFn(cityCode, cityUF, handleProgress);
      
      console.log(`✅ Cálculo concluído: ${zones.length} zonas processadas`);
      return zones;
    },
    onSuccess: (zones, { cityCode, cityUF }) => {
      // Armazenar no cache do TanStack Query
      queryClient.setQueryData(RISK_CALCULATION_KEYS.cityRisk(cityCode, cityUF), zones);
      
      // Callback externo
      onComplete?.(zones);
      
      // Reset estado de progresso
      setProgress(null);
      setCurrentCalculation(null);
    },
    onError: (error: Error) => {
      console.error('❌ Erro no cálculo de risco:', error);
      onError?.(error);
      
      // Reset estado
      setProgress(null);
      setCurrentCalculation(null);
    }
  });
  
  // Query para buscar dados do cache (se existir)
  const cacheQuery = useQuery({
    queryKey: currentCalculation 
      ? RISK_CALCULATION_KEYS.cityRisk(currentCalculation.cityCode, currentCalculation.cityUF)
      : ['empty'],
    queryFn: () => null, // Não executar fetch, só ler cache
    enabled: false, // Só ler cache, nunca fazer network request
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME
  });
  
  // Dados derivados
  const zones = calculateMutation.data || cacheQuery.data || null;
  
  const filteredZones = zones && filterHighRisk 
    ? filterZonesForDisplay(zones)
    : zones;
  
  const zoneCount = zones ? {
    total: zones.length,
    high: zones.filter(z => z.scoreNormalizado >= 50).length,
    veryHigh: zones.filter(z => z.scoreNormalizado >= 75).length
  } : { total: 0, high: 0, veryHigh: 0 };
  
  // Status do cache
  const isCached = !!cacheQuery.data && !calculateMutation.isPending;
  const cacheAge = cacheQuery.dataUpdatedAt 
    ? Math.floor((Date.now() - cacheQuery.dataUpdatedAt) / (1000 * 60))
    : null;
  
  // Ações
  const calculateRisk = useCallback((cityCode: string, cityUF: string) => {
    // Verificar se já existe no cache
    const cachedData = queryClient.getQueryData(RISK_CALCULATION_KEYS.cityRisk(cityCode, cityUF));
    
    if (cachedData) {
      console.log(`📦 Dados encontrados no cache para ${cityCode}/${cityUF}`);
      setCurrentCalculation({ cityCode, cityUF });
      return;
    }
    
    // Iniciar cálculo
    calculateMutation.mutate({ cityCode, cityUF });
  }, [calculateMutation, queryClient]);
  
  const reset = useCallback(() => {
    calculateMutation.reset();
    setProgress(null);
    setCurrentCalculation(null);
  }, [calculateMutation]);
  
  const invalidateCache = useCallback((cityCode?: string, cityUF?: string) => {
    if (cityCode && cityUF) {
      queryClient.invalidateQueries({
        queryKey: RISK_CALCULATION_KEYS.cityRisk(cityCode, cityUF)
      });
    } else {
      queryClient.invalidateQueries({
        queryKey: RISK_CALCULATION_KEYS.allCalculations()
      });
    }
  }, [queryClient]);
  
  return {
    // Estado
    isCalculating: calculateMutation.isPending,
    isError: calculateMutation.isError,
    error: calculateMutation.error,
    progress,
    
    // Dados
    zones,
    filteredZones,
    zoneCount,
    
    // Ações
    calculateRisk,
    reset,
    invalidateCache,
    
    // Cache
    isCached,
    cacheAge
  };
}

/**
 * Hook simplificado para buscar dados já calculados do cache
 * Útil para componentes que só precisam ler dados existentes
 */
export function useRiskCalculationCache(cityCode: string, cityUF: string) {
  const queryClient = useQueryClient();
  
  const data = queryClient.getQueryData(RISK_CALCULATION_KEYS.cityRisk(cityCode, cityUF)) as ZoneRiskResult[] | undefined;
  
  return {
    zones: data || null,
    isAvailable: !!data,
    filteredZones: data ? filterZonesForDisplay(data) : null
  };
}

/**
 * Hook para estatísticas globais de cálculos
 * Útil para dashboards administrativos
 */
export function useRiskCalculationStats() {
  const queryClient = useQueryClient();
  
  // Buscar todas as chaves de cálculo no cache
  const allQueries = queryClient.getQueryCache().findAll({
    queryKey: RISK_CALCULATION_KEYS.allCalculations()
  });
  
  const stats = {
    totalCalculations: allQueries.length,
    totalZones: allQueries.reduce((sum, query) => {
      const data = query.state.data as ZoneRiskResult[] | undefined;
      return sum + (data?.length || 0);
    }, 0),
    cacheSize: allQueries.reduce((size, query) => {
      return size + (JSON.stringify(query.state.data || {}).length / 1024); // KB
    }, 0)
  };
  
  return stats;
}