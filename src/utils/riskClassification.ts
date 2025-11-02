/**
 * Utilitários para classificação de risco
 * Baseado na função classificarRisco() do risco_regional_opensource.js (linha 414-420)
 * 
 * MODIFICADO: Thresholds ajustados conforme requisito:
 * - ≥75%: "MUITO ALTO" (nova categoria)
 * - ≥50%: "ALTO" 
 * - <50%: filtrado (não exibido)
 */

import { RiskClassification, RiskLevel } from '@/types';

/**
 * Classifica risco baseado no score numérico
 * Implementa novos thresholds conforme especificação do projeto
 * 
 * @param score Score de risco (0-100)
 * @returns Classificação completa com nível, cor e prioridade
 */
export function classifyRisk(score: number): RiskClassification {
  // Validar entrada
  if (typeof score !== 'number' || isNaN(score)) {
    console.warn('⚠️ Score inválido para classificação:', score);
    return {
      nivel: '❓ INDETERMINADO',
      cor: '#6b7280', // gray-500
      prioridade: 0
    };
  }

  // Normalizar score para 0-100
  const normalizedScore = Math.max(0, Math.min(100, score));

  // Aplicar novos thresholds conforme requisito
  if (normalizedScore >= 75) {
    return {
      nivel: '🔴 MUITO ALTO',
      cor: '#991b1b', // red-800 - mais escuro que o ALTO
      prioridade: 5
    };
  } else if (normalizedScore >= 50) {
    return {
      nivel: '🟠 ALTO', 
      cor: '#ea580c', // orange-600
      prioridade: 4
    };
  } else if (normalizedScore >= 30) {
    return {
      nivel: '🟡 MODERADO',
      cor: '#d97706', // amber-600  
      prioridade: 3
    };
  } else if (normalizedScore >= 15) {
    return {
      nivel: '🟢 BAIXO',
      cor: '#16a34a', // green-600
      prioridade: 2
    };
  } else {
    return {
      nivel: '🔵 MUITO BAIXO',
      cor: '#2563eb', // blue-600
      prioridade: 1
    };
  }
}

/**
 * Converte score para RiskLevel enum (compatibilidade)
 * 
 * @param score Score de risco (0-100)
 * @returns RiskLevel enum
 */
export function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 75) return 'MUITO_ALTO';
  if (score >= 50) return 'ALTO';
  if (score >= 30) return 'MODERADO';
  return 'BAIXO';
}

/**
 * Filtra zonas que devem ser exibidas conforme requisito
 * Só mostra zonas com score ≥50% (ALTO e MUITO ALTO)
 * 
 * @param zones Array de zonas com scores
 * @returns Zonas filtradas para exibição
 */
export function filterZonesForDisplay<T extends { score: number }>(zones: T[]): T[] {
  const filteredZones = zones.filter(zone => zone.score >= 50);
  
  console.log(`🔍 Filtro de exibição: ${filteredZones.length}/${zones.length} zonas (≥50%)`);
  
  return filteredZones;
}

/**
 * Gera estatísticas de distribuição de risco
 * Útil para dashboards e relatórios
 * 
 * @param scores Array de scores
 * @returns Estatísticas de distribuição
 */
export function getRiskDistributionStats(scores: number[]): {
  total: number;
  muitoAlto: number;
  alto: number;
  moderado: number;
  baixo: number;
  muitoBaixo: number;
  percentages: {
    muitoAlto: number;
    alto: number;
    moderado: number;
    baixo: number;
    muitoBaixo: number;
  };
  averageScore: number;
  maxScore: number;
  minScore: number;
} {
  if (scores.length === 0) {
    return {
      total: 0,
      muitoAlto: 0,
      alto: 0,
      moderado: 0,
      baixo: 0,
      muitoBaixo: 0,
      percentages: { muitoAlto: 0, alto: 0, moderado: 0, baixo: 0, muitoBaixo: 0 },
      averageScore: 0,
      maxScore: 0,
      minScore: 0
    };
  }

  const counts = {
    muitoAlto: 0,
    alto: 0,
    moderado: 0,
    baixo: 0,
    muitoBaixo: 0
  };

  // Contar por categoria
  scores.forEach(score => {
    if (score >= 75) counts.muitoAlto++;
    else if (score >= 50) counts.alto++;
    else if (score >= 30) counts.moderado++;
    else if (score >= 15) counts.baixo++;
    else counts.muitoBaixo++;
  });

  // Calcular percentuais
  const total = scores.length;
  const percentages = {
    muitoAlto: (counts.muitoAlto / total) * 100,
    alto: (counts.alto / total) * 100,
    moderado: (counts.moderado / total) * 100,
    baixo: (counts.baixo / total) * 100,
    muitoBaixo: (counts.muitoBaixo / total) * 100
  };

  // Estatísticas gerais
  const sum = scores.reduce((acc, score) => acc + score, 0);
  const averageScore = sum / total;
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);

  return {
    total,
    ...counts,
    percentages: {
      muitoAlto: Math.round(percentages.muitoAlto * 100) / 100,
      alto: Math.round(percentages.alto * 100) / 100,
      moderado: Math.round(percentages.moderado * 100) / 100,
      baixo: Math.round(percentages.baixo * 100) / 100,
      muitoBaixo: Math.round(percentages.muitoBaixo * 100) / 100
    },
    averageScore: Math.round(averageScore * 100) / 100,
    maxScore: Math.round(maxScore * 100) / 100,
    minScore: Math.round(minScore * 100) / 100
  };
}

/**
 * Converte classificação para cor CSS compatível com Map.tsx
 * Mantém compatibilidade com lógica existente do mapa
 * 
 * @param score Score de risco (0-100)
 * @returns Cor hexadecimal para exibição
 */
export function getMapColor(score: number): string {
  // Usar mesma lógica do Map.tsx existente, mas com novos thresholds
  if (score >= 75) return '#991b1b'; // red-800 (MUITO ALTO)
  if (score >= 50) return '#ea580c'; // orange-600 (ALTO)
  if (score >= 30) return '#d97706'; // amber-600 (MODERADO)
  return '#16a34a'; // green-600 (BAIXO)
}

/**
 * Gera descrição textual do risco para UX
 * 
 * @param score Score de risco (0-100)
 * @returns Descrição legível do nível de risco
 */
export function getRiskDescription(score: number): string {
  const classification = classifyRisk(score);
  
  if (score >= 75) {
    return 'Risco muito alto de desastres naturais. Ação imediata necessária.';
  } else if (score >= 50) {
    return 'Risco alto de desastres naturais. Medidas preventivas recomendadas.';
  } else if (score >= 30) {
    return 'Risco moderado. Monitoramento e preparação adequados.';
  } else if (score >= 15) {
    return 'Risco baixo. Manutenção de medidas preventivas básicas.';
  } else {
    return 'Risco muito baixo. Área relativamente segura.';
  }
}

/**
 * Valida se score está dentro dos limites esperados
 * 
 * @param score Score a validar
 * @returns true se válido, false caso contrário
 */
export function isValidScore(score: number): boolean {
  return (
    typeof score === 'number' &&
    !isNaN(score) &&
    score >= 0 &&
    score <= 100
  );
}

/**
 * Normaliza score para garantir que está no range 0-100
 * 
 * @param score Score original
 * @returns Score normalizado (0-100)
 */
export function normalizeScore(score: number): number {
  if (!isValidScore(score)) {
    console.warn('⚠️ Score inválido normalizado para 0:', score);
    return 0;
  }
  
  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
}

/**
 * Função para debug: mostra distribuição de uma lista de scores
 * 
 * @param scores Array de scores
 * @param label Label para identificar o contexto
 */
export function logRiskDistribution(scores: number[], label: string = 'Scores'): void {
  const stats = getRiskDistributionStats(scores);
  
  console.log(`📊 Distribuição de Risco - ${label}:`);
  console.log(`  • Total: ${stats.total}`);
  console.log(`  • Muito Alto (≥75%): ${stats.muitoAlto} (${stats.percentages.muitoAlto}%)`);
  console.log(`  • Alto (≥50%): ${stats.alto} (${stats.percentages.alto}%)`);
  console.log(`  • Moderado (≥30%): ${stats.moderado} (${stats.percentages.moderado}%)`);
  console.log(`  • Baixo (<30%): ${stats.baixo + stats.muitoBaixo} (${(stats.percentages.baixo + stats.percentages.muitoBaixo).toFixed(1)}%)`);
  console.log(`  • Média: ${stats.averageScore}`);
  console.log(`  • Range: ${stats.minScore} - ${stats.maxScore}`);
}