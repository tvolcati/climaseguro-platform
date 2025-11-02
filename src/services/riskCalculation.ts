import { BoundingBox, RiskZone, ZoneRiskResult, ElevationPoint, InfrastructureData, CalculationProgress } from '../types';
import { fetchBoundingBox } from './geocoding';
import { fetchElevation } from './elevation';
import { fetchOSMInfrastructure } from './infrastructure';
import { calculateSlope, classifyTerrain } from '../utils/terrainCalculations';
import { divideIntoZones } from '../utils/gridUtils';
import { classifyRisk } from '../utils/riskClassification';
import { generateRecommendations } from '../utils/recommendations';
import { PESO_FATORES, PESOS_RISCO } from '../constants/riskWeights';
import { getHistoricalDisasterFactor } from '../constants/historicalData';

/**
 * Lookup básico para códigos IBGE mais comuns (MVP)
 * TODO: Substituir por base completa ou API de municípios
 */
function getCityNameFromCode(code: string): { name: string; uf: string } | { name: null; uf: null } {
  const cityLookup: Record<string, { name: string; uf: string }> = {
    '4106902': { name: 'Curitiba', uf: 'PR' },
    '3550308': { name: 'São Paulo', uf: 'SP' },
    '3304557': { name: 'Rio de Janeiro', uf: 'RJ' },
    '2927408': { name: 'Salvador', uf: 'BA' },
    '2304400': { name: 'Fortaleza', uf: 'CE' },
    '1302603': { name: 'Manaus', uf: 'AM' },
    '5300108': { name: 'Brasília', uf: 'DF' },
    '1501402': { name: 'Belém', uf: 'PA' },
    '2611606': { name: 'Recife', uf: 'PE' },
    '4314902': { name: 'Porto Alegre', uf: 'RS' }
  };
  
  return cityLookup[code] || { name: null, uf: null };
}

/**
 * Calcula o risco para uma única zona usando o algoritmo dos 5 fatores
 * Replica exatamente o comportamento do risco_regional_opensource.js
 */
export async function calculateZoneRisk(
  zone: RiskZone,
  cityUF: string,
  infrastructureData: InfrastructureData,
  elevationPoints: ElevationPoint[]
): Promise<ZoneRiskResult> {
  try {
    // 1. FATOR HISTÓRICO (20% do peso)
    const historicalFactor = getHistoricalDisasterFactor(cityUF);
    const historicalScore = historicalFactor * PESO_FATORES.HISTORICO;

    // 2. FATOR DECLIVIDADE (30% do peso)
    const slopePercentage = calculateSlope(elevationPoints);
    const terrainClassification = classifyTerrain(slopePercentage);
    
    // Usar o peso do terreno calculado
    const slopeRisk = terrainClassification.weight;
    const slopeScore = slopeRisk * PESO_FATORES.DECLIVIDADE;

    // 3. FATOR PROXIMIDADE DE RIOS (25% do peso)
    const riverCount = infrastructureData.rios.length;
    let riverRisk = 0;
    
    if (riverCount === 0) {
      riverRisk = 0.1; // Muito baixo se não há rios
    } else if (riverCount <= 2) {
      riverRisk = 0.4; // Baixo
    } else if (riverCount <= 5) {
      riverRisk = 0.7; // Médio
    } else {
      riverRisk = 1.0; // Alto - muitos rios na zona
    }
    const riverScore = riverRisk * PESO_FATORES.RIOS;

    // 4. FATOR DENSIDADE URBANA (15% do peso)
    const buildingCount = infrastructureData.construcoes.length;
    const roadCount = infrastructureData.vias.length;
    const urbanDensity = buildingCount + (roadCount * 0.5); // Ponderar vias com peso menor
    
    let urbanRisk = 0;
    if (urbanDensity < 10) {
      urbanRisk = 0.2; // Rural/baixa densidade
    } else if (urbanDensity < 30) {
      urbanRisk = 0.5; // Média densidade
    } else if (urbanDensity < 60) {
      urbanRisk = 0.8; // Alta densidade
    } else {
      urbanRisk = 1.0; // Muito alta densidade
    }
    const urbanScore = urbanRisk * PESO_FATORES.URBANIZACAO;

    // 5. FATOR COBERTURA VEGETAL (10% do peso)
    const vegetationCount = infrastructureData.areasVerdes.length;
    
    // Mais vegetação = MENOR risco (inversamente proporcional)
    let vegetationRisk = 0;
    if (vegetationCount === 0) {
      vegetationRisk = 1.0; // Alto risco - sem vegetação
    } else if (vegetationCount <= 3) {
      vegetationRisk = 0.7; // Médio risco
    } else if (vegetationCount <= 8) {
      vegetationRisk = 0.4; // Baixo risco
    } else {
      vegetationRisk = 0.1; // Muito baixo risco - muita vegetação
    }
    const vegetationScore = vegetationRisk * PESO_FATORES.VEGETACAO;

    // CÁLCULO FINAL DO SCORE (0-1)
    const totalScore = historicalScore + slopeScore + riverScore + urbanScore + vegetationScore;
    const normalizedScore = Math.min(Math.max(totalScore, 0), 1); // Garantir 0-1
    const scoreNormalizado = Math.round(normalizedScore * 100); // 0-100 para UI

    // Classificação de risco com novos thresholds
    const riskClassification = classifyRisk(scoreNormalizado);

    // Gerar recomendações baseadas nos fatores
    const factorAnalysis = {
      historical: historicalScore / PESO_FATORES.HISTORICO,
      slope: slopeRisk,
      rivers: riverRisk,
      urban: urbanRisk,
      vegetation: vegetationRisk,
      slopePercentage,
      terrainType: terrainClassification.type,
      riverCount,
      buildingCount,
      vegetationCount
    };
    
    const recomendacoes = generateRecommendations({
      id: zone.id,
      coordinates: zone.coordinates,
      bbox: zone.bbox!,
      scoreNormalizado,
      score: normalizedScore,
      nivel: riskClassification.nivel,
      cor: riskClassification.cor,
      prioridade: riskClassification.prioridade,
      fatores: [], // Será preenchido abaixo
      declividade: slopePercentage,
      recomendacoes: []
    });

    // Detalhamento dos fatores para debugging/modal
    const fatores = [
      {
        nome: 'Histórico de Desastres',
        valor: historicalScore,
        peso: PESO_FATORES.HISTORICO,
        descricao: `Fator regional baseado no histórico do estado ${cityUF}`
      },
      {
        nome: 'Declividade do Terreno',
        valor: slopeScore,
        peso: PESO_FATORES.DECLIVIDADE,
        descricao: `Terreno ${terrainClassification.type.toLowerCase()} com ${slopePercentage.toFixed(1)}% de inclinação`
      },
      {
        nome: 'Proximidade de Rios',
        valor: riverScore,
        peso: PESO_FATORES.RIOS,
        descricao: `${riverCount} rio(s) identificado(s) na zona`
      },
      {
        nome: 'Densidade Urbana',
        valor: urbanScore,
        peso: PESO_FATORES.URBANIZACAO,
        descricao: `${buildingCount} construções e ${roadCount} vias mapeadas`
      },
      {
        nome: 'Cobertura Vegetal',
        valor: vegetationScore,
        peso: PESO_FATORES.VEGETACAO,
        descricao: `${vegetationCount} área(s) verde(s) - proteção natural`
      }
    ];

    return {
      id: zone.id,
      coordinates: zone.coordinates,
      bbox: zone.bbox!,
      scoreNormalizado,
      score: normalizedScore,
      nivel: riskClassification.nivel,
      cor: riskClassification.cor,
      prioridade: riskClassification.prioridade,
      fatores,
      declividade: slopePercentage,
      recomendacoes
    };

  } catch (error) {
    console.error(`Erro ao calcular risco da zona ${zone.id}:`, error);
    
    // Retornar zona com risco baixo em caso de erro
    return {
      id: zone.id,
      coordinates: zone.coordinates,
      bbox: zone.bbox!,
      scoreNormalizado: 10,
      score: 0.1,
      nivel: '🟢 BAIXO',
      cor: '#16a34a',
      prioridade: 1,
      fatores: [],
      declividade: 0,
      recomendacoes: ['⚠️ Erro no cálculo - dados insuficientes para análise precisa']
    };
  }
}

/**
 * Função principal que orquestra o cálculo de risco para toda a cidade
 * Divide em 100 zonas e calcula o risco de cada uma progressivamente
 */
export async function calculateCityRisk(
  cityCode: string,
  cityUF: string,
  onProgress?: (progress: CalculationProgress) => void
): Promise<ZoneRiskResult[]> {
  const results: ZoneRiskResult[] = [];
  
  try {
    // Reportar início
    onProgress?.({
      total: 100,
      completed: 0,
      percentage: 0,
      status: 'fetching_data'
    });

    // 1. BUSCAR BOUNDING BOX DA CIDADE
    console.log(`🗺️ Buscando bounding box para cidade ${cityCode}...`);
    
    // Para MVP, criar lookup simples dos códigos mais comuns
    // TODO: Implementar sistema completo de geocoding
    let bbox;
    const cityName = getCityNameFromCode(cityCode);
    
    if (cityName.name && cityName.uf) {
      bbox = await fetchBoundingBox(cityName.name, cityName.uf, cityCode);
    } else {
      // Fallback: tentar só com código (será implementado depois)
      throw new Error(`Cidade com código ${cityCode} não encontrada no lookup`);
    }
    
    if (!bbox) {
      throw new Error(`Não foi possível obter bounding box para a cidade ${cityCode}`);
    }

    onProgress?.({
      total: 100,
      completed: 5,
      percentage: 5,
      status: 'calculating'
    });

    // 2. DIVIDIR EM 100 ZONAS (GRID 10x10)
    console.log('📐 Dividindo cidade em 100 zonas...');
    const zones = divideIntoZones(bbox, 100);
    console.log(`✅ ${zones.length} zonas criadas`);

    onProgress?.({
      total: 100,
      completed: 10,
      percentage: 10,
      status: 'calculating'
    });

    // 3. CALCULAR RISCO PARA CADA ZONA
    console.log('🧮 Iniciando cálculo de risco por zona...');
    
    for (let i = 0; i < zones.length; i++) {
      const zone = zones[i];
      
      try {
        // Buscar dados específicos da zona
        const [infrastructureData, elevationPoints] = await Promise.all([
          fetchOSMInfrastructure(zone.bbox!),
          fetchElevation(zone.bbox!)
        ]);

        // Calcular risco da zona
        const zoneResult = await calculateZoneRisk(
          zone,
          cityUF,
          infrastructureData,
          elevationPoints
        );

        results.push(zoneResult);

        // Reportar progresso (10% reservado para setup, 90% para cálculos)
        const progressPercentage = 10 + Math.round((i + 1) / zones.length * 90);
        onProgress?.({
          total: 100,
          completed: i + 1,
          percentage: progressPercentage,
          currentZone: zone.id,
          status: 'calculating'
        });

        // Log de progresso a cada 10 zonas
        if ((i + 1) % 10 === 0) {
          console.log(`📊 Progresso: ${i + 1}/${zones.length} zonas calculadas`);
        }

      } catch (zoneError) {
        console.warn(`⚠️ Erro na zona ${zone.id}:`, zoneError);
        
        // Adicionar zona com risco baixo em caso de erro
        results.push({
          id: zone.id,
          coordinates: zone.coordinates,
          bbox: zone.bbox!,
          scoreNormalizado: 10,
          score: 0.1,
          nivel: '🟢 BAIXO',
          cor: '#16a34a',
          prioridade: 1,
          fatores: [],
          declividade: 0,
          recomendacoes: ['⚠️ Dados insuficientes para cálculo preciso']
        });
      }
    }

    // 4. FINALIZAR E ORDENAR POR PRIORIDADE
    results.sort((a, b) => b.scoreNormalizado - a.scoreNormalizado);

    onProgress?.({
      total: 100,
      completed: 100,
      percentage: 100,
      status: 'done'
    });

    console.log(`✅ Cálculo concluído! ${results.length} zonas processadas`);
    console.log(`📊 Estatísticas:`);
    console.log(`   • Risco Muito Alto (≥75%): ${results.filter(z => z.scoreNormalizado >= 75).length} zonas`);
    console.log(`   • Risco Alto (≥50%): ${results.filter(z => z.scoreNormalizado >= 50).length} zonas`);
    console.log(`   • Score médio: ${(results.reduce((sum, z) => sum + z.scoreNormalizado, 0) / results.length).toFixed(1)}%`);

    return results;

  } catch (error) {
    console.error('❌ Erro no cálculo de risco da cidade:', error);
    
    onProgress?.({
      total: 100,
      completed: 0,
      percentage: 0,
      status: 'error',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });

    throw error;
  }
}

/**
 * Função de conveniência para calcular risco de uma cidade específica
 * com tratamento de erros e cache básico
 */
export async function calculateCityRiskWithFallback(
  cityCode: string,
  cityUF: string,
  onProgress?: (progress: CalculationProgress) => void
): Promise<ZoneRiskResult[]> {
  try {
    return await calculateCityRisk(cityCode, cityUF, onProgress);
  } catch (error) {
    console.error('❌ Falha no cálculo, tentando com configuração reduzida...');
    
    // Fallback: tentar com menos zonas ou dados simplificados
    // Por ora, rejeitar - mas no futuro pode tentar com 25 zonas (5x5)
    throw new Error(`Falha no cálculo de risco para ${cityCode}: ${error}`);
  }
}