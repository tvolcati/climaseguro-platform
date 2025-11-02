/**
 * Utilitários para geração de recomendações de segurança
 * Baseado na função gerarRecomendacoes() do risco_regional_opensource.js (linha 426-478)
 * 
 * SIMPLIFICADO: Versão inicial com lógica básica, pode ser expandida posteriormente
 */

import { RiskFactor, ZoneRiskResult } from '@/types';

/**
 * Gera recomendações baseadas no resultado do cálculo de risco
 * Implementa lógica simplificada baseada nos fatores predominantes
 * 
 * @param zoneResult Resultado completo do cálculo de risco
 * @returns Array de recomendações específicas
 */
export function generateRecommendations(zoneResult: ZoneRiskResult): string[] {
  const recommendations: string[] = [];
  const { scoreNormalizado, fatores, declividade } = zoneResult;

  // Recomendações baseadas no score geral
  if (scoreNormalizado >= 75) {
    recommendations.push('🚨 URGENTE: Implementar plano de evacuação imediato');
    recommendations.push('📋 Elaborar estudo geotécnico detalhado da área');
    recommendations.push('🏗️ Considerar relocação de estruturas críticas');
  } else if (scoreNormalizado >= 50) {
    recommendations.push('⚠️ Estabelecer sistema de monitoramento contínuo');
    recommendations.push('🔧 Implementar medidas de contenção preventivas');
    recommendations.push('📱 Instalar sistema de alerta precoce');
  }

  // Recomendações baseadas em fatores específicos
  fatores.forEach(fator => {
    const peso = fator.peso || 0;
    const valor = typeof fator.valor === 'number' ? fator.valor : 0;

    switch (fator.nome.toLowerCase()) {
      case 'declividade':
      case 'terreno':
        if (peso > 0.8) {
          recommendations.push('🏔️ Instalar sistema de drenagem em encostas');
          recommendations.push('🌱 Implementar cobertura vegetal para estabilização');
          recommendations.push('🔍 Monitorar sinais de movimento do solo');
        }
        break;

      case 'rios':
      case 'proximidade_rios':
        if (peso > 0.7) {
          recommendations.push('🌊 Construir barreiras de contenção fluvial');
          recommendations.push('🚰 Melhorar sistema de drenagem urbana');
          recommendations.push('📏 Manter faixa de proteção de cursos d\'água');
        }
        break;

      case 'densidade_urbana':
      case 'urbanizacao':
        if (peso > 0.7) {
          recommendations.push('🏘️ Implementar zoneamento urbano adequado');
          recommendations.push('🛣️ Melhorar infraestrutura de escoamento');
          recommendations.push('🌳 Criar áreas verdes para absorção de chuva');
        }
        break;

      case 'vegetacao':
        if (peso > 0.8) {
          recommendations.push('🌿 URGENTE: Programa de reflorestamento');
          recommendations.push('🌳 Controlar desmatamento na região');
          recommendations.push('💧 Implementar sistema de retenção de água');
        }
        break;

      case 'historico':
        if (peso > 0.8) {
          recommendations.push('📚 Estudar padrões históricos de desastres');
          recommendations.push('🏠 Reforçar construções existentes');
          recommendations.push('👥 Treinar população para emergências');
        }
        break;
    }
  });

  // Recomendações baseadas em declividade específica
  if (declividade > 30) {
    recommendations.push('⛰️ Evitar construções em áreas de alta declividade');
    recommendations.push('🔨 Implementar técnicas de engenharia de encostas');
  } else if (declividade > 15) {
    recommendations.push('📐 Seguir normas técnicas para construção em declive');
  }

  // Recomendações gerais sempre aplicáveis
  recommendations.push('📞 Manter contatos de emergência atualizados');
  recommendations.push('🎒 Preparar kit de emergência familiar');

  // Remover duplicatas e limitar quantidade
  const uniqueRecommendations = [...new Set(recommendations)];
  
  console.log(`💡 ${uniqueRecommendations.length} recomendações geradas para zona ${zoneResult.id}`);
  
  return uniqueRecommendations.slice(0, 8); // Máximo 8 recomendações
}

/**
 * Gera recomendações rápidas baseadas apenas no score
 * Útil para exibição em tooltips ou cards compactos
 * 
 * @param score Score de risco (0-100)
 * @returns Array de 2-3 recomendações principais
 */
export function generateQuickRecommendations(score: number): string[] {
  if (score >= 75) {
    return [
      '🚨 Plano de evacuação urgente',
      '📋 Estudo geotécnico necessário',
      '🏗️ Avaliar relocação de estruturas'
    ];
  } else if (score >= 50) {
    return [
      '⚠️ Sistema de monitoramento',
      '🔧 Medidas preventivas',
      '📱 Alerta precoce'
    ];
  } else if (score >= 30) {
    return [
      '🔍 Monitoramento periódico',
      '🌳 Manutenção de áreas verdes',
      '📞 Contatos de emergência'
    ];
  } else {
    return [
      '✅ Manter medidas preventivas',
      '🎒 Kit de emergência',
      '👥 Treinamento básico'
    ];
  }
}

/**
 * Gera recomendações específicas para prefeituras
 * Foca em ações governamentais e políticas públicas
 * 
 * @param zoneResult Resultado do cálculo de risco
 * @returns Recomendações para gestão pública
 */
export function generateGovernmentRecommendations(zoneResult: ZoneRiskResult): string[] {
  const recommendations: string[] = [];
  const { scoreNormalizado } = zoneResult;

  if (scoreNormalizado >= 75) {
    recommendations.push('🏛️ Declarar área de risco e implementar medidas emergenciais');
    recommendations.push('💰 Aprovar orçamento para obras de contenção');
    recommendations.push('📜 Revisar legislação de uso do solo');
    recommendations.push('🚑 Ampliar capacidade de resposta a emergências');
  } else if (scoreNormalizado >= 50) {
    recommendations.push('📊 Incluir área no plano diretor de riscos');
    recommendations.push('🏗️ Licenciar obras com critérios rigorosos');
    recommendations.push('💡 Investir em infraestrutura preventiva');
    recommendations.push('🎓 Programas educativos sobre riscos');
  }

  // Recomendações gerais para gestão pública
  recommendations.push('📈 Integrar dados no sistema municipal de riscos');
  recommendations.push('🤝 Parcerias com defesa civil estadual');
  recommendations.push('💻 Modernizar sistemas de monitoramento');
  
  return recommendations.slice(0, 6);
}

/**
 * Prioriza recomendações por urgência e impacto
 * 
 * @param recommendations Array de recomendações
 * @param score Score de risco para contexto
 * @returns Recomendações ordenadas por prioridade
 */
export function prioritizeRecommendations(
  recommendations: string[], 
  score: number
): { priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'; text: string }[] {
  const urgentKeywords = ['urgente', 'imediato', 'evacuação', 'emergencial'];
  const highKeywords = ['sistema', 'monitoramento', 'contenção', 'alerta'];
  const mediumKeywords = ['implementar', 'melhorar', 'instalar'];

  return recommendations.map(rec => {
    const recLower = rec.toLowerCase();
    
    if (score >= 75 || urgentKeywords.some(keyword => recLower.includes(keyword))) {
      return { priority: 'URGENT' as const, text: rec };
    } else if (score >= 50 || highKeywords.some(keyword => recLower.includes(keyword))) {
      return { priority: 'HIGH' as const, text: rec };
    } else if (mediumKeywords.some(keyword => recLower.includes(keyword))) {
      return { priority: 'MEDIUM' as const, text: rec };
    } else {
      return { priority: 'LOW' as const, text: rec };
    }
  }).sort((a, b) => {
    const priorityOrder = { 'URGENT': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

/**
 * Formata recomendações para exibição em diferentes contextos
 * 
 * @param recommendations Array de recomendações
 * @param format Formato de saída
 * @returns Recomendações formatadas
 */
export function formatRecommendations(
  recommendations: string[],
  format: 'bullets' | 'numbered' | 'cards' | 'plain' = 'bullets'
): string[] {
  switch (format) {
    case 'numbered':
      return recommendations.map((rec, index) => `${index + 1}. ${rec}`);
    
    case 'cards':
      return recommendations.map(rec => `📋 ${rec}`);
    
    case 'plain':
      return recommendations.map(rec => rec.replace(/^[🚨⚠️🔧📱🏔️🌊🏘️🌿📚⛰️📐📞🎒✅🔍🌳👥🏛️💰📜🚑📊🏗️💡🎓📈🤝💻]\s*/, ''));
    
    case 'bullets':
    default:
      return recommendations.map(rec => `• ${rec}`);
  }
}

/**
 * Função utilitária para debug: log de recomendações geradas
 * 
 * @param recommendations Array de recomendações
 * @param context Contexto para identificação
 */
export function logRecommendations(recommendations: string[], context: string = 'Zona'): void {
  console.log(`💡 Recomendações para ${context}:`);
  recommendations.forEach((rec, index) => {
    console.log(`  ${index + 1}. ${rec}`);
  });
}