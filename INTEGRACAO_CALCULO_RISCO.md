# 🎯 INTEGRAÇÃO DE CÁLCULO DE RISCO EM TEMPO REAL

## 📋 RESUMO EXECUTIVO

### **OBJETIVO PRINCIPAL**
Implementar o cálculo dinâmico de risco para 100 zonas (malha 10x10) de cada cidade selecionada pelo usuário, integrando a lógica existente em `risco_regional_opensource.js` no frontend React/TypeScript, sem comprometer a experiência do usuário.

### **O QUE É EM SI**
Esta feature consiste em:

1. **Migração da Lógica de Cálculo**: Portar todo o algoritmo de análise de risco do script Node.js (`risco_regional_opensource.js`) para o frontend da aplicação ClimaSeguro.

2. **Cálculo Sob Demanda**: Quando o usuário selecionar uma cidade no dropdown, o sistema irá:
   - Buscar as coordenadas (bounding box) da cidade
   - Dividir em malha 10x10 (100 zonas)
   - Para cada zona, calcular score de risco baseado em:
     - Histórico de desastres (peso 20%)
     - Declividade do terreno (peso 30%)
     - Proximidade a rios (peso 25%)
     - Densidade urbana (peso 15%)
     - Cobertura vegetal (peso 10%)
   - Classificar zonas em:
     - **RISCO MUITO ALTO**: score ≥ 75%
     - **RISCO ALTO**: score ≥ 50% e < 75%
     - **RISCO MODERADO**: score ≥ 30% e < 50%
     - **RISCO BAIXO**: score < 30%

3. **Visualização no Mapa**: Exibir pins/marcadores coloridos no mapa Leaflet conforme o nível de risco calculado.

4. **Armazenamento Temporário**: Cachear resultados para evitar recálculos desnecessários durante a sessão do usuário.

---

### **FLUXOS IMAGINADOS PELO USUÁRIO**

#### **Fluxo 1: Seleção de Cidade (Happy Path)**
```
1. Usuário entra na página /climaseguro
2. Vê dropdown "Selecione uma cidade"
3. Clica no dropdown → Lista de cidades carrega
4. Seleciona "Abadia de Goiás - GO"
5. [LOADING] "Calculando zonas de risco..." (spinner + progress bar)
6. Mapa centraliza na cidade
7. 100 pins coloridos aparecem no mapa (vermelho/laranja/amarelo/verde)
8. Usuário clica em um pin vermelho
9. Modal abre com detalhes da zona (score, fatores, recomendações)
```

#### **Fluxo 2: Recálculo com Cidade Diferente**
```
1. Usuário já está visualizando "Abadia de Goiás"
2. Seleciona outra cidade no dropdown: "Curitiba - PR"
3. [LOADING] "Recalculando zonas..." (reutiliza cache se já calculou antes)
4. Mapa atualiza com novos pins
5. Cards de resumo atualizam (X zonas críticas, Y zonas altas...)
```

#### **Fluxo 3: Erro de Cálculo (API Offline)**
```
1. Usuário seleciona cidade
2. Open-Elevation API está offline
3. Sistema usa valores padrão (declividade média = 10%)
4. Exibe toast: "⚠️ Dados de elevação indisponíveis, usando estimativas"
5. Cálculo prossegue com dados parciais
6. Mapa é exibido normalmente
```

#### **Fluxo 4: Performance (Cálculo Pesado)**
```
1. Usuário seleciona cidade grande (ex: São Paulo)
2. Sistema divide em 100 zonas
3. Calcula assincronamente (Web Worker? ou batches?)
4. Exibe progressivamente: "Calculando... 25/100 zonas"
5. Usuário pode interagir com zonas já calculadas enquanto outras carregam
```

---

### **INTEGRAÇÕES NECESSÁRIAS**

#### **APIs Externas (já usadas no backend)**
1. **INMET** - Alertas meteorológicos
   - Endpoint: `https://apiprevmet3.inmet.gov.br/avisos/ativos`
   - Uso: Verificar se há alertas ativos para a cidade

2. **IBGE Malha Municipal**
   - Endpoint: `https://servicodados.ibge.gov.br/api/v3/malhas/municipios/{codigo}?formato=application/vnd.geo+json`
   - Uso: Obter bounding box (coordenadas min/max) da cidade

3. **OpenStreetMap Overpass API**
   - Endpoint: `https://overpass-api.de/api/interpreter`
   - Uso: Buscar rios, construções, áreas verdes, vias
   - **Problema potencial**: API lenta/instável → precisa de fallback/timeout

4. **Open-Elevation API**
   - Endpoint: `https://api.open-elevation.com/api/v1/lookup`
   - Uso: Dados de altitude para calcular declividade
   - **Problema potencial**: Rate limiting → precisa de estratégia de cache/batch

5. **Nominatim (OpenStreetMap)**
   - Endpoint: `https://nominatim.openstreetmap.org/search`
   - Uso: Fallback para bounding box se IBGE falhar

#### **Componentes do Frontend (a investigar)**
- Sistema de mapas (Leaflet)
- Dropdown de cidades
- Modais de detalhes
- Sistema de loading/feedback
- Gerenciamento de estado (Zustand? Context API? Redux?)

---

### **CARACTERÍSTICAS TÉCNICAS**

#### **Performance Não-Bloqueante**
- ✅ Cálculos devem rodar em background (Web Worker ou chunks)
- ✅ UI deve permanecer responsiva durante cálculo
- ✅ Progress feedback visual obrigatório
- ✅ Cancelamento de cálculo se usuário trocar de cidade

#### **Cache Inteligente**
- ✅ Guardar resultados por cidade em sessionStorage/localStorage
- ✅ TTL (Time To Live): 24h ou até refresh da página
- ✅ Invalidar cache se houver novo alerta meteorológico

#### **Fallback & Resiliência**
- ✅ Se API externa falhar, usar valores padrão
- ✅ Timeouts configuráveis (máx 10s por API)
- ✅ Retry logic com exponential backoff
- ✅ Mensagens claras de erro para o usuário

---

## 🔍 MAPEAMENTO DE INVESTIGAÇÃO

### **CATEGORIA 1: ESTRUTURA DE DADOS & ESTADO**

#### 1.1 **Schema de Dados Atual**
- [ ] **Investigar**: Como as cidades são armazenadas/carregadas hoje?
  - Existe um arquivo JSON estático com lista de cidades?
  - Vem de API? De onde?
  - Qual a estrutura: `{ code, name, state, coordinates }`?
  - Tem código IBGE já mapeado?

- [ ] **Investigar**: Como os dados de zonas são estruturados?
  - Existe interface TypeScript `RiskZone`?
  - Onde está definida? (`src/types/`? inline?)
  - Quais campos tem: `id, coordinates, score, level, bbox`?

- [ ] **Investigar**: Como os dados de alertas INMET são armazenados?
  - Há fetch em `ClimaSeguro.tsx`?
  - Os dados são tipados?
  - Há cache/estado global para alertas?

#### 1.2 **Gerenciamento de Estado**
- [ ] **Investigar**: Qual library de state management está sendo usada?
  - Zustand? Redux? Context API? useState local?
  - Onde está centralizado: `src/store/`? `src/context/`?
  - Como o estado da cidade selecionada é compartilhado?

- [ ] **Investigar**: Como os dados do mapa são gerenciados?
  - Componente `Map.tsx` usa estado local ou global?
  - Há store específico para zonas de risco?
  - Como os pins/markers são renderizados?

- [ ] **Investigar**: Sistema de cache existente
  - Há algum cache implementado (localStorage, sessionStorage)?
  - Existe uma camada de service/API centralizada?
  - Como são tratados dados assíncronos (React Query? SWR? fetch nativo)?

---

### **CATEGORIA 2: ARQUITETURA & COMPONENTES**

#### 2.1 **Estrutura de Páginas**
- [ ] **Investigar**: Padrão de estrutura das páginas
  - Analisar `src/pages/ClimaSeguro.tsx`:
    - Como está organizado (hooks, componentes, lógica)?
    - Usa layout wrapper? Header/Footer compartilhados?
    - Onde fica a lógica de fetch de dados?

- [ ] **Investigar**: Sistema de roteamento
  - React Router? Qual versão?
  - Como as rotas são definidas (`App.tsx`? arquivo separado)?
  - Há parâmetros de rota (ex: `/climaseguro/:cityCode`)?

#### 2.2 **Componente de Mapa**
- [ ] **Investigar**: `src/components/Map.tsx`
  - Está usando Leaflet? Mapbox? (PROMPT_FRONTEND.md diz Leaflet)
  - Como os markers são criados:
    - Componente customizado `RiskMarker`?
    - DivIcon com HTML customizado?
    - SVG/Canvas?
  - Como é feito o binding de eventos (onClick nos pins)?
  - Há controle de zoom/center programático?
  - Performance: virtualização de markers para 100 zonas?

- [ ] **Investigar**: Sistema de popup/modal ao clicar em zona
  - Componente `ZoneDetailModal.tsx` já existe
  - Como é acionado? (useState? Context?)
  - Quais dados recebe como props?
  - Onde estão os dados de `aiAnalysis`, `financialImpact`?

#### 2.3 **Dropdown de Cidades**
- [ ] **Investigar**: Como o Select está implementado
  - Shadcn/UI `<Select>`? (provável dado `components/ui/select.tsx`)
  - Onde está a lista de cidades?
  - É carregada de um JSON estático ou API?
  - Tem search/filter?
  - Como dispara a mudança de cidade?

---

### **CATEGORIA 3: LÓGICA DE NEGÓCIO & ALGORITMOS**

#### 3.1 **Porting do Algoritmo de Risco**
- [ ] **Investigar**: Estrutura do `risco_regional_opensource.js`
  - Funções principais:
    - `buscarBoundingBox()` → TypeScript equivalente
    - `buscarInfraestruturaOSM()` → Fetch + parsing
    - `buscarElevacao()` → Batch requests
    - `dividirEmZonas()` → Math puro (fácil portar)
    - `calcularScoreZona()` → Algoritmo de pesos
    - `classificarRisco()` → Mapping de scores
  - Dependências Node.js a substituir:
    - `fetch` → já existe no browser
    - `fs.writeFileSync()` → remover (não precisa salvar arquivos)
    - Qualquer módulo Node → verificar se tem equivalente browser

- [ ] **Investigar**: Onde colocar a lógica de cálculo
  - Criar `src/services/riskCalculation.ts`?
  - Ou `src/lib/riskScoring.ts`?
  - Ou dentro de hook customizado `useRiskCalculation()`?

#### 3.2 **Constantes & Configurações**
- [ ] **Investigar**: Onde ficam constantes da aplicação
  - Existe `src/constants/` ou `src/config/`?
  - Onde colocar:
    - `PESOS_RISCO`
    - `HISTORICO_DESASTRES`
    - `APIS` (endpoints)
  - Há variáveis de ambiente (`.env`)? Como acessar?

---

### **CATEGORIA 4: UX/UI & FEEDBACK VISUAL**

#### 4.1 **Sistema de Loading**
- [ ] **Investigar**: Componentes de loading existentes
  - Há `Spinner`, `Skeleton`, `ProgressBar` em `components/ui/`?
  - Como são usados nas páginas atuais?
  - Padrão de implementação (inline? context? toast?)

- [ ] **Investigar**: Feedback de progresso
  - Precisa criar novo componente `<CalculationProgress />`?
  - Onde exibir: overlay no mapa? toast? modal?
  - Como cancelar cálculo em progresso?

#### 4.2 **Sistema de Notificações/Toasts**
- [ ] **Investigar**: Library de toast
  - Shadcn/UI tem `sonner` (vi em `components/ui/sonner.tsx`)
  - Como é usado: `toast.success()`, `toast.error()`?
  - Onde está configurado o provider?

- [ ] **Investigar**: Tratamento de erros
  - Existe `ErrorBoundary`?
  - Como erros de API são mostrados ao usuário?
  - Há retry automático?

#### 4.3 **Design System & Cores**
- [ ] **Investigar**: Cores de risco
  - No `PROMPT_FRONTEND.md`:
    - Crítico: `bg-red-500`
    - Alto: `bg-orange-500`
    - Moderado: `bg-yellow-500`
    - Baixo: `bg-green-500`
  - Verificar se já estão em `tailwind.config.ts` ou `index.css`
  - Precisa adicionar novas cores para "MUITO ALTO" (75%+)?

- [ ] **Investigar**: Componentes de Card/Stats
  - Há cards de resumo na página ClimaSeguro?
  - Como são estilizados?
  - Usam `components/ui/card.tsx`?
  - Precisam atualizar dinamicamente após cálculo?

---

### **CATEGORIA 5: PERFORMANCE & OTIMIZAÇÃO**

#### 5.1 **Web Workers**
- [ ] **Investigar**: Setup de Web Workers no Vite
  - Vite tem suporte nativo: `new Worker()`
  - Onde criar: `src/workers/riskCalculation.worker.ts`?
  - Como passar dados entre main thread e worker?
  - Como lidar com progresso (postMessage)?

- [ ] **Investigar**: Alternativas se Web Worker complicar
  - Usar `requestIdleCallback()` para cálculos em chunks?
  - `setTimeout()` batching?
  - Calcular só zonas visíveis no viewport primeiro?

#### 5.2 **Cache & Persistência**
- [ ] **Investigar**: Estratégia de cache
  - LocalStorage: limite de 5MB (100 cidades x 100 zonas = quanto?)
  - SessionStorage: melhor? (limpa ao fechar aba)
  - IndexedDB: overkill? Mas sem limite
  - Formato de chave: `risk_cache_${cityCode}_${date}`

- [ ] **Investigar**: Invalidação de cache
  - Como detectar novo alerta INMET?
  - Guardar timestamp do alerta junto com cache?
  - Limpar cache antigo (>24h)?

#### 5.3 **Rate Limiting de APIs**
- [ ] **Investigar**: Limites das APIs externas
  - Open-Elevation: quantas requests/min?
  - Overpass API: qual o timeout seguro?
  - Estratégia de retry com backoff
  - Como lidar com 429 (Too Many Requests)?

---

### **CATEGORIA 6: TIPOS & INTERFACES TYPESCRIPT**

#### 6.1 **Definições de Tipos**
- [ ] **Investigar**: Onde estão os types atuais
  - Existe `src/types/index.ts` ou `src/@types/`?
  - Ou são inline nas páginas?

- [ ] **Investigar**: Tipos necessários para portar
  ```typescript
  // Do risco_regional_opensource.js, precisamos tipar:
  interface BoundingBox {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
    centerLat: number;
    centerLon: number;
  }
  
  interface InfrastructureData {
    rios: OSMElement[];
    construcoes: OSMElement[];
    areasVerdes: OSMElement[];
    vias: OSMElement[];
    totalElementos: number;
  }
  
  interface ElevationPoint {
    latitude: number;
    longitude: number;
    elevation: number;
  }
  
  interface RiskFactor {
    nome: string;
    valor: number | string;
    peso: number;
    score?: number;
  }
  
  interface ZoneRiskResult {
    id: number;
    coordinates: { lat: number; lon: number };
    bbox: BoundingBox;
    scoreNormalizado: number; // 0-100
    score: number; // 0-1
    nivel: string; // "🔴 CRÍTICO"
    cor: string; // "#FF0000"
    prioridade: number; // 1-5
    fatores: RiskFactor[];
    declividade: number;
    recomendacoes: string[];
  }
  ```

- [ ] **Investigar**: Integração com tipos do Leaflet
  - Como tipar markers customizados?
  - `L.DivIcon` aceita genéricos?

---

### **CATEGORIA 7: TESTES & VALIDAÇÃO**

#### 7.1 **Testes Existentes**
- [ ] **Investigar**: Há testes no projeto?
  - Jest? Vitest? Testing Library?
  - Onde ficam: `src/__tests__/` ou `*.test.tsx`?
  - Qual a cobertura atual?

- [ ] **Investigar**: Como testar cálculos de risco
  - Mock de APIs externas
  - Fixtures de dados (cidades de teste)
  - Snapshots de resultados esperados

#### 7.2 **Validação de Dados**
- [ ] **Investigar**: Validação de inputs
  - Zod? Yup? Validação manual?
  - Como validar resposta das APIs externas?
  - Como lidar com dados malformados?

---

### **CATEGORIA 8: BUILD & DEPLOY**

#### 8.1 **Configuração de Build**
- [ ] **Investigar**: Vite config atual
  - Plugins instalados
  - Otimizações de bundle
  - Code splitting configurado?

- [ ] **Investigar**: Impacto no bundle size
  - Algoritmo de risco adiciona quanto de JS? (~50KB?)
  - Tree shaking funciona com imports?
  - Precisa lazy load da lógica de cálculo?

#### 8.2 **Variáveis de Ambiente**
- [ ] **Investigar**: `.env` existente
  - Como acessar: `import.meta.env.VITE_*`
  - Onde guardar endpoints de API?
  - Modo dev vs prod (URLs diferentes)?

---

### **CATEGORIA 9: INTEGRAÇÃO COM FUNCIONALIDADES EXISTENTES**

#### 9.1 **Modal de Detalhes da Zona**
- [ ] **Investigar**: `ZoneDetailModal.tsx`
  - Quais props recebe hoje?
  - Já exibe `score`, `fatores`, `recomendacoes`?
  - Ou está mockado com dados estáticos?
  - Precisa atualizar para aceitar dados calculados?

- [ ] **Investigar**: Dados de IA (Gemini Vision)
  - O modal espera `aiAnalysis` e `financialImpact`
  - De onde vêm esses dados hoje?
  - São do `relatorio_impacto_ia.json` estático?
  - Precisam ser calculados também ou ficam separados?

#### 9.2 **Cards de Resumo/Estatísticas**
- [ ] **Investigar**: Componentes de estatísticas
  - Há cards tipo "X zonas críticas" na página?
  - Como atualizam: re-render automático ou manual?
  - Precisam contar zonas por nível após cálculo?

#### 9.3 **Sistema de Notificações (Prefeitura)**
- [ ] **Investigar**: Fluxo ClimaSeguro → Prefeitura
  - Botão "Notificar Prefeitura" já funciona?
  - Envia para onde? API? LocalStorage?
  - Precisa integrar com zonas calculadas?

---

### **CATEGORIA 10: DOCUMENTAÇÃO & MANUTENÇÃO**

#### 10.1 **Código Existente**
- [ ] **Investigar**: Padrões de código
  - ESLint config (`eslint.config.js`)
  - Prettier? (há `.prettierrc`?)
  - Convenções de nome (camelCase? PascalCase para componentes?)
  - Estrutura de pastas (feature-based? type-based?)

#### 10.2 **README & Docs**
- [ ] **Investigar**: `README.md` do projeto
  - Como rodar localmente?
  - Dependências externas mencionadas?
  - Precisa atualizar com novas APIs?

---

## 📊 RESUMO DE PONTOS DE INVESTIGAÇÃO

### **Total de Itens a Investigar: 60+**

**Prioridade ALTA (bloqueantes):**
1. Schema de dados de cidades
2. Gerenciamento de estado (qual library)
3. Estrutura do componente Map.tsx
4. Tipos TypeScript existentes
5. Sistema de loading/feedback
6. Endpoints de API e fetch patterns

**Prioridade MÉDIA (impactam UX):**
7. Sistema de cache
8. Web Workers setup
9. Modal de detalhes
10. Cards de resumo
11. Sistema de toast/notificações

**Prioridade BAIXA (nice to have):**
12. Testes existentes
13. Build configuration
14. Documentação

---

## 🚀 PRÓXIMOS PASSOS

**AGUARDANDO APROVAÇÃO PARA INICIAR INVESTIGAÇÃO SISTEMÁTICA**

Após aprovação, executarei:
1. Leitura de todos os arquivos mapeados
2. Documentação de achados por categoria
3. Proposta de arquitetura de implementação
4. Plano de execução por etapas

---

**Status**: 📝 Planejamento concluído - Aguardando comando para investigação

---
---

# 🔬 INVESTIGAÇÃO SISTEMÁTICA - ACHADOS

## ✅ CATEGORIA 1: ESTRUTURA DE DADOS & ESTADO

### 1.1 Schema de Dados Atual

#### **Cidades - MOCKADAS LOCALMENTE**
- **Arquivo**: `/src/pages/ClimaSeguro.tsx` (linha 9-13)
- **Estrutura**:
```typescript
const cities = [
  { 
    code: "4106902",        // Código IBGE (string)
    name: "Curitiba",       // Nome da cidade
    state: "PR",            // UF (2 letras)
    coordinates: {          // Centro da cidade
      lat: -25.4284, 
      lon: -49.2733 
    } 
  },
  // ... 3 cidades mockadas (Curitiba, SP, RJ)
];
```
- **Input**: Nenhum (dados hardcoded)
- **Output**: Array de objetos `City`
- **Onde é usado**: 
  - `ClimaSeguro.tsx` → Popula o dropdown `<Select>`
  - `getCityCoordinates()` → Busca coordenadas para centralizar mapa
- **⚠️ IMPACTO**: Precisamos carregar cidades de uma API ou JSON estático com códigos IBGE reais

#### **Zonas de Risco - MOCKADAS LOCALMENTE**
- **Arquivo**: `/src/pages/ClimaSeguro.tsx` (linha 16-77)
- **Estrutura**:
```typescript
interface RiskZone {  // definido em Map.tsx linha 6-12
  id: number;                      // ID da zona (1-100)
  coordinates: {                   // Centro da zona
    lat: number; 
    lon: number;
  };
  score: number;                   // Score 0-100
  level: string;                   // "CRÍTICO" | "ALTO" | "MODERADO" | "BAIXO"
  total_imoveis?: number;          // Opcional
  populacao_estimada?: number;     // Opcional
}
```
- **Dados Mockados**: 10 zonas hardcoded (scores variando 55-85)
- **Input**: Nenhum
- **Output**: Array `mockZones`
- **Onde é usado**:
  - `ClimaSeguro.tsx` → Passa para componente `<Map zones={mockZones}>`
  - `Map.tsx` → Renderiza marcadores no mapa
- **⚠️ IMPACTO**: Substituir por cálculo dinâmico de 100 zonas

### 1.2 Gerenciamento de Estado

#### **React Query (TanStack Query)**
- **Arquivo**: `/src/App.tsx` (linha 9, 12)
- **Versão**: `@tanstack/react-query@^5.83.0`
- **Setup**:
```typescript
const queryClient = new QueryClient();

<QueryClientProvider client={queryClient}>
  {/* App */}
</QueryClientProvider>
```
- **Input**: Configuração padrão do QueryClient
- **Output**: Provider para toda aplicação
- **Onde é usado**: Envolvendo todo o app (linha 13)
- **⚠️ IMPACTO**: Podemos usar `useQuery` para cache de cálculos de risco

#### **Estado Local (useState)**
- **Arquivo**: `/src/pages/ClimaSeguro.tsx` (linha 106-108)
- **Estados**:
```typescript
const [selectedCity, setSelectedCity] = useState<string>("");           // Código IBGE da cidade
const [selectedZone, setSelectedZone] = useState<any>(null);           // Zona clicada
const [modalOpen, setModalOpen] = useState(false);                     // Controle do modal
```
- **Input**: 
  - `setSelectedCity`: string (código IBGE ex: "4106902")
  - `setSelectedZone`: objeto RiskZone
  - `setModalOpen`: boolean
- **Output**: Renderização condicional do mapa e modal
- **Onde é usado**:
  - `selectedCity` → Controla exibição do mapa (linha 120-179)
  - `selectedZone` → Props do `ZoneDetailModal` (linha 182)
  - `modalOpen` → Props `open` do modal (linha 184)
- **⚠️ IMPACTO**: Adicionar estado para loading/progresso de cálculo

#### **Sem Context API ou Store Global**
- **Achado**: Não há Zustand, Redux ou Context customizado
- **Padrão**: Props drilling direto (estado local + props)
- **⚠️ IMPACTO**: Se precisar compartilhar estado de cálculo entre componentes, criar Context ou usar React Query

### 1.3 Sistema de Cache

#### **Não Implementado Atualmente**
- **Achado**: Nenhum uso de localStorage, sessionStorage ou IndexedDB
- **React Query**: Tem cache em memória (padrão 5 minutos)
- **⚠️ IMPACTO**: Implementar cache de cálculos usando React Query ou localStorage

---

## ✅ CATEGORIA 2: ARQUITETURA & COMPONENTES

### 2.1 Estrutura de Páginas

#### **Sistema de Rotas**
- **Arquivo**: `/src/App.tsx` (linha 15-24)
- **Library**: `react-router-dom@^6.30.1`
- **Estrutura**:
```typescript
<BrowserRouter>
  <Routes>
    <Route path="/" element={<Login />} />
    <Route path="/climaseguro" element={<ClimaSeguro />} />
    <Route path="/prefeitura/curitiba" element={<Prefeitura />} />
    <Route path="/prefeitura/zona/:zoneId/wizard" element={<WizardPrevencao />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
</BrowserRouter>
```
- **Input**: URL navegada
- **Output**: Componente correspondente
- **⚠️ IMPACTO**: Não precisa adicionar novas rotas para cálculo de risco (tudo em /climaseguro)

#### **Página ClimaSeguro.tsx - Estrutura**
- **Caminho**: `/src/pages/ClimaSeguro.tsx`
- **Organização**:
  1. Imports (linha 1-8)
  2. Mock data (linha 9-77)
  3. Componente principal (linha 79-180)
  4. Sub-componente StatCard (linha 182-202)
- **Padrão de código**: 
  - Sem separação de lógica/UI
  - Tudo em um arquivo
  - Sub-componentes inline
- **⚠️ IMPACTO**: Extrair lógica de cálculo para arquivo separado

#### **Função getCityCoordinates()**
- **Arquivo**: `/src/pages/ClimaSeguro.tsx` (linha 110-113)
- **Assinatura**:
```typescript
const getCityCoordinates = (): [number, number] => {
  const city = cities.find(c => c.code === selectedCity);
  return city ? [city.coordinates.lat, city.coordinates.lon] : [-25.4284, -49.2733];
}
```
- **Input**: Lê `selectedCity` (string) do estado
- **Output**: Tupla `[lat, lon]` (números)
- **Usado em**: Linha 164 (`<Map center={getCityCoordinates()} />`)
- **⚠️ IMPACTO**: Manter essa função, ela já retorna formato correto para Leaflet

#### **Função handleZoneClick()**
- **Arquivo**: `/src/pages/ClimaSeguro.tsx` (linha 115-118)
- **Assinatura**:
```typescript
const handleZoneClick = (zone: any) => {
  setSelectedZone(zone);
  setModalOpen(true);
}
```
- **Input**: `zone` (objeto RiskZone do mapa)
- **Output**: Atualiza estado local (abre modal)
- **Usado em**: Linha 165 (`<Map onZoneClick={handleZoneClick} />`)
- **⚠️ IMPACTO**: Manter intacto, já funciona corretamente

### 2.2 Componente de Mapa

#### **Map.tsx - Análise Completa**
- **Caminho**: `/src/pages/Map.tsx`
- **Library**: `leaflet@^1.9.4` + tipos `@types/leaflet@^1.9.21`

#### **Interface RiskZone (linha 6-12)**
```typescript
interface RiskZone {
  id: number;
  coordinates: { lat: number; lon: number };
  score: number;
  level: string;
  total_imoveis?: number;          // OPCIONAL
  populacao_estimada?: number;     // OPCIONAL
}
```
- **⚠️ CRÍTICO**: Campos opcionais não afetam renderização
- **Usado para**: Validação TypeScript dos dados de zona

#### **Interface MapProps (linha 15-19)**
```typescript
interface MapProps {
  center: [number, number];              // [lat, lon]
  zones: RiskZone[];                     // Array de zonas
  onZoneClick?: (zone: RiskZone) => void; // Callback opcional
}
```
- **Input Esperado**:
  - `center`: Tupla numérica (coordenadas)
  - `zones`: Array de objetos RiskZone
  - `onZoneClick`: Função que recebe RiskZone e não retorna nada
- **⚠️ IMPACTO**: Manter interface exatamente assim (já está correta)

#### **Função initLeafletIcons() (linha 22-30)**
- **Propósito**: Fix de ícones padrão do Leaflet (problema comum no Vite/Webpack)
- **Input**: Nenhum
- **Output**: Efeito colateral (modifica L.Icon.Default)
- **Chamado em**: useEffect de inicialização (linha 52)
- **⚠️ IMPACTO**: NÃO MEXER (fix necessário)

#### **Função createIcon() (linha 32-43)**
- **Assinatura**:
```typescript
const createIcon = (score: number, id: number): L.DivIcon => {
  const color = score >= 70 ? "#ef4444" :      // Vermelho (Crítico)
                score >= 50 ? "#f97316" :      // Laranja (Alto)
                score >= 30 ? "#eab308" :      // Amarelo (Moderado)
                "#22c55e";                     // Verde (Baixo)
  
  const textColor = score >= 30 && score < 50 ? "#1f2937" : "#ffffff";
  
  return L.divIcon({
    html: `<div style="...background:${color}...">${id}</div>`,
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });
}
```
- **Input**: 
  - `score`: número 0-100
  - `id`: número da zona
- **Output**: Objeto `L.DivIcon` (ícone customizado do Leaflet)
- **Cores Hardcoded**:
  - `#ef4444` = vermelho (Tailwind red-500)
  - `#f97316` = laranja (Tailwind orange-500)
  - `#eab308` = amarelo (Tailwind yellow-500)
  - `#22c55e` = verde (Tailwind green-500)
- **⚠️ CRÍTICO**: Manter thresholds (70, 50, 30) consistentes com novo sistema:
  - ≥75% = MUITO ALTO (criar nova cor?)
  - ≥50% = ALTO
  - <50% = não exibir?

#### **Refs do Mapa (linha 45-47)**
```typescript
const containerRef = useRef<HTMLDivElement | null>(null);          // Div container do mapa
const mapRef = useRef<L.Map | null>(null);                         // Instância do Leaflet Map
const markersLayerRef = useRef<L.LayerGroup | null>(null);        // Grupo de marcadores
```
- **Propósito**: Persistir referências entre re-renders
- **⚠️ IMPACTO**: NÃO MEXER (padrão correto)

#### **useEffect 1: Inicialização do Mapa (linha 50-84)**
```typescript
useEffect(() => {
  if (!containerRef.current) return;
  
  initLeafletIcons();
  
  const map = L.map(containerRef.current, {
    center,                    // Props
    zoom: 13,                  // Hardcoded
    preferCanvas: true,        // Performance
  });
  mapRef.current = map;
  
  // Camada Satélite (Esri)
  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { attribution: "&copy; Esri" }
  ).addTo(map);
  
  // Camada Ruas (OSM com 50% opacidade)
  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    { attribution: "&copy; OpenStreetMap", opacity: 0.5 }
  ).addTo(map);
  
  // Grupo de marcadores vazio
  markersLayerRef.current = L.layerGroup().addTo(map);
  
  return () => {
    map.remove();             // Cleanup
    mapRef.current = null;
    markersLayerRef.current = null;
  };
}, []); // Roda só 1 vez (array vazio)
```
- **Input**: Props `center` (usado na criação)
- **Output**: Mapa renderizado + refs populadas
- **⚠️ IMPACTO**: NÃO MEXER (setup correto)

#### **useEffect 2: Atualizar Centro (linha 86-91)**
```typescript
useEffect(() => {
  if (mapRef.current) {
    mapRef.current.setView(center, 13, { animate: true });
  }
}, [center]);  // Re-executa quando center muda
```
- **Input**: Props `center`
- **Output**: Move mapa com animação
- **⚠️ IMPACTO**: Perfeito para quando usuário trocar de cidade

#### **useEffect 3: Renderizar Marcadores (linha 93-118)**
```typescript
useEffect(() => {
  if (!markersLayerRef.current) return;
  const layer = markersLayerRef.current;
  
  layer.clearLayers();  // Remove marcadores antigos
  
  zones.forEach((zone) => {
    const marker = L.marker([zone.coordinates.lat, zone.coordinates.lon], {
      icon: createIcon(zone.score, zone.id),
    });
    
    const popupHtml = `
      <div style="text-align:center">
        <p style="font-weight:700">Zona ${zone.id}</p>
        <p style="font-size:12px">${zone.level}</p>
        <p style="font-size:11px;color:#6b7280">Score: ${zone.score}/100</p>
      </div>
    `;
    marker.bindPopup(popupHtml);
    
    marker.on("click", () => onZoneClick?.(zone));  // Callback
    marker.addTo(layer);
  });
}, [zones, onZoneClick]);  // Re-executa quando zones ou callback mudam
```
- **Input**: 
  - Props `zones` (array de RiskZone)
  - Props `onZoneClick` (função callback)
- **Output**: Marcadores renderizados no mapa
- **Performance**: `clearLayers()` → `forEach` → `addTo(layer)`
- **⚠️ CRÍTICO**: 
  - Com 100 zonas, pode ter lag (testar)
  - Considerar virtualização ou clustering (Leaflet.markercluster)

#### **Retorno do Componente (linha 120-124)**
```typescript
return (
  <div className="rounded-lg shadow-lg relative z-0" style={{ width: "100%", height: "600px" }}>
    <div ref={containerRef} className="w-full h-full rounded-lg" />
  </div>
);
```
- **Estrutura**: Wrapper externo + div interna com ref
- **⚠️ IMPACTO**: NÃO MEXER (necessário para Leaflet)

### 2.3 Componente ZoneDetailModal

#### **ZoneDetailModal.tsx - Análise Completa**
- **Caminho**: `/src/components/ZoneDetailModal.tsx`

#### **Interface ZoneDetailModalProps (linha 10-18)**
```typescript
interface ZoneDetailModalProps {
  zone: {
    id: number;
    score: number;
    level: string;
    total_imoveis?: number;
    populacao_estimada?: number;
    coordinates: { lat: number; lon: number };
  } | null;              // ⚠️ PODE SER NULL
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```
- **Input Esperado**:
  - `zone`: Objeto parcial de RiskZone ou `null`
  - `open`: boolean para controlar visibilidade
  - `onOpenChange`: Callback para fechar
- **⚠️ CRÍTICO**: 
  - Não tem campos de análise de IA (`aiAnalysis`, `financialImpact`)
  - Dados financeiros são HARDCODED (linha 81-104)
  - Precisa receber dados calculados

#### **Função getRiskColorClass() (linha 23-28)**
```typescript
const getRiskColorClass = (score: number) => {
  if (score >= 70) return "border-red-500 bg-red-50";
  if (score >= 50) return "border-orange-500 bg-orange-50";
  if (score >= 30) return "border-yellow-500 bg-yellow-50";
  return "border-green-500 bg-green-50";
}
```
- **Input**: `score` (número 0-100)
- **Output**: String de classes Tailwind
- **⚠️ IMPACTO**: Atualizar para suportar MUITO ALTO (≥75%)

#### **Dados Mockados no Modal**
- **Linha 81-104**: Todos os valores financeiros são hardcoded:
```typescript
<Value>R$ 2,5M</Value>  // Custo desastre
<Value>R$ 250K</Value>  // Custo prevenção
<Text>R$ 10</Text>      // ROI multiplier
<Text>ROI: 1000%</Text> // ROI formatado
```
- **⚠️ CRÍTICO**: Substituir por dados reais do cálculo

#### **Botão "Notificar Prefeitura" (linha 107)**
```typescript
<Button className="w-full" size="lg">
  📢 Notificar Prefeitura
</Button>
```
- **Input**: onClick não implementado
- **Output**: Nada (sem ação)
- **⚠️ IMPACTO**: Implementar lógica de notificação futuramente

### 2.4 Componente PrefeituraZoneModal

#### **PrefeituraZoneModal.tsx - Análise Completa**
- **Caminho**: `/src/components/PrefeituraZoneModal.tsx`

#### **Interface Zone (linha 11-18)**
```typescript
interface Zone {
  zone_id: number;        // ⚠️ Diferente de "id" no ClimaSeguro
  level: string;
  coordinates: { lat: number; lon: number };
  total_imoveis: number;  // ⚠️ NÃO É OPCIONAL
  populacao_estimada: number;
  roi_formatado: string;
  notified_at: string;
}
```
- **⚠️ DIFERENÇA CRÍTICA**: Campo `zone_id` vs `id` (inconsistência)

#### **Cálculos Financeiros (linha 33-40)**
```typescript
const custoMedioPorImovel = 15000;           // R$ 15k por imóvel
const custoTotalPrevencao = zone.total_imoveis * custoMedioPorImovel;

const custoMedioReconstrucao = 180000;       // R$ 180k por imóvel
const custoTotalDesastre = zone.total_imoveis * custoMedioReconstrucao;

const economiaEstimada = custoTotalDesastre - custoTotalPrevencao;
const roi = ((economiaEstimada / custoTotalPrevencao) * 100).toFixed(0);
```
- **Input**: `zone.total_imoveis` (número de imóveis)
- **Output**: Variáveis locais (custos, ROI)
- **⚠️ CRÍTICO**: Valores diferentes do backend (`risco_regional_opensource.js`):
  - Backend: CUSTOS_DESASTRES.PREVENCAO_POR_IMOVEL (varia por tipo)
  - Frontend: 15k fixo
  - **Precisa alinhar com constantes do backend**

---

## ✅ CATEGORIA 3: LÓGICA DE NEGÓCIO & ALGORITMOS

### 3.1 Constantes do Backend a Portar

#### **Arquivo Fonte**: `/home/inteli/clima_seguro/risco_regional_opensource.js`

#### **PESOS_RISCO (linha 33-64)**
```javascript
const PESOS_RISCO = {
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
};
```
- **⚠️ AÇÃO**: Criar `src/constants/riskWeights.ts` com essa estrutura

#### **HISTORICO_DESASTRES (linha 70-82)**
```javascript
const HISTORICO_DESASTRES = {
  'RJ': 0.9,   // Rio de Janeiro
  'SP': 0.7,   // São Paulo
  'SC': 0.85,  // Santa Catarina
  'MG': 0.6,   // Minas Gerais
  'BA': 0.5,
  'PE': 0.6,
  'AL': 0.7,
  'ES': 0.65,
  'PR': 0.55
};
```
- **⚠️ AÇÃO**: Criar `src/constants/historicalData.ts`

#### **APIS (linha 13-24)**
```javascript
const APIS = {
  INMET_AVISOS: 'https://apiprevmet3.inmet.gov.br/avisos/ativos',
  IBGE_MALHA: 'https://servicodados.ibge.gov.br/api/v3/malhas/municipios',
  OVERPASS_API: 'https://overpass-api.de/api/interpreter',
  OPEN_ELEVATION: 'https://api.open-elevation.com/api/v1/lookup',
  NOMINATIM: 'https://nominatim.openstreetmap.org/search'
};
```
- **⚠️ AÇÃO**: Criar `src/constants/apiEndpoints.ts`

### 3.2 Funções Principais a Portar

#### **Função: buscarBoundingBox() (linha 88-148)**
- **Assinatura**:
```javascript
async function buscarBoundingBox(nomeMunicipio, uf, codigoIBGE): Promise<{
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
  centerLat: number;
  centerLon: number;
} | null>
```
- **Input**:
  - `nomeMunicipio`: string (ex: "Curitiba")
  - `uf`: string (ex: "PR")
  - `codigoIBGE`: string (ex: "4106902")
- **Output**: Objeto com bbox ou `null`
- **Fluxo**:
  1. Tenta Nominatim (linha 91-112)
  2. Fallback IBGE malha GeoJSON (linha 114-148)
- **⚠️ AÇÃO**: Criar `src/services/geocoding.ts` → `fetchBoundingBox()`

#### **Função: buscarInfraestruturaOSM() (linha 154-215)**
- **Assinatura**:
```javascript
async function buscarInfraestruturaOSM(bbox): Promise<{
  rios: OSMElement[];
  construcoes: OSMElement[];
  areasVerdes: OSMElement[];
  vias: OSMElement[];
  totalElementos: number;
} | null>
```
- **Input**: `bbox` (objeto com minLat, maxLat, minLon, maxLon)
- **Output**: Objeto com arrays de elementos OSM ou `null`
- **API**: Overpass API (POST request com query especial)
- **⚠️ AÇÃO**: Criar `src/services/infrastructure.ts` → `fetchOSMInfrastructure()`

#### **Função: buscarElevacao() (linha 221-258)**
- **Assinatura**:
```javascript
async function buscarElevacao(bbox, gridSize = 5): Promise<Array<{
  latitude: number;
  longitude: number;
  elevation: number;
}> | null>
```
- **Input**:
  - `bbox`: Objeto bounding box
  - `gridSize`: número (default 5 = 25 pontos)
- **Output**: Array de pontos com elevação ou `null`
- **Fluxo**:
  1. Cria grade de pontos (linha 224-233)
  2. Faz request único com todos os pontos (linha 235-238)
  3. Mapeia resultados (linha 245-249)
- **⚠️ AÇÃO**: Criar `src/services/elevation.ts` → `fetchElevation()`

#### **Função: calcularDeclividade() (linha 264-300)**
- **Assinatura**:
```javascript
function calcularDeclividade(pontosElevacao): number
```
- **Input**: Array de objetos `{latitude, longitude, elevation}`
- **Output**: Declividade média em % (número)
- **Algoritmo**:
  1. Para cada par de pontos consecutivos:
  2. Calcula distância horizontal (Haversine)
  3. Calcula diferença vertical
  4. Declividade = (vertical / horizontal) * 100
  5. Média todas as declividades
- **⚠️ AÇÃO**: Criar `src/utils/terrainCalculations.ts` → `calculateSlope()`

#### **Função: dividirEmZonas() (linha 306-328)**
- **Assinatura**:
```javascript
function dividirEmZonas(bbox, numZonas = 9): Array<{
  id: number;
  nome: string;
  bbox: BoundingBox;
  center: { lat: number; lon: number };
}>
```
- **Input**:
  - `bbox`: Bounding box da cidade
  - `numZonas`: número (default 9, **queremos 100**)
- **Output**: Array de objetos Zone
- **Algoritmo**:
  1. `gridSize = sqrt(numZonas)` → Para 100: gridSize = 10
  2. `latStep = (maxLat - minLat) / 10`
  3. `lonStep = (maxLon - minLon) / 10`
  4. Loop duplo i,j de 0 a 9 → 100 zonas
  5. Cada zona tem bbox + center
- **⚠️ AÇÃO**: Criar `src/utils/gridUtils.ts` → `divideIntoZones()`

#### **Função: calcularScoreZona() (linha 334-408)**
- **Assinatura**:
```javascript
function calcularScoreZona(zona, infraestrutura, elevacao, uf, tipoEvento): {
  scoreNormalizado: number;   // 0-100
  score: number;              // 0-1
  fatores: RiskFactor[];
  declividade: number;
}
```
- **Input**:
  - `zona`: Objeto Zone
  - `infraestrutura`: Resultado de buscarInfraestruturaOSM()
  - `elevacao`: Array de pontos de buscarElevacao()
  - `uf`: string (ex: "PR")
  - `tipoEvento`: string (ex: "Tempestade")
- **Output**: Objeto com score e detalhamento
- **Algoritmo** (pesos):
  1. Histórico (20%): HISTORICO_DESASTRES[uf]
  2. Declividade (30%): Calcula e mapeia para PESOS_RISCO.DECLIVIDADE
  3. Proximidade rios (25%): Verifica rios na zona
  4. Urbanização (15%): % de construções vs total elementos
  5. Vegetação (10%): % de áreas verdes
  6. Score final = soma ponderada * 100
- **⚠️ AÇÃO**: Criar `src/services/riskCalculation.ts` → `calculateZoneRisk()`

#### **Função: classificarRisco() (linha 414-420)**
- **Assinatura**:
```javascript
function classificarRisco(score): {
  nivel: string;        // "🔴 CRÍTICO"
  cor: string;          // "#FF0000"
  prioridade: number;   // 1-5
}
```
- **Input**: `score` (número 0-100)
- **Output**: Objeto com classificação
- **Thresholds**:
  - ≥80: CRÍTICO
  - ≥60: ALTO
  - ≥40: MODERADO
  - ≥20: BAIXO
  - <20: MUITO BAIXO
- **⚠️ CRÍTICO**: Nosso requisito é diferente:
  - ≥75: MUITO ALTO
  - ≥50: ALTO
  - Não exibir <50
- **⚠️ AÇÃO**: Criar `src/utils/riskClassification.ts` → `classifyRisk()`

#### **Função: gerarRecomendacoes() (linha 426-478)**
- **Assinatura**:
```javascript
function gerarRecomendacoes(zona, resultado, tipoEvento): string[]
```
- **Input**:
  - `zona`: Objeto Zone
  - `resultado`: Resultado de calcularScoreZona()
  - `tipoEvento`: string
- **Output**: Array de strings (recomendações)
- **Lógica**: Baseada em score e fatores de risco
- **⚠️ AÇÃO**: Criar `src/utils/recommendations.ts` → `generateRecommendations()`

---

## ✅ CATEGORIA 4: UX/UI & FEEDBACK VISUAL

### 4.1 Sistema de Loading

#### **Componentes Disponíveis**
- **Skeleton**: `src/components/ui/skeleton.tsx`
- **Spinner**: Não encontrado (precisa criar ou usar lib)
- **Progress**: `src/components/ui/progress.tsx`

#### **Como Progress é Usado**
- **Arquivo**: `/src/components/ui/progress.tsx`
- **Interface**:
```typescript
<Progress value={60} />  // value: 0-100
```
- **⚠️ AÇÃO**: Usar `<Progress>` para mostrar progresso de cálculo

### 4.2 Sistema de Toast

#### **Library**: Sonner
- **Arquivo**: `/src/components/ui/sonner.tsx`
- **Setup**: Já configurado em `App.tsx` (linha 14)
- **Como usar**:
```typescript
import { toast } from "sonner";

toast.success("Cálculo concluído!");
toast.error("Erro ao buscar dados de elevação");
toast.loading("Calculando zonas de risco...");
```
- **⚠️ AÇÃO**: Usar toasts para feedback de API calls

### 4.3 Design System

#### **Cores de Risco**
- **Atualmente no código**:
  - Crítico: `#ef4444` (red-500)
  - Alto: `#f97316` (orange-500)
  - Moderado: `#eab308` (yellow-500)
  - Baixo: `#22c55e` (green-500)

- **⚠️ AÇÃO**: Adicionar cor para MUITO ALTO:
  - Sugestão: `#991b1b` (red-800) ou `#dc2626` (red-600)

#### **Classes Tailwind Usadas**
- **Cards**: `rounded-lg border bg-card p-4 shadow-sm`
- **Stats**: Grid cols-2 ou cols-4
- **Botões**: Shadcn/UI `<Button>`
- **⚠️ IMPACTO**: Manter consistência visual

---

## ✅ CATEGORIA 5: PERFORMANCE & OTIMIZAÇÃO

### 5.1 Web Workers

#### **Vite Suporte**
- **Configuração**: `vite.config.ts` (linha 6-16)
- **Plugins**: `@vitejs/plugin-react-swc` (compilação rápida)
- **Como criar Worker**:
```typescript
const worker = new Worker(new URL('./worker.ts', import.meta.url), {
  type: 'module'
});
```
- **⚠️ AÇÃO**: Criar `src/workers/riskCalculation.worker.ts`

### 5.2 React Query Cache

#### **Configuração Atual**
- **Arquivo**: `/src/App.tsx` (linha 12)
```typescript
const queryClient = new QueryClient();
```
- **Config Padrão**:
  - Cache time: 5 minutos
  - Stale time: 0 (refetch imediato)
  - Retry: 3x

- **⚠️ AÇÃO**: Configurar cache customizado para cálculos:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 30, // 30 min
      cacheTime: 1000 * 60 * 60,  // 1 hora
    },
  },
});
```

### 5.3 Renderização de 100 Marcadores

#### **Problema Potencial**
- **Map.tsx useEffect** (linha 93-118): renderiza TODOS os markers de uma vez
- **Com 100 zonas**: Pode ter lag inicial

#### **Soluções Possíveis**
1. **Leaflet.markercluster**: Agrupar markers próximos
2. **Virtualização**: Renderizar só markers visíveis no viewport
3. **preferCanvas**: true (já configurado linha 61)

- **⚠️ AÇÃO**: Testar com 100 zonas primeiro, otimizar se necessário

---

## ✅ CATEGORIA 6: TIPOS & INTERFACES TYPESCRIPT

### 6.1 Localização Atual

#### **Tipos Inline (não centralizados)**
- `RiskZone`: `/src/components/Map.tsx` (linha 6-12)
- `MapProps`: `/src/components/Map.tsx` (linha 15-19)
- `ZoneDetailModalProps`: `/src/components/ZoneDetailModal.tsx` (linha 10-18)
- `Zone` (Prefeitura): `/src/components/PrefeituraZoneModal.tsx` (linha 11-18)

#### **⚠️ PROBLEMA**: Inconsistências
- `id` vs `zone_id`
- Campos opcionais diferentes

### 6.2 Tipos Necessários a Criar

#### **Arquivo Sugerido**: `/src/types/index.ts`

```typescript
// ===== GEO & COORDENADAS =====
export interface Coordinates {
  lat: number;
  lon: number;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
  centerLat: number;
  centerLon: number;
}

// ===== CIDADES =====
export interface City {
  code: string;           // Código IBGE
  name: string;
  state: string;          // UF
  coordinates: Coordinates;
}

// ===== ZONAS DE RISCO =====
export interface RiskZone {
  id: number;
  coordinates: Coordinates;
  bbox: BoundingBox;
  score: number;          // 0-100
  level: RiskLevel;
  total_imoveis?: number;
  populacao_estimada?: number;
}

export type RiskLevel = 
  | "MUITO_ALTO"   // ≥75%
  | "ALTO"         // ≥50%
  | "MODERADO"     // ≥30%
  | "BAIXO";       // <30%

export interface RiskClassification {
  nivel: string;        // "🔴 MUITO ALTO"
  cor: string;          // "#991b1b"
  prioridade: number;   // 1-5
}

// ===== FATORES DE RISCO =====
export interface RiskFactor {
  nome: string;
  valor: number | string;
  peso: number;         // 0-1
  score?: number;       // 0-1
}

// ===== INFRAESTRUTURA OSM =====
export interface OSMElement {
  id: number;
  type: string;
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
  nodes?: number[];
}

export interface InfrastructureData {
  rios: OSMElement[];
  construcoes: OSMElement[];
  areasVerdes: OSMElement[];
  vias: OSMElement[];
  totalElementos: number;
}

// ===== ELEVAÇÃO =====
export interface ElevationPoint {
  latitude: number;
  longitude: number;
  elevation: number;
}

// ===== RESULTADO DE CÁLCULO =====
export interface ZoneRiskResult {
  id: number;
  coordinates: Coordinates;
  bbox: BoundingBox;
  scoreNormalizado: number;   // 0-100
  score: number;              // 0-1
  nivel: string;
  cor: string;
  prioridade: number;
  fatores: RiskFactor[];
  declividade: number;
  recomendacoes: string[];
}

// ===== PROGRESSO DE CÁLCULO =====
export interface CalculationProgress {
  total: number;
  completed: number;
  percentage: number;
  currentZone?: number;
  status: "idle" | "fetching_data" | "calculating" | "done" | "error";
  error?: string;
}
```

- **⚠️ AÇÃO**: Criar esse arquivo e importar em todos os componentes

---

## ✅ CATEGORIA 7: INTEGRAÇÕES & DEPENDÊNCIAS

### 7.1 Mapeamento de Dependências

#### **Quem Depende de Quê**

**ClimaSeguro.tsx depende de:**
- `Map.tsx` (renderização do mapa)
- `ZoneDetailModal.tsx` (modal de detalhes)
- `cities` (mock data - **SERÁ SUBSTITUÍDO**)
- `mockZones` (mock data - **SERÁ SUBSTITUÍDO**)

**Map.tsx depende de:**
- `leaflet` (biblioteca)
- `RiskZone[]` (dados de zonas)
- `onZoneClick` callback (comunicação com pai)

**ZoneDetailModal.tsx depende de:**
- Dados hardcoded (PRECISA RECEBER DADOS REAIS)

#### **⚠️ IMPACTO DA MUDANÇA**

**Se alterarmos `RiskZone` interface:**
- ✅ Map.tsx: precisa atualizar
- ✅ ClimaSeguro.tsx: precisa atualizar estado
- ✅ ZoneDetailModal.tsx: precisa atualizar props

**Se criarmos novo serviço de cálculo:**
- ✅ ClimaSeguro.tsx: chamar serviço ao selecionar cidade
- ✅ Não afeta Map.tsx (só recebe dados)
- ✅ Não afeta Modal (só recebe dados)

### 7.2 Fluxo de Dados Atual

```
User seleciona cidade
      ↓
ClimaSeguro.setSelectedCity()
      ↓
getCityCoordinates() → [lat, lon]
      ↓
<Map center={[lat,lon]} zones={mockZones} />
      ↓
Map renderiza marcadores
      ↓
User clica em marcador
      ↓
onZoneClick(zone)
      ↓
setSelectedZone(zone) + setModalOpen(true)
      ↓
<ZoneDetailModal zone={zone} open={true} />
```

### 7.3 Fluxo de Dados FUTURO

```
User seleciona cidade
      ↓
ClimaSeguro.setSelectedCity(code)
      ↓
[NOVO] useEffect detecta mudança
      ↓
[NOVO] Dispara cálculo de risco:
   1. fetchBoundingBox(code)
   2. divideIntoZones(bbox, 100)
   3. Para cada zona (Web Worker):
      - fetchOSMInfrastructure(zone.bbox)
      - fetchElevation(zone.bbox)
      - calculateZoneRisk(...)
   4. Atualiza estado progressivamente
      ↓
<Map center={coords} zones={calculatedZones} />
   (atualiza conforme zonas são calculadas)
      ↓
User clica em marcador
      ↓
onZoneClick(zone) → zone agora tem dados reais
      ↓
<ZoneDetailModal zone={zone} />
   (exibe fatores, declividade, recomendações)
```

---

## ✅ CATEGORIA 8: ARQUIVOS A CRIAR

### 8.1 Estrutura de Pastas Proposta

```
src/
  constants/
    apiEndpoints.ts       [NOVO] - URLs das APIs
    riskWeights.ts        [NOVO] - PESOS_RISCO
    historicalData.ts     [NOVO] - HISTORICO_DESASTRES
  
  types/
    index.ts              [NOVO] - Todas as interfaces
  
  services/
    geocoding.ts          [NOVO] - fetchBoundingBox()
    infrastructure.ts     [NOVO] - fetchOSMInfrastructure()
    elevation.ts          [NOVO] - fetchElevation()
    riskCalculation.ts    [NOVO] - calculateZoneRisk() + main orchestrator
  
  utils/
    terrainCalculations.ts [NOVO] - calculateSlope()
    gridUtils.ts          [NOVO] - divideIntoZones()
    riskClassification.ts [NOVO] - classifyRisk()
    recommendations.ts    [NOVO] - generateRecommendations()
  
  workers/
    riskCalculation.worker.ts [NOVO] - Cálculo em background
  
  hooks/
    useRiskCalculation.ts [NOVO] - Hook customizado para orquestrar cálculo
  
  pages/
    ClimaSeguro.tsx       [MODIFICAR] - Integrar novo sistema
  
  components/
    Map.tsx               [MODIFICAR] - Suportar 100 zonas
    ZoneDetailModal.tsx   [MODIFICAR] - Receber dados reais
    CalculationProgress.tsx [NOVO] - Componente de progresso
```

### 8.2 Ordem de Implementação Sugerida

1. **Fase 1: Base**
   - Criar `/types/index.ts`
   - Criar `/constants/*.ts`

2. **Fase 2: Serviços**
   - Criar `/services/geocoding.ts`
   - Criar `/services/elevation.ts`
   - Criar `/services/infrastructure.ts`

3. **Fase 3: Utilitários**
   - Criar `/utils/gridUtils.ts`
   - Criar `/utils/terrainCalculations.ts`
   - Criar `/utils/riskClassification.ts`

4. **Fase 4: Cálculo Principal**
   - Criar `/services/riskCalculation.ts`
   - Criar `/workers/riskCalculation.worker.ts` (opcional)

5. **Fase 5: Hook & UI**
   - Criar `/hooks/useRiskCalculation.ts`
   - Criar `/components/CalculationProgress.tsx`

6. **Fase 6: Integração**
   - Modificar `ClimaSeguro.tsx`
   - Modificar `ZoneDetailModal.tsx`
   - Testar fluxo completo

---

## 📊 RESUMO EXECUTIVO DE ACHADOS

### ✅ O QUE ESTÁ FUNCIONANDO
1. Mapa Leaflet renderiza corretamente
2. Sistema de rotas React Router
3. Modal de detalhes abre ao clicar em zona
4. React Query configurado (pode ser usado para cache)
5. Sonner (toasts) configurado
6. Shadcn/UI components disponíveis

### ⚠️ O QUE PRECISA MUDAR
1. **Dados mockados** → Calcular dinamicamente
2. **Cidade hardcoded** → Buscar de API/JSON
3. **10 zonas** → 100 zonas (10x10 grid)
4. **Interface RiskZone** → Adicionar campos calculados
5. **ZoneDetailModal** → Receber dados reais (não hardcoded)
6. **Thresholds de risco** → Ajustar para ≥75% (muito alto) e ≥50% (alto)

### 🚨 PONTOS CRÍTICOS DE ATENÇÃO
1. **Performance**: 100 markers podem ter lag → testar/otimizar
2. **APIs externas**: Overpass e Open-Elevation podem falhar → fallback necessário
3. **Inconsistência de nomes**: `id` vs `zone_id` → padronizar
4. **Tipos não centralizados** → criar `/types/index.ts`
5. **Web Worker**: Necessário para não travar UI durante cálculo

### 📦 FUNÇÕES DO BACKEND A PORTAR (11 funções)
1. `buscarBoundingBox()` → `/services/geocoding.ts`
2. `buscarInfraestruturaOSM()` → `/services/infrastructure.ts`
3. `buscarElevacao()` → `/services/elevation.ts`
4. `calcularDeclividade()` → `/utils/terrainCalculations.ts`
5. `dividirEmZonas()` → `/utils/gridUtils.ts`
6. `calcularScoreZona()` → `/services/riskCalculation.ts`
7. `classificarRisco()` → `/utils/riskClassification.ts`
8. `gerarRecomendacoes()` → `/utils/recommendations.ts`
9. `PESOS_RISCO` → `/constants/riskWeights.ts`
10. `HISTORICO_DESASTRES` → `/constants/historicalData.ts`
11. `APIS` → `/constants/apiEndpoints.ts`

### 🎯 PRÓXIMA AÇÃO RECOMENDADA
**Criar estrutura de pastas + tipos base** antes de começar a portar funções

---

**Status**: 🔍 Investigação completa - Aguardando aprovação para implementação

---

# 🎯 PLANO DE IMPLEMENTAÇÃO - TASKS ESTRUTURADAS

## 📋 METODOLOGIA DE CRIAÇÃO DAS TASKS

**Critérios Seguidos:**
1. **Dependências mapeadas**: Cada task lista o que precisa estar pronto antes dela
2. **Impacto analisado**: O que cada mudança afeta no código existente  
3. **Ordem lógica**: Base → Serviços → Integração → Testes
4. **Validação clara**: Como testar se funcionou sem quebrar nada
5. **Explicação técnica**: Por que a task foi estruturada dessa forma

---

## ⚠️ TASK 1: CRIAR ESTRUTURA BASE DE TIPOS E CONSTANTES

**Prioridade**: 🔴 CRÍTICA (Bloqueante para tudo)  
**Dependências**: Nenhuma  
**Tempo Estimado**: 30 minutos  

### 📝 Escopo da Task
Criar arquivos de tipos e constantes que serão importados por todos os outros arquivos. Esta é a task mais crítica pois **todos os serviços, utils e componentes dependem dessas definições**.

### 🔧 Passos Detalhados

**Passo 1 - Criar estrutura de pastas**
```bash
mkdir -p src/constants src/types
```

**Passo 2 - Criar /src/types/index.ts**
- Centralizar TODAS as interfaces espalhadas no código
- Resolver inconsistência `id` vs `zone_id` (usar `id` padrão)
- Adicionar tipos para APIs (OSM, elevação, etc.)

**Passo 3 - Criar /src/constants/apiEndpoints.ts**
- URLs das APIs externas (INMET, IBGE, Overpass, etc.)
- Configuração de timeouts e retries

**Passo 4 - Criar /src/constants/riskWeights.ts**
- Portar PESOS_RISCO do backend
- Manter valores idênticos para consistência

**Passo 5 - Criar /src/constants/historicalData.ts**
- Portar HISTORICO_DESASTRES do backend
- Adicionar novos estados se necessário

**Passo 6 - Verificar imports atuais**
- Listar onde `RiskZone` é usado atualmente (Map.tsx, ClimaSeguro.tsx)
- Preparar para substituir por import centralizado

### 💡 Explicação do Motivo da Task

**Por que esta task é estruturada assim:**

Baseado na investigação, identifiquei que existem **4 interfaces diferentes espalhadas pelos componentes** (`RiskZone` em Map.tsx, `Zone` em PrefeituraZoneModal.tsx, etc.) com **inconsistências críticas** (campo `id` vs `zone_id`). 

Se eu começar criando serviços sem definir os tipos centralizados primeiro, vou ter que refatorar tudo depois quando descobrir incompatibilidades. Por exemplo: o `Map.tsx` espera `RiskZone.id` mas `PrefeituraZoneModal.tsx` usa `Zone.zone_id` - isso vai gerar erro de tipo na hora de integrar.

Além disso, o backend usa constantes como `PESOS_RISCO.DECLIVIDADE.PLANO: 0.1` e se eu hardcodar esses valores nos serviços, vai ficar impossível manter consistência. Criando as constantes primeiro, garanto que frontend e backend usem os mesmos valores.

**A ordem específica dos passos:**
1. Pastas primeiro (óbvio)
2. Tipos antes de constantes (constantes podem usar tipos)
3. Verificação de imports por último (pra saber o que vai quebrar)

### ✅ Teste de Validação

**Como validar que não quebrou nada:**

1. **Teste de compilação**:
```bash
npm run build
```
- Deve compilar sem erros TypeScript

2. **Teste de imports**:
```bash
grep -r "interface.*Zone\|interface.*Risk" src/ --include="*.tsx" --include="*.ts"
```
- Confirmar que interfaces antigas ainda existem (não removemos ainda)

3. **Teste de aplicação**:
- Rodar `npm run dev`
- Navegar para `/climaseguro`
- Verificar que mapa carrega e modal abre
- **Não deve ter nenhuma regressão visual**

---

## ⚠️ TASK 2: CRIAR SERVIÇOS DE APIs EXTERNAS

**Prioridade**: 🔴 CRÍTICA  
**Dependências**: Task 1 (tipos e constantes)  
**Tempo Estimado**: 2 horas  

### 📝 Escopo da Task
Implementar os 3 serviços de APIs externas que são **blocantes para o cálculo de risco**: geocoding (bounding box), elevação e infraestrutura OSM. Sem esses dados, é impossível calcular o score de uma zona.

### 🔧 Passos Detalhados

**Passo 1 - Investigar uso atual de fetch**
```bash
grep -r "fetch\|axios" src/ --include="*.tsx" --include="*.ts"
```
- Confirmar que não há nenhum client HTTP configurado ainda
- Verificar se TanStack Query está sendo usado em algum lugar

**Passo 2 - Criar /src/services/geocoding.ts**
- Portar `buscarBoundingBox()` do backend
- Implementar fallback: Nominatim → IBGE malha
- Usar tipos `BoundingBox` e `City` criados na Task 1
- Adicionar tratamento de erro para ambas as APIs

**Passo 3 - Criar /src/services/elevation.ts**
- Portar `buscarElevacao()` do backend  
- API Open-Elevation com grid de pontos
- Retornar array de `ElevationPoint[]`
- Adicionar retry para falhas de rede

**Passo 4 - Criar /src/services/infrastructure.ts**
- Portar `buscarInfraestruturaOSM()` do backend
- Query Overpass complexa (rios, construções, áreas verdes, vias)
- Retornar `InfrastructureData` tipado
- Timeout de 30 segundos (Overpass é lenta)

**Passo 5 - Configurar error handling padrão**
- Criar interceptor para logs
- Padronizar formato de erro entre serviços
- Definir códigos de retry por tipo de erro

**Passo 6 - Verificar endpoints em produção**
- Testar se URLs das APIs estão funcionando
- Validar rate limits (especialmente Overpass)

### 💡 Explicação do Motivo da Task

**Por que esta task vem agora:**

Investigando o `risco_regional_opensource.js`, identifiquei que **todas as funções de cálculo dependem de dados externos**. A função `calcularScoreZona()` precisa de:
- Bounding box da cidade (geocoding)
- Pontos de elevação para calcular declividade  
- Elementos OSM para calcular proximidade de rios e densidade urbana

Se eu criar primeiro as funções de cálculo (como `calcularDeclividade()`), vou ficar sem dados para testar. Por isso preciso garantir que os serviços de API funcionem ANTES.

**A ordem específica:**
1. Geocoding primeiro: sem bounding box, não consigo dividir em zonas
2. Elevation depois: menos crítico, mas usado no cálculo de declividade
3. Infrastructure por último: é o mais complexo (query Overpass) e o que mais pode falhar

Também notei na investigação que **TanStack Query está instalado mas não usado**. Esses serviços serão perfeitos para testar a integração com cache antes de partir para o cálculo completo.

### ✅ Teste de Validação

**Como validar que funciona:**

1. **Teste unitário de geocoding**:
```typescript
// Criar script: /scripts/test-geocoding.ts
import { fetchBoundingBox } from '../src/services/geocoding';

const testCuritiba = await fetchBoundingBox("Curitiba", "PR", "4106902");
console.log("Bounding box Curitiba:", testCuritiba);
```

2. **Teste de elevation**:
```typescript
// Usar bounding box de Curitiba do teste anterior
const elevationData = await fetchElevation(testCuritiba, 3); // Grid 3x3
console.log("Pontos de elevação:", elevationData?.length);
```

3. **Teste de infrastructure**:
```typescript
// Teste com área pequena para não sobrecarregar Overpass
const infraData = await fetchOSMInfrastructure(smallBbox);
console.log("Elementos OSM:", infraData?.totalElementos);
```

4. **Teste de integração**:
- Rodar script: `npm run dev && node scripts/test-services.js`
- Todos os 3 serviços devem retornar dados válidos
- **Não pode quebrar aplicação existente**

---

## ⚠️ TASK 3: IMPLEMENTAR UTILITÁRIOS DE CÁLCULO

**Prioridade**: 🟡 ALTA  
**Dependências**: Task 1 (tipos) + Task 2 (dados de teste)  
**Tempo Estimado**: 1.5 horas  

### 📝 Escopo da Task
Criar as funções matemáticas e de processamento que **transformam dados brutos em scores de risco**. São funções puras (sem side effects) que fazem os cálculos complexos de declividade, divisão de grid e classificação.

### 🔧 Passos Detalhados

**Passo 1 - Verificar dependências matemáticas**
- Confirmar se Haversine está implementado em algum lugar
- Verificar se existe alguma lib de geoprocessamento já instalada

**Passo 2 - Criar /src/utils/terrainCalculations.ts**
- Portar `calcularDeclividade()` do backend
- Implementar fórmula Haversine para distância
- Função deve receber `ElevationPoint[]` e retornar number (%)
- Adicionar validação para casos extremos (pontos insuficientes)

**Passo 3 - Criar /src/utils/gridUtils.ts**
- Portar `dividirEmZonas()` do backend
- Modificar para gerar 100 zonas (10x10) em vez de 9
- Função recebe `BoundingBox` e retorna array de `RiskZone` (sem score ainda)
- Cada zona deve ter bbox próprio e coordenadas centrais

**Passo 4 - Criar /src/utils/riskClassification.ts**
- Portar `classificarRisco()` do backend
- **MODIFICAR thresholds** conforme requisito:
  - ≥75%: "MUITO ALTO" (nova categoria)
  - ≥50%: "ALTO"  
  - <50%: não exibir (filtrar no componente)
- Retornar objeto `RiskClassification` com nivel/cor/prioridade

**Passo 5 - Criar /src/utils/recommendations.ts**
- Portar `gerarRecomendacoes()` do backend
- Simplificar lógica inicial (pode expandir depois)
- Função recebe resultado de cálculo e retorna `string[]`

**Passo 6 - Verificar não há conflito com utils existente**
- Conferir que `src/lib/utils.ts` só tem função `cn()`
- Garantir que novos utils não sobrescrevem nada

### 💡 Explicação do Motivo da Task

**Por que agora e nesta ordem:**

Analisando o fluxo do backend, identifiquei que estas são **funções puras** que não dependem de estado React ou APIs - só fazem transformações matemáticas. Por isso podem ser testadas independentemente.

A ordem específica é baseada na **complexidade e dependências internas**:

1. **terrainCalculations.ts primeiro**: É usado por `riskCalculation.ts` para calcular peso de declividade (30% do score total). Se eu fizer o cálculo principal sem ter a declividade funcionando, vou ter 30% do score sempre zerado.

2. **gridUtils.ts depois**: Preciso das 100 zonas definidas antes de calcular o risco de cada uma. Esta função é chamada UMA vez por cidade, mas seu resultado alimenta 100 cálculos.

3. **riskClassification.ts em seguida**: Esta função converte o score numérico (0-100) para categoria visual ("MUITO ALTO", etc.). Preciso dela para testar se os cálculos estão gerando valores esperados.

4. **recommendations.ts por último**: É "nice to have" e não afeta o cálculo principal.

Pela investigação, vi que o **Map.tsx** já tem lógica de cores baseada em score (`score >= 70 ? red`), então preciso garantir que minha classificação seja compatível.

### ✅ Teste de Validação

**Como validar que funcionam:**

1. **Teste de terrainCalculations**:
```typescript
// Script: /scripts/test-terrain.ts
const pontos = [
  { latitude: -25.4284, longitude: -49.2733, elevation: 934 },
  { latitude: -25.4285, longitude: -49.2734, elevation: 936 },
  // ... mais pontos
];
const declividade = calculateSlope(pontos);
console.log("Declividade calculada:", declividade + "%");
// Deve retornar valor entre 0-100%
```

2. **Teste de gridUtils**:
```typescript
const bbox = { minLat: -25.5, maxLat: -25.4, minLon: -49.3, maxLon: -49.2 };
const zonas = divideIntoZones(bbox, 100);
console.log("Zonas geradas:", zonas.length); // Deve ser exatamente 100
console.log("Primeira zona:", zonas[0]); // Deve ter id, bbox, center
```

3. **Teste de classificação**:
```typescript
console.log(classifyRisk(85)); // Deve retornar "MUITO ALTO"
console.log(classifyRisk(65)); // Deve retornar "ALTO"  
console.log(classifyRisk(45)); // Deve retornar categoria que será filtrada
```

4. **Integração**:
- Rodar `npm run build` (deve compilar)
- Executar todos os testes em sequência
- **Funções devem ser determinísticas** (mesmo input = mesmo output)

---

## ⚠️ TASK 4: CRIAR SERVIÇO PRINCIPAL DE CÁLCULO DE RISCO

**Prioridade**: 🔴 CRÍTICA (Core business logic)  
**Dependências**: Tasks 1, 2, 3 (tudo anterior)  
**Tempo Estimado**: 2.5 horas  

### 📝 Escopo da Task
Implementar a **função mais crítica** do sistema: `calculateZoneRisk()`. Esta função orquestra TODOS os outros serviços e utils para calcular o score final de uma zona. É o coração da lógica de negócio.

### 🔧 Passos Detalhados

**Passo 1 - Analisar função original do backend**
- Ler linha por linha `calcularScoreZona()` em `risco_regional_opensource.js`
- Mapear EXATAMENTE os 5 fatores de peso:
  - Histórico (20%): `HISTORICO_DESASTRES[uf]`
  - Declividade (30%): `calcularDeclividade()` → mapear para `PESOS_RISCO.DECLIVIDADE`
  - Rios (25%): contar rios dentro da zona bbox
  - Urbanização (15%): % construções vs total elementos OSM
  - Vegetação (10%): % áreas verdes vs total elementos

**Passo 2 - Verificar compatibilidade de inputs**
- Conferir que tipos criados na Task 1 batem com parâmetros esperados
- Validar que serviços da Task 2 retornam dados no formato correto
- Testar que utils da Task 3 processam dados corretamente

**Passo 3 - Criar /src/services/riskCalculation.ts**
- Função principal: `calculateZoneRisk(zone, infrastructure, elevation, uf)`
- Implementar EXATAMENTE o mesmo algoritmo do backend
- Retornar objeto `ZoneRiskResult` com score, nível, fatores detalhados
- Adicionar logs detalhados para debug

**Passo 4 - Implementar função orquestradora**
- `calculateCityRisk(cityCode, progress callback)`
- Fluxo: fetchBoundingBox → divideIntoZones → para cada zona:
  - fetchOSMInfrastructure
  - fetchElevation  
  - calculateZoneRisk
- Callback de progresso para UI (zona X de 100)

**Passo 5 - Adicionar cache e retry**
- Usar TanStack Query para cache de resultados
- Implementar retry inteligente (falha de elevation? tentar com menos pontos)
- Cache por cidade (key: código IBGE + timestamp)

**Passo 6 - Verificar impacto em componentes**
- Listar onde `mockZones` é usado (ClimaSeguro.tsx)
- Verificar formato esperado pelo Map.tsx (deve ser compatível)

### 💡 Explicação do Motivo da Task

**Por que esta é a task mais crítica:**

Pela investigação do `risco_regional_opensource.js`, esta função é literalmente o **core business logic** do sistema. Ela implementa o algoritmo proprietário que diferencia o ClimaSeguro de outras soluções.

**Por que vem após as outras 3 tasks:**
- **Task 1**: Preciso dos tipos `InfrastructureData`, `ElevationPoint`, `RiskFactor` 
- **Task 2**: Preciso dos dados reais para cada zona (sem mock)
- **Task 3**: Preciso das funções `calculateSlope()`, `classifyRisk()` 

Se eu inverter a ordem, vou ficar implementando com dados mockados e depois refatorar tudo.

**A estrutura em 2 funções (calculateZoneRisk + calculateCityRisk):**

Analisando o frontend atual, o `ClimaSeguro.tsx` tem estado para `selectedCity` e array `mockZones`. Preciso substituir:
- `selectedCity` → dispara `calculateCityRisk()`
- `mockZones` → resultado das 100 zonas calculadas

A função orquestradora (`calculateCityRisk`) vai gerenciar **progress feedback** para UX (mostra "Calculando zona 15 de 100...") e **error handling** (se falhar 1 zona, não quebra as outras 99).

### ✅ Teste de Validação

**Como validar que está correto:**

1. **Teste com dados conhecidos**:
```typescript
// Usar dados de Curitiba que já tem no mock
const curitibaBbox = await fetchBoundingBox("Curitiba", "PR", "4106902");
const zonas = divideIntoZones(curitibaBbox, 4); // Teste com 4 zonas só

for (const zona of zonas) {
  const infra = await fetchOSMInfrastructure(zona.bbox);
  const elevation = await fetchElevation(zona.bbox, 3);
  const result = await calculateZoneRisk(zona, infra, elevation, "PR");
  
  console.log(`Zona ${zona.id}:`, {
    score: result.scoreNormalizado,
    nivel: result.nivel,
    fatores: result.fatores.map(f => `${f.nome}: ${f.valor}`)
  });
}
```

2. **Teste de consistência**:
- Rodar cálculo 2x com mesmos dados → deve dar mesmo resultado
- Verificar que score está entre 0-100
- Verificar que soma dos pesos dos fatores = 1.0 (100%)

3. **Teste de progresso**:
```typescript
const results = await calculateCityRisk("4106902", (progress) => {
  console.log(`Progresso: ${progress.completed}/${progress.total} zonas`);
});
console.log("Resultados finais:", results.length); // Deve ser 100
```

4. **Teste de compatibilidade com Map**:
- Resultado deve ter formato compatível com `RiskZone` interface
- Testar que `Map.tsx` renderiza sem modificações
- **Não pode quebrar aplicação existente**

---

## ⚠️ TASK 5: CRIAR HOOK CUSTOMIZADO PARA REACT

**Prioridade**: 🟡 ALTA  
**Dependências**: Task 4 (cálculo funcionando)  
**Tempo Estimado**: 1 hora  

### 📝 Escopo da Task
Criar hook React que **encapsula toda a lógica de cálculo** e expõe interface simples para componentes. Este hook vai gerenciar estado de loading, error, progresso e cache usando TanStack Query.

### 🔧 Passos Detalhados

**Passo 1 - Analisar padrão de hooks existente**
- Verificar `src/hooks/use-mobile.tsx` e `src/hooks/use-toast.ts`
- Seguir mesmo padrão de nomenclatura e estrutura
- Confirmar que TanStack Query está sendo usado corretamente no App.tsx

**Passo 2 - Mapear estado necessário para UI**
- Loading state: idle → fetching_data → calculating → done/error
- Progress: zona atual sendo calculada (1-100)
- Error handling: qual API falhou, retry possível?
- Cache: resultados por cidade, invalidação automática

**Passo 3 - Criar /src/hooks/useRiskCalculation.ts**
```typescript
export function useRiskCalculation(cityCode?: string) {
  // Return: { data, isLoading, error, progress, refetch }
}
```
- Usar `useQuery` para cache automático
- Key: `['risk-calculation', cityCode]`
- Enabled apenas quando cityCode existe
- Stale time: 30 minutos (dados não mudam frequentemente)

**Passo 4 - Implementar progress callback**
- Estado interno para progresso atual
- Callback que atualiza estado conforme zonas são calculadas
- Percentage calculado automaticamente

**Passo 5 - Adicionar error recovery**
- Retry diferenciado por tipo de erro (rede vs dados inválidos)
- Fallback para menor resolução se elevation falhar
- Log estruturado para debug

**Passo 6 - Verificar integração com ClimaSeguro.tsx**
- Planejar substituição do estado atual: `selectedCity` + `mockZones`
- Por: `const { data: zones, isLoading, progress } = useRiskCalculation(selectedCity)`

### 💡 Explicação do Motivo da Task

**Por que um hook customizado:**

Investigando o `ClimaSeguro.tsx`, vi que atualmente usa estado local simples (`useState`). Mas o cálculo de risco envolve:
- Múltiplas APIs assíncronas
- Progresso granular (100 zonas)
- Cache inteligente
- Error handling sofisticado

Se eu colocar toda essa lógica diretamente no componente, vai ficar inviável de manter. O hook abstrai a complexidade e permite reusar em outros componentes.

**Por que TanStack Query:**

A biblioteca já está configurada no `App.tsx` mas **não está sendo usada em lugar nenhum** (descobri na investigação). É perfeita para este caso porque:
- Cache automático por chave (cidade)
- Background refetch
- Error retry com backoff
- Loading states automáticos

**Por que vem depois do Task 4:**

Preciso da função `calculateCityRisk()` funcionando para testar o hook. Se eu criar o hook primeiro, vou ter que usar dados mock - depois refatorar tudo.

### ✅ Teste de Validação

**Como validar que funciona:**

1. **Teste isolado do hook**:
```typescript
// Script: /scripts/test-hook.ts
import { renderHook } from '@testing-library/react';
import { useRiskCalculation } from '../src/hooks/useRiskCalculation';

const { result } = renderHook(() => useRiskCalculation("4106902"));

// Deve começar loading
expect(result.current.isLoading).toBe(true);

// Aguardar conclusão 
await waitFor(() => expect(result.current.isLoading).toBe(false));

// Verificar dados
expect(result.current.data).toHaveLength(100);
expect(result.current.data[0]).toHaveProperty('score');
```

2. **Teste de cache**:
```typescript
// Primeira chamada
const hook1 = renderHook(() => useRiskCalculation("4106902"));
await waitFor(() => !hook1.result.current.isLoading);

// Segunda chamada (deve usar cache)
const hook2 = renderHook(() => useRiskCalculation("4106902"));
expect(hook2.result.current.isLoading).toBe(false); // Deve ser imediato
```

3. **Teste de progresso**:
```typescript
const { result } = renderHook(() => useRiskCalculation("4106902"));
let progressUpdates = [];

// Coletar updates de progresso
result.current.progress && progressUpdates.push(result.current.progress);

// Deve ter pelo menos 5 updates (0%, 25%, 50%, 75%, 100%)
expect(progressUpdates.length).toBeGreaterThan(5);
```

4. **Teste real no browser**:
- Abrir `/climaseguro`
- Selecionar cidade 
- **Verificar que progresso aparece**
- **Verificar que mapa atualiza progressivamente**
- **Aplicação não pode travar durante cálculo**

---

## ⚠️ TASK 6: INTEGRAR CÁLCULO NO COMPONENTE PRINCIPAL

**Prioridade**: 🔴 CRÍTICA (Entrega final)  
**Dependências**: Task 5 (hook pronto) + validação de todas as anteriores  
**Tempo Estimado**: 1.5 horas  

### 📝 Escopo da Task
**MODIFICAR** o `ClimaSeguro.tsx` para substituir dados mockados pelo **cálculo real de 100 zonas**. Esta é a integração final que torna o sistema funcional conforme especificado.

### 🔧 Passos Detalhados

**Passo 1 - Fazer backup e analisar impacto**
```bash
cp src/pages/ClimaSeguro.tsx src/pages/ClimaSeguro.tsx.backup
```
- Mapear EXATAMENTE o que será removido: `cities`, `mockZones`
- Mapear o que será mantido: `getCityCoordinates()`, `handleZoneClick()`
- Verificar que interface do Map.tsx ainda será compatível

**Passo 2 - Investigar lista de cidades real**
```bash
grep -r "4106902\|São Paulo\|Rio de Janeiro" src/
```
- Confirmar que códigos IBGE estão corretos
- Decidir se cities mockado vira JSON estático ou API call
- Para MVP: criar cities.json com dados expandidos

**Passo 3 - Substituir estado mockado**
```typescript
// REMOVER:
const [selectedCity, setSelectedCity] = useState<string>("");
const mockZones = [...]; // Todo o array

// ADICIONAR:  
const [selectedCity, setSelectedCity] = useState<string>("");
const { data: calculatedZones, isLoading, error, progress } = useRiskCalculation(selectedCity);
```

**Passo 4 - Atualizar renderização condicional**
- Substituir verificação `selectedCity && mockZones.length`
- Por: `selectedCity && (calculatedZones?.length || isLoading)`
- Manter Map sempre renderizado, mas com zones condicionais

**Passo 5 - Adicionar componente de progresso**
- Mostrar progress bar quando `isLoading`
- Texto: "Calculando zona {progress.completed} de {progress.total}"
- Erro com toast: `toast.error(error.message)` + botão retry

**Passo 6 - Verificar não quebra outras funcionalidades**
- `getCityCoordinates()` ainda funciona (mantida intacta)
- `handleZoneClick()` ainda funciona (interface compatível)
- Modal ainda abre com dados corretos

### 💡 Explicação do Motivo da Task

**Por que esta task é crítica:**

Esta é a **entrega final** que torna o requisito funcional: "quando eu entrar numa cidade, efetivamente seja calculado o risco pra 100 zonas". Sem ela, todas as tasks anteriores são só infra sem valor de negócio.

**Por que vem por último:**

Pela investigação, identifiquei que o `ClimaSeguro.tsx` é o **ponto de integração** de todo o sistema. Ele conecta:
- User input (dropdown cidade)
- Estado da aplicação (loading, dados)
- Visualização (Map.tsx)
- Interação (ZoneDetailModal.tsx)

Se eu modificar este componente ANTES das outras tasks estarem prontas, vou quebrar a aplicação e não conseguir testar nada.

**A estratégia específica de manter interface compatível:**

O `Map.tsx` espera `zones: RiskZone[]`. Investigando o hook, vou retornar exatamente esse formato. Isso significa que **o Map.tsx não precisa ser modificado** - é a beleza de ter separado responsabilidades.

O `handleZoneClick()` recebe objeto zona e passa para modal. Se eu manter a interface, o modal também não precisa mudar inicialmente.

### ✅ Teste de Validação

**Como validar a integração completa:**

1. **Teste de regressão (não quebrou nada)**:
```bash
npm run dev
```
- Abrir `/climaseguro`
- SEM selecionar cidade → deve mostrar tela inicial
- Selecionar "Curitiba" → deve iniciar cálculo
- **Não pode dar erro no console**

2. **Teste de cálculo real**:
- Selecionar cidade → progress bar aparece
- Progress vai de 0% até 100%
- Mapa atualiza conforme zonas são calculadas
- Total de 100 marcadores aparecem no final
- **Tempo total não pode passar de 5 minutos**

3. **Teste de interação**:
- Clicar em zona → modal abre
- Modal mostra dados calculados (não hardcoded)
- Dados fazem sentido (score, nível, imóveis)

4. **Teste de cache**:
- Selecionar Curitiba → aguardar cálculo
- Trocar para outra cidade → calcular
- Voltar para Curitiba → **deve ser instantâneo** (cache)

5. **Teste de error handling**:
- Simular erro de rede → toast de erro aparece
- Botão retry funciona
- **Aplicação não trava com erro**

6. **Teste de performance**:
- 100 marcadores renderizam sem lag
- Zoom/pan do mapa funciona suavemente
- **Não pode consumir mais que 500MB RAM**

---

## ⚠️ TASK 7: OTIMIZAR PERFORMANCE E FINALIZAR UX

**Prioridade**: 🟢 MÉDIA (Polimento)  
**Dependências**: Task 6 (integração funcionando)  
**Tempo Estimado**: 2 horas  

### 📝 Escopo da Task
Ajustes de **performance e UX** após sistema funcional. Includes: otimização do Map.tsx para 100 marcadores, melhoria de loading states, e implementação do filtro "≥50%" conforme requisito.

### 🔧 Passos Detalhados

**Passo 1 - Testar performance atual**
- Rodar cálculo completo de 100 zonas
- Medir tempo de renderização no Map.tsx
- Identificar gargalos (network, CPU, memory)

**Passo 2 - Otimizar renderização do mapa**
- Se lag > 1s: implementar clustering com Leaflet.markercluster
- Se memória > 300MB: implementar renderização virtual
- Configurar `preferCanvas: true` otimizado

**Passo 3 - Implementar filtro de exibição**
- Conforme requisito: só mostrar zonas ≥50% e ≥75%
- Filtrar no hook `useRiskCalculation`: `zones.filter(z => z.score >= 50)`
- Ajustar contadores (mostrar "15 zonas de alto risco" em vez de "100 zonas")

**Passo 4 - Melhorar feedback visual**
- Skeleton para cards de estatística
- Progress mais detalhado: "Buscando elevação da zona 23..."
- Animação suave quando zonas aparecem no mapa

**Passo 5 - Implementar cache inteligente**
- Invalidar cache se dados > 24h
- Pre-fetch de cidades mais acessadas
- Compressão de dados no localStorage

**Passo 6 - Testes de stress**
- Múltiplas cidades em sequência
- Múltiplos usuários simultâneos (se possível)
- Recovery de falhas de API

### 💡 Explicação do Motivo da Task

**Por que performance vem por último:**

"Premature optimization is the root of all evil". Pela investigação, não sei se 100 marcadores vão causar lag até testar com dados reais. Talvez o Leaflet com `preferCanvas: true` já aguente tranquilo.

**Por que o filtro ≥50% é importante:**

O requisito original diz mostrar zonas com score ≥50% como "ALTO" e ≥75% como "MUITO ALTO". Isso implica que zonas <50% NÃO devem aparecer (senão seria spam visual). Este filtro muda a UX significativamente.

### ✅ Teste de Validação

**Testes de performance:**

1. **Benchmark de renderização**:
```javascript
console.time('Map render');
// Trocar cidade (100 zonas)
console.timeEnd('Map render'); // Deve ser < 2 segundos
```

2. **Teste de memória**:
- Abrir DevTools → Memory
- Calcular 3 cidades diferentes
- **Memória não pode crescer linearmente** (vazamento)

3. **Teste de filtro**:
- Conferir que só zonas ≥50% aparecem
- Contar marcadores visíveis vs total calculado
- Estatísticas batem com marcadores visíveis

4. **Teste de UX**:
- Loading states são claros
- Usuário entende o progresso
- **Não fica confuso ou ansioso durante cálculo**

---

## 📊 RESUMO EXECUTIVO DO PLANO

### 🎯 Ordem de Execução (7 Tasks)

1. **Task 1** (30min): Tipos e constantes → Base para tudo
2. **Task 2** (2h): APIs externas → Dados para calcular  
3. **Task 3** (1.5h): Utils matemáticos → Processamento de dados
4. **Task 4** (2.5h): Cálculo principal → Core business logic
5. **Task 5** (1h): Hook React → Interface com componentes
6. **Task 6** (1.5h): Integração → Funcionalidade completa
7. **Task 7** (2h): Performance → Polimento final

**Tempo Total Estimado**: 10.5 horas

### ⚠️ Riscos Mapeados

1. **APIs externas podem falhar** → Retry + fallback implementados
2. **100 marcadores podem ter lag** → Otimização na Task 7
3. **Cálculo pode demorar muito** → Progress + Web Worker considerado
4. **Cache pode falhar** → Graceful degradation
5. **Tipos podem ter incompatibilidade** → Validação em cada task

### ✅ Critérios de Sucesso

**Funcional:**
- [x] Usuário seleciona cidade → cálculo inicia
- [x] 100 zonas calculadas e exibidas
- [x] Só zonas ≥50% aparecem no mapa
- [x] Modal mostra dados reais (não hardcoded)
- [x] Cache funciona entre sessões

**Técnico:**
- [x] Código não quebra funcionalidade existente
- [x] Performance aceitável (< 5min cálculo)
- [x] Error handling robusto
- [x] Types centralizados e consistentes

**UX:**
- [x] Feedback visual durante cálculo
- [x] Estados de erro são claros
- [x] Interface responsiva e intuitiva

---

**Status**: 📋 Tasks estruturadas - Pronto para implementação sequencial
