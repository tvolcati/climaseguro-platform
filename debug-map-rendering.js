/**
 * Script de debug para investigar o problema de renderização no mapa
 * Simula o fluxo de cálculo e verifica onde os dados se perdem
 */

// Simular dados de entrada típicos
const mockCityCode = '4106902'; // Curitiba
const mockCityUF = 'PR';

console.log('🔍 INÍCIO DEBUG - Investigando problema de renderização do mapa');
console.log('='.repeat(60));

// 1. Verificar se o boundingBox está sendo gerado corretamente
const mockBoundingBox = {
  minLat: -25.6448,
  maxLat: -25.2588,
  minLon: -49.4248,
  maxLon: -49.1608,
  centerLat: -25.4518,
  centerLon: -49.2928
};

console.log('📍 1. BOUNDING BOX:');
console.log('   Mock BBox:', JSON.stringify(mockBoundingBox, null, 2));

// 2. Simular divisão em zonas
console.log('\n📐 2. DIVISÃO EM ZONAS:');
const gridSize = Math.sqrt(100); // 10x10
console.log(`   Grid: ${gridSize}x${gridSize} = 100 zonas`);

const latStep = (mockBoundingBox.maxLat - mockBoundingBox.minLat) / gridSize;
const lonStep = (mockBoundingBox.maxLon - mockBoundingBox.minLon) / gridSize;

console.log(`   LatStep: ${latStep}`);
console.log(`   LonStep: ${lonStep}`);

// Criar algumas zonas de exemplo
const sampleZones = [];
for (let i = 0; i < 5; i++) {
  const row = Math.floor(i / gridSize);
  const col = i % gridSize;
  
  const zoneMinLat = mockBoundingBox.minLat + (row * latStep);
  const zoneMaxLat = mockBoundingBox.minLat + ((row + 1) * latStep);
  const zoneMinLon = mockBoundingBox.minLon + (col * lonStep);
  const zoneMaxLon = mockBoundingBox.minLon + ((col + 1) * lonStep);
  
  const centerLat = (zoneMinLat + zoneMaxLat) / 2;
  const centerLon = (zoneMinLon + zoneMaxLon) / 2;
  
  sampleZones.push({
    id: i + 1,
    coordinates: { lat: centerLat, lon: centerLon },
    score: 25 + Math.random() * 50, // Score entre 25-75
    level: 'MÉDIO'
  });
}

console.log('   Primeiras 5 zonas:', JSON.stringify(sampleZones, null, 2));

// 3. Verificar transformação dos dados para o Map.tsx
console.log('\n🗺️ 3. DADOS PARA MAP.tsx:');

function mapZoneRiskToMapZone(zoneResult) {
  return {
    id: zoneResult.id,
    coordinates: {
      lat: zoneResult.coordinates.lat,
      lon: zoneResult.coordinates.lon
    },
    score: zoneResult.score || zoneResult.scoreNormalizado,
    level: zoneResult.level || zoneResult.nivel?.replace(/🔴|🟠|🟡|🟢/, '').trim(),
    total_imoveis: Math.floor(Math.random() * 50) + 20,
    populacao_estimada: Math.floor(Math.random() * 150) + 50
  };
}

const mapZones = sampleZones.map(mapZoneRiskToMapZone);
console.log('   Dados transformados para Map:', JSON.stringify(mapZones, null, 2));

// 4. Verificar se as coordenadas estão dentro do bounding box esperado
console.log('\n📊 4. VALIDAÇÃO DE COORDENADAS:');
mapZones.forEach(zone => {
  const isLatValid = zone.coordinates.lat >= mockBoundingBox.minLat && 
                     zone.coordinates.lat <= mockBoundingBox.maxLat;
  const isLonValid = zone.coordinates.lon >= mockBoundingBox.minLon && 
                     zone.coordinates.lon <= mockBoundingBox.maxLon;
                     
  console.log(`   Zona ${zone.id}: lat=${zone.coordinates.lat.toFixed(6)}, lon=${zone.coordinates.lon.toFixed(6)} - Valid: ${isLatValid && isLonValid ? '✅' : '❌'}`);
});

// 5. Simular a lógica de filtro do useSimpleRiskCalculation
console.log('\n🔍 5. FILTRO HIGH RISK (≥50%):');
const highRiskZones = mapZones.filter(zone => zone.score >= 50);
console.log(`   Total zones: ${mapZones.length}`);
console.log(`   High risk zones (≥50%): ${highRiskZones.length}`);
console.log('   High risk zones:', highRiskZones.map(z => `Zone ${z.id} (${z.score.toFixed(1)}%)`));

// 6. Pontos de investigação críticos
console.log('\n🎯 6. PONTOS CRÍTICOS A VERIFICAR:');
console.log('   A. O hook useSimpleRiskCalculation está retornando zones?');
console.log('   B. A função mapZoneRiskToMapZone está sendo executada?');
console.log('   C. O Map.tsx está recebendo zones não-vazias?');
console.log('   D. O processedZones no Map.tsx tem dados?');
console.log('   E. O L.marker está sendo criado corretamente?');
console.log('   F. Os markers estão sendo adicionados ao layer?');

// 7. Teste de criação de ícones
console.log('\n🎨 7. TESTE DE CRIAÇÃO DE ÍCONES:');
function testCreateIcon(score, id) {
  const color = score >= 75 ? "#dc2626" :
                score >= 50 ? "#ea580c" :
                score >= 25 ? "#f59e0b" :
                "#16a34a";
  
  const size = score >= 75 ? 44 : score >= 50 ? 40 : 36;
  
  return {
    color,
    size,
    html: `Zona ${id} (${score.toFixed(1)}%)`,
    valid: !!(color && size)
  };
}

mapZones.forEach(zone => {
  const iconTest = testCreateIcon(zone.score, zone.id);
  console.log(`   Zona ${zone.id}: ${iconTest.color}, ${iconTest.size}px - ${iconTest.valid ? '✅' : '❌'}`);
});

console.log('\n='.repeat(60));
console.log('🔍 FIM DEBUG - Use essas informações para identificar onde a pipeline falha');
console.log('\n💡 PRÓXIMOS PASSOS:');
console.log('   1. Verificar se useSimpleRiskCalculation.zones tem dados');
console.log('   2. Adicionar console.log no Map.tsx para ver processedZones');
console.log('   3. Verificar se L.marker está sendo executado');
console.log('   4. Confirmar se markers estão sendo adicionados ao layer');
console.log('   5. Verificar erros no console do navegador');