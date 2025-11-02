## Grande Mudança: Pipeline real de "Processo de Prevenção" (backend FastAPI + IA)

Este documento registra, em alto nível, o que será implementado e o que precisa ser investigado no repositório antes de executar as mudanças. É uma proposta inicial para validação. Nada aqui deve ser tomado como definitivo sem verificação no código e confirmação com o time.

### Resumo executivo

- Objetivo: transformar o fluxo hoje mockado de "Iniciar Processo de Prevenção" em um pipeline real, persistente e integrado a um backend FastAPI, com uso de IA de visão (Gemini) para descrever fotos e IA para geração de documentos específicos conforme o fundo de financiamento selecionado.
- Resultado esperado: ao concluir as 3 etapas do wizard (Fotos → Formulário → Validação), o sistema deverá:
  - Armazenar as fotos da vistoria e gerar descrições automáticas via Gemini Vision.
  - Persistir os dados técnicos da vistoria (responsável, data, observações, ação imediata, etc.).
  - Permitir a escolha de um programa/fundo de financiamento (a confirmar lista oficial) e gerar automaticamente os documentos requeridos por esse fundo, disponibilizando-os para visualização e download.
  - Registrar o processo e os documentos gerados no banco (tabela(s) propostas abaixo), possibilitando resgate posterior.

### Escopo de funcionalidade (proposta)

1) Etapa 1 – Upload de Fotos
   - Front envia as imagens para o backend.
   - Backend armazena e chama Gemini Vision (usando `GEMINI_API_KEY`) para produzir descrições objetivas úteis a laudos/relatórios (ex.: quantidade estimada de moradias visíveis, tipologia/estado aparente, sinais de risco, referências geográficas quando detectáveis, condições de encosta/drenagem, etc.).
   - Backend retorna metadados + descrições por imagem.

2) Etapa 2 – Formulário Técnico
   - Front envia os dados técnicos preenchidos para o backend, vinculando ao processo iniciado na etapa anterior.

3) Etapa 3 – Validação e Finalização
   - Front exibe opções de fundos de financiamento disponíveis (lista e requisitos a confirmar).
   - Usuário escolhe um fundo → backend aciona geração de documentos específicos exigidos por esse fundo (via modelos/"prompts" dedicados), aproveitando: descrições das fotos + dados técnicos + dados de risco/impacto disponíveis no sistema.
   - Backend devolve os arquivos (PDF/DOCX a confirmar) para visualização/download e registra o histórico.

### Integrações externas (a confirmar)

- Gemini Vision API (Google) – via `GEMINI_API_KEY`.
- Programas/Fundos de financiamento para prevenção/adaptação a desastres climáticos – exemplos citados pelo usuário: "FNMC" (Fundo Nacional sobre Mudança do Clima) e algo similar a "Funcap"/"Funkap" (nome exato a confirmar). Cada fundo exige um conjunto de documentos e formatações específicas. Precisaremos pesquisar fontes oficiais e normas vigentes para desenhar os templates e checagens.

### Variáveis de ambiente (front/back)

- Front: `ENDPOINT_BACKEND=https://localhost:3002` (já indicado). Usaremos `import.meta.env` no Vite.
- Back: `GEMINI_API_KEY`, `DATABASE_URL`.

### Backend FastAPI (proposta de API – rascunho para validação)

Base URL: `${ENDPOINT_BACKEND}`

- POST `/processos/prevencao` → cria processo e retorna `processId` (pode receber `zonaId`/metadados iniciais).
- POST `/processos/prevencao/{processId}/fotos` → upload das fotos; backend chama Gemini e armazena descrições. Retorna lista de fotos + descrições.
- POST `/processos/prevencao/{processId}/formulario` → persiste dados técnicos da vistoria.
- POST `/processos/prevencao/{processId}/gerar-documentos` body: `{ fundo: string }` → gera documentos conforme o fundo selecionado e retorna objetos de arquivo (URLs/bytes) + registro.
- GET `/documentos/{documentId}` → download/stream do arquivo gerado.

Observação: endpoints acima são PROPOSTOS e devem ser confirmados/alinhados com o front existente antes de implementação.

### Modelo de dados (proposta inicial para o novo schema)

- `prevention_process`
  - `id` (PK)
  - `zone_id` (FK opcional; origem do processo no mapa)
  - `status` (draft, photos_captured, form_filled, documents_generated, submitted)
  - `created_at`, `updated_at`

- `process_photo`
  - `id` (PK), `process_id` (FK)
  - `file_path` ou `storage_url`
  - `description_ai` (texto retornado pelo Gemini)
  - `created_at`

- `process_form`
  - `id` (PK), `process_id` (FK)
  - `inspector_name`, `inspection_date`, `technical_notes`, `immediate_action`
  - Campos extras de risco/impacto/valores quando disponíveis
  - `created_at`, `updated_at`

- `generated_document`
  - `id` (PK), `process_id` (FK)
  - `fund_code` (ex.: FNMC, A_CONFIRMAR)
  - `document_type` (string padronizada por fundo)
  - `file_path`/`storage_url`, `mime_type`, `size_bytes`
  - `created_at`

- `fund_submission`
  - `id` (PK), `process_id` (FK)
  - `fund_code`, `submitted_at`, `status`, `notes`

Nota: o usuário informou que `DATABASE_URL` existe e que devemos “apagar tudo e colocar o schema atual”. Isso será tratado com migrações/DDL no backend, após validação do modelo.

### Geração de documentos (proposta)

- Teremos templates e prompts específicos por fundo. Itens de entrada previstos:
  - dados do processo (zona, risco/impacto/valores disponíveis);
  - dados do formulário técnico (responsável, data, observações, ação imediata);
  - descrições das imagens por IA (Gemini Vision);
  - requisitos formais do fundo selecionado (pesquisa obrigatória).
- Saída: PDF ou DOCX. Converter para PDF se o fundo exigir. Estratégias possíveis: geração via HTML + headless (WeasyPrint/Playwright) ou via DOCX template. Escolha será definida após confirmar exigências dos fundos.

### Impacto no frontend (alto nível)

- Ajustar o wizard existente para parar de usar mocks e chamar o backend em cada etapa, preservando UX atual.
- Exibir lista real de fundos na etapa 3 (alimentada pelo backend) e, após seleção, exibir e permitir download visualização dos arquivos gerados.

### Riscos e pontos de atenção

- Nomes oficiais e requisitos de cada fundo precisam ser confirmados em fontes oficiais para evitar documentos inválidos.
- Tratamento de privacidade e armazenamento de imagens (onde e como armazenar – disco local vs. bucket – a confirmar).
- Geração de documentos deve ser determinística o suficiente para auditoria, com registro de insumos usados.
- Sem autenticação por ora: controlar apenas por processo/ID. Avaliar trilhas de auditoria mínimas.

---

## Mapa de investigações no repositório (o que verificar antes de tocar código)

1) Fluxo do wizard de prevenção no front
   - Localizar a origem do botão "Iniciar Processo de Prevenção" e o roteamento para o wizard.
   - Arquivos-alvo prováveis a verificar: `src/pages/WizardPrevencao.tsx`, `src/pages/Prefeitura.tsx`, `src/components/ZoneDetailModal.tsx`, `src/components/PrefeituraZoneModal.tsx`, `src/components/Map.tsx`.
   - Identificar estados, providers e padrão de navegação entre etapas.

2) Camada de chamadas HTTP
   - Verificar se já existe utilitário de fetch/axios e padrão de tratamento de erros.
   - Decidir onde centralizar o client do backend (`ENDPOINT_BACKEND`).

3) Upload e preview de imagens
   - Entender como o upload está mockado hoje e como o preview é renderizado.
   - Mapear onde interceptar para enviar para o backend e receber descrições por imagem.

4) Persistência dos dados do formulário
   - Quais campos existem hoje no formulário? Quais validações?
   - Como estão sendo mantidos entre as etapas? Precisaremos alinhar com a estrutura proposta do backend.

5) Etapa de validação e exibição dos documentos
   - Onde a lista atual de “documentos gerados” está mockada.
   - Como o botão "Visualizar" está implementado (link, modal, download). Ajustar para usar endpoints reais.

6) Styling/Design System
   - Confirmar como os componentes UI (pasta `src/components/ui`) são usados no wizard e quais padrões visuais devem ser seguidos.

7) Integrações e dados de risco
   - Mapear de onde vêm os dados de risco/ROI/impacto mostrados em `Prefeitura` e como vincular o `zone_id` ao processo.

8) Configuração de ambiente no front
   - Confirmar leitura de `ENDPOINT_BACKEND` via Vite.

9) Estrutura do backend a criar
   - Organizar projeto FastAPI na raiz do repo (diretório `backend/` ou diretamente na raiz – a decidir). Definir entrypoint na porta 3002 para obedecer `ENDPOINT_BACKEND` informado.
   - Decidir armazenamento de arquivos (local `./storage` inicialmente) e pipeline de IA (client Gemini) como serviços.
   - Preparar migração de schema (SQLAlchemy + Alembic) com as tabelas propostas.

10) Documentos e templates por fundo
   - Levantamento das exigências formais dos fundos (nomes, documentos, estrutura, itens obrigatórios, formatação, anexos, prazos).
   - Especificar template/prompt por fundo e validar com o time antes de codificar.

11) Logs e observabilidade
   - Padrão de log do backend (request-id por processo). Retenção de insumos usados na geração de documentos.

12) Segurança mínima
   - Mesmo sem autenticação, evitar exposição arbitrária de arquivos com URLs previsíveis. Considerar tokens de acesso por documento.

---

## Entregáveis deste escopo (fases)

Fase 1 – Planejamento e validação (este arquivo)
- Documento com proposta e mapa de investigações.

Fase 2 – Descoberta no repo
- Levantamento concreto dos pontos listados acima e alinhamento final da API/contratos.

Fase 3 – Implementação backend
- Projeto FastAPI, schema, endpoints, integração com Gemini e geração de documentos templateados.

Fase 4 – Integração frontend
- Adequações do wizard para chamadas reais e exibição/baixa dos documentos.

Fase 5 – Testes e estabilização
- Fluxos E2E locais, cobertura de casos de erro, revisão de prompts/templates.

---

## Descoberta no repositório – mapeamento técnico detalhado

Este capítulo registra entradas/saídas (inputs/outputs), dependências e caminhos de arquivos relevantes ao pipeline atual. A intenção é evitar suposições na integração com o novo backend.

### Navegação e rotas

- Arquivo: `src/App.tsx`
  - Define a rota do wizard: `/prefeitura/zona/:zoneId/wizard` apontando para `WizardPrevencao`.
  - Usa `react-router-dom` (BrowserRouter/Routes/Route) e `@tanstack/react-query` provider global.

### Origem do fluxo (botão "Iniciar Processo de Prevenção")

- Arquivo: `src/components/PrefeituraZoneModal.tsx`
  - Função/handler: `handleIniciarProcesso()`
    - Input: nenhum parâmetro. Usa `zone.zone_id` do props atual.
    - Efeito: `navigate(\`/prefeitura/zona/${zone.zone_id}/wizard\`)`.
  - Props do componente:
    - `zone: { zone_id: number; level: string; coordinates: { lat: number; lon: number }; total_imoveis: number; populacao_estimada: number; roi_formatado: string; notified_at: string } | null`
    - `open: boolean`, `onOpenChange(open: boolean): void`.
  - Dependências de UI: `Dialog`, `DialogContent`, `Card`, `Button`.

### Página de origem (mapa e lista de notificações)

- Arquivo: `src/pages/Prefeitura.tsx`
  - Mantém mocks locais de `notifications` e transforma em `mapZones` para o mapa.
  - `handleZoneClick(zone)` abre `PrefeituraZoneModal` com os dados da notificação selecionada.
  - Não há chamadas de backend neste arquivo.
  - Integra `Map` por props: `center`, `zones`, `onZoneClick`.

### Componente do mapa

- Arquivo: `src/components/Map.tsx`
  - Props: `{ center: [number, number]; zones: { id:number; coordinates:{lat:number;lon:number}; score:number; level:string; total_imoveis?; populacao_estimada? }[]; onZoneClick?(zone):void }`.
  - Output/efeitos: Renderiza mapa Leaflet; dispara `onZoneClick(zone)` no clique do marker.
  - Sem integração de rede.

### Wizard de Prevenção (mock atual)

- Arquivo: `src/pages/WizardPrevencao.tsx`
  - Hooks/estado local:
    - `currentStep: 1|2|3`.
    - `uploadedPhotos: File[]`.
    - `formData: { responsavel: string; data_vistoria: string; observacoes: string; acao_imediata: string }`.
    - `generatedDocs: string[]` (somente nomes, mock).
  - Handlers e contratos (inputs/outputs):
    - `handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>): void`
      - Input: event; extrai `FileList` → `File[]`.
      - Efeito: atualiza `uploadedPhotos` e exibe `toast`.
    - `handleRemovePhoto(index: number): void`
      - Input: índice da foto a remover.
      - Efeito: filtra `uploadedPhotos`.
    - `handleNextStep(): void`
      - Validações:
        - Step 1: exige `uploadedPhotos.length > 0`.
        - Step 2: exige `formData.responsavel` e `formData.data_vistoria`.
      - Mock: quando em Step 2, define `generatedDocs` com 3 strings fixas:
        - "Ofício de Notificação aos Moradores"
        - "Relatório Técnico de Risco"
        - "Plano de Ação Emergencial"
      - Efeito: `setCurrentStep(prev+1)`.
    - `handlePreviousStep(): void` → decrementa step.
    - `handleFinish(): void` → `toast.success` e `navigate("/prefeitura/curitiba")` após timeout.
  - Dependências externas:
    - `useParams()` usa `zoneId` apenas para exibição textual.
    - `sonner` para toasts.
  - Pontos a serem substituídos por integrações reais:
    - Upload real → chamada backend e retorno de descrições das imagens.
    - Persistência do `formData` no backend.
    - Listagem de fundos e geração real de documentos com download/preview.

### Locais dependentes/afetados quando mudarmos o fluxo

- Rota do wizard em `src/App.tsx` (se adicionarmos query/param extra ou proteção de rota).
- `PrefeituraZoneModal.tsx` (caso mudemos a forma de navegar/envio de `zoneId`).
- `WizardPrevencao.tsx` (principal: novos serviços, estados e chamadas HTTP; UI de seleção de fundos na etapa 3; visualização/download dos arquivos; exibição de descrições das fotos retornadas pelo backend).

### Observações gerais para integração

- O repositório não utiliza atualmente `ENDPOINT_BACKEND` em lugar algum (busca realizada).
- Não há client HTTP centralizado ainda; recomendável criar `src/lib/api.ts` (ou similar) para encapsular baseURL e tratativas.
- Nenhum endpoint backend existe no repo; toda integração será nova.

### Lista de arquivos-alvo (com caminhos) para edição futura

- `src/pages/WizardPrevencao.tsx` – integrar etapas com backend e UI de fundos/documentos. [FEITO]
- `src/components/PrefeituraZoneModal.tsx` – manter navegação; opcional: enviar contexto adicional (ex.: métricas da zona) ao criar o processo.
- `src/pages/Prefeitura.tsx` – futuramente substituir mocks por dados reais (não é bloqueador do pipeline, mas relevante).
- `src/App.tsx` – rotas adicionais se criarmos telas de histórico/visualização de processo.
- `src/lib/api.ts` (novo) – client fetch usando `import.meta.env.ENDPOINT_BACKEND` com fallback. [FEITO]
- Backend (novo, FastAPI na raiz) – endpoints e schema conforme proposto. [FEITO]

---

## Implementação realizada (registro)

- Backend criado em `backend/` com:
  - `main.py`: endpoints `POST /processos/prevencao`, `POST /processos/prevencao/{id}/fotos` (upload múltiplo + Gemini stub), `POST /processos/prevencao/{id}/formulario`, `GET /fundos`, `POST /processos/prevencao/{id}/gerar-documentos`, `GET /documentos/{id}` e `GET /` (health).
  - `database.py`, `models.py`, `storage.py` (armazenamento `./storage/images` e `./storage/documents`).
  - `services/gemini.py` (stub com fallback sem API), `services/doc_gen.py` (gera `.txt` por fundo exigido, exemplo `FNMC`).
  - `requirements.txt` com dependências mínimas.
  - Ajuste posterior: imports alterados para absolutos (`backend.*`). Executar a partir da raiz com `python -m uvicorn backend.main:app ...`. Se executar dentro de `backend/`, definir `PYTHONPATH` para o diretório pai.

- Frontend atualizado:
  - `src/lib/api.ts` centraliza chamadas usando `ENDPOINT_BACKEND` (ou fallback para `http://localhost:3002`).
  - `src/pages/WizardPrevencao.tsx` agora:
    - Etapa 1 cria processo e envia fotos para o backend; exibe descrições IA ao lado do nome do arquivo.
    - Etapa 2 envia formulário e carrega fundos via `/fundos`. Mostra um resumo das descrições IA retornadas para apoiar o preenchimento.
    - Etapa 3 permite escolher fundo, exibe lista de documentos exigidos pelo fundo selecionado, gera documentos e disponibiliza visualização via link direto do backend.

### Execução validada

- PowerShell (raiz): `python -m uvicorn backend.main:app --host 0.0.0.0 --port 3002 --reload`
- Health em `http://localhost:3002/` retorna `{ "status": "ok" }`.

---

## Plano v2: Banco de Dados + Pipeline de Contexto para IA

Objetivo: sair de descrições e documentos genéricos para geração realmente contextualizada (zona, risco, valores, fotos e formulário), com trilha de auditoria dos insumos.

### 1) Banco de dados – inicialização e limpeza (dev)

- Estratégia:
  - Adicionar utilitário dev (`backend/dbtools.py`) com comandos: `reset_db()` (drop_all + create_all) e `seed_dev()` (opcional).
  - Habilitar variável `RESET_DB_ON_STARTUP=true` (apenas dev) para executar `drop_all` + `create_all` no startup.
  - Manter via SQLAlchemy por agora (sem Alembic), pois schema ainda é fluido.

- Ajustes de schema propostos:
  - `prevention_process`
    - adicionar `context_json` (JSON/Text) para armazenar um pacote de contexto consolidado (ver estrutura abaixo).
  - `process_photo`
    - já possui `description_ai`; manter.
  - `generated_document`
    - adicionar `prompt_version` (String) e `inputs_hash` (String) para auditoria reprodutível.

### 2) Fonte de dados financeiros/ROI (mock hoje, real amanhã)

- Origem temporária (mock): valores exibidos em `PrefeituraZoneModal.tsx` (custo médio por imóvel, custos de reconstrução, totais, ROI, população estimada etc.).
- Como capturar hoje sem acoplamento ao mock: ao clicar em “Iniciar Processo de Prevenção”, enviar junto ao `apiCreateProcess` um `context` com esses números. Quando o dado real substituir o mock, o front continuará mandando o mesmo shape (ou o backend poderá ignorar o front e montar sozinho – contrato se mantém).
- No futuro: backend passará a consultar uma `zone` real (tabela/serviço próprio) e sobrepor/validar os números do client, mantendo compatibilidade.

Proposta de shape do `context_json` (persistido em `prevention_process`):

```json
{
  "zone": { "id": 23, "coordinates": { "lat": -25.4284, "lon": -49.2733 }, "level": "CRÍTICO", "score": 85 },
  "demographics": { "total_imoveis": 47, "populacao_estimada": 152 },
  "financials": {
    "custo_prevencao_por_imovel": 15000,
    "custo_reconstrucao_por_imovel": 180000,
    "custo_prevencao_total": 705000,
    "custo_desastre_total": 8460000,
    "economia_estimada": 7755000,
    "roi_percent": 1100
  },
  "notification": { "notified_at": "2025-11-02T10:30:00Z" },
  "form": null,
  "photos": []
}
```

Ao longo do pipeline, `form` e `photos` serão preenchidos, mantendo um único ponto de verdade.

### 3) Pipeline de IA (contexto global)

Fases e entradas/saídas:

1) Upload de fotos (já implementado)
   - Entrada: imagens
   - Ação nova (v2): chamar Gemini Vision real; prompt objetivo focado em indicadores úteis a defesa civil (moradias visíveis, tipologias, condições aparentes de encosta/drenagem, danos/infiltrações, referências geográficas, presença de crianças/idosos se detectável de forma não-identificante, etc.).
   - Saída: `process_photo.description_ai` por imagem; atualizar `context_json.photos` com `{ path, description }`.

2) Preenchimento do formulário (já implementado)
   - Atualizar `context_json.form` com todos os campos, data normalizada (ISO), e quem é o responsável.

3) Consolidador de contexto (novo serviço)
   - Serviço `context_builder.build(process_id)` que lê: `prevention_process.context_json` + `process_form` + `process_photo` e retorna um objeto consolidado e validado (com defaults e normalização de unidades/strings).
   - Esse objeto é serializado e usado como entrada para qualquer geração de documento (e para auditoria).

4) Geração de documentos por fundo (v2)
   - Para cada fundo, definiremos um “template contratual”: lista de documentos exigidos e para cada documento um “prompt + outline” específico.
   - Entradas do prompt: `context_consolidado` (JSON) + trechos de `description_ai` relevantes.
   - Saída: conteúdo textual estruturado (Markdown/HTML) → renderização para PDF; manter também `.txt` para depuração.
   - Registrar `prompt_version` e `inputs_hash` em `generated_document`.

### 4) Integração Gemini (v2)

- Vision (descrições por imagem): usar SDK `google-generativeai`, modelo "gemini-1.5-pro-vision" (ou equivalente estável), formato multimodal (prompt + binário da imagem). Persistir somente o texto final em `description_ai`.
- Texto (documentos): usar "gemini-1.5-pro" com um "system prompt" curto, e um "user prompt" onde injetamos o `context_consolidado` e o outline do documento – garantindo que as seções obrigatórias sejam respeitadas.

### 5) Contratos de API a ajustar

- `POST /processos/prevencao`
  - Corpo: `FormData` com `zone_id` e `context` (string JSON opcional). Backend mescla `context` recebido ao `context_json` inicial.

- `POST /processos/prevencao/{id}/fotos`
  - Igual hoje; além de salvar, atualizar `context_json.photos` no processo com `{path, description}`.

- `POST /processos/prevencao/{id}/formulario`
  - Igual hoje; além de salvar, atualizar `context_json.form` dentro do processo.

- `POST /processos/prevencao/{id}/gerar-documentos`
  - Internamente: `context_builder.build(id)` → `doc_gen.generate(fundo, context)`
  - Persistir auditoria: `prompt_version`, `inputs_hash`.

### 6) Garantias de consistência e não-alucinação

- Prompts com instruções explícitas de:
  - usar apenas dados presentes em `context_consolidado`;
  - citar números com unidades e faixas de confiança quando aplicável;
  - evitar inferir identidades/pessoas; anonimização.
- Tamanho do `context_consolidado` será mantido enxuto (normalização + sumarização das descrições de fotos, se necessário), para não estourar limites.

### 7) Passos de implementação (depois da aprovação)

1. DB tools: `reset_db` e campo `context_json` + colunas de auditoria.
2. API: aceitar `context` em `create_prevention_process` e consolidar context nas outras etapas.
3. Front: enviar `context` inicial com métricas da zona (mock hoje, real amanhã) no `apiCreateProcess`.
4. Gemini real: integrar Vision nas descrições; manter stub como fallback se `GEMINI_API_KEY` ausente.
5. Context Builder: novo módulo `backend/services/context_builder.py`.
6. Doc Gen v2: prompts por fundo e renderização para PDF (fase 2 se necessário; começar com `.txt`).
7. Observabilidade: logar `process_id` e tempo em cada etapa.

---

## Implementação v2 – andamento

- DB atualizado com `context_json` e auditoria em `generated_document`.
- Startup com `RESET_DB_ON_STARTUP` para reset no desenvolvimento.
- API atualizada para manter contexto conforme as etapas.
- Novo serviço `backend/services/context_builder.py` para consolidar contexto antes da geração.
- `services/doc_gen.py` agora recebe `context` e grava `prompt_version` e `inputs_hash` no retorno.
- `POST /gerar-documentos` passou a usar `context_builder` e a salvar auditoria nos registros.
- Front envia `context` ao criar processo (dados do modal) via `navigate` state → `WizardPrevencao` → `apiCreateProcess(context)`.



