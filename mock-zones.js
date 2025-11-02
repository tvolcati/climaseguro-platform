/**
 * Teste para verificar se o Map.tsx funciona com dados mock
 * Isso vai nos ajudar a isolar se o problema é no cálculo ou na renderização
 */

// Dados mock que simulam o que deveria vir do cálculo
const mockZones = [
  {
    id: 1,
    coordinates: { lat: -25.4284, lon: -49.2733 }, // Centro de Curitiba
    score: 75,
    level: "Muito Alto",
    total_imoveis: 45,
    populacao_estimada: 150
  },
  {
    id: 2,
    coordinates: { lat: -25.4300, lon: -49.2750 }, // Próximo ao centro
    score: 60,
    level: "Alto",
    total_imoveis: 38,
    populacao_estimada: 120
  },
  {
    id: 3,
    coordinates: { lat: -25.4250, lon: -49.2700 }, // Próximo ao centro
    score: 55,
    level: "Alto",
    total_imoveis: 32,
    populacao_estimada: 95
  },
  {
    id: 4,
    coordinates: { lat: -25.4320, lon: -49.2780 }, // Próximo ao centro
    score: 85,
    level: "Muito Alto",
    total_imoveis: 52,
    populacao_estimada: 180
  },
  {
    id: 5,
    coordinates: { lat: -25.4200, lon: -49.2650 }, // Próximo ao centro
    score: 68,
    level: "Alto",
    total_imoveis: 41,
    populacao_estimada: 135
  }
];

console.log('🧪 TESTE MOCK ZONES:');
console.log('Quantidade:', mockZones.length);
console.log('Zonas high risk (≥50%):', mockZones.filter(z => z.score >= 50).length);
console.log('Primeira zona:', JSON.stringify(mockZones[0], null, 2));

export default mockZones;