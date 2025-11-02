# 🌎 Clima.Seguro  

Plataforma govtech de **inteligência climática e financeira** voltada para o setor público.  

A Clima.Seguro auxilia prefeituras e governos estaduais na **prevenção, resposta e recuperação** de desastres climáticos e ambientais, automatizando processos de gestão, relatórios e solicitação de verbas públicas.

---

<p align="center">
  <img src="./docs/static/img/clima-seguro.gif" alt="Clima.Seguro Banner" width="1024"/>
</p>



## Descrição  

O Brasil enfrenta um cenário de desastres climáticos cada vez mais frequentes e onerosos. A Clima.Seguro foi criada para resolver a fragmentação de dados e a lentidão dos processos de gestão pública climática.  

A plataforma reúne quatro módulos principais:  
1. **Mapa de Riscos Integrado** – identifica pontos vulneráveis e riscos climáticos.  
2. **Painel de Monitoramento** – acompanha ações de prevenção e resposta em tempo real.  
3. **Autoplano Climático** – gera automaticamente planos de mitigação e reconstrução com IA.  
4. **Comparador de Impactos** – analisa a eficiência econômica da prevenção versus reconstrução.  

O sistema opera em nuvem, é compatível com padrões **gov.br**, e pode ser licenciado por prefeituras e estados em modelo **SaaS (Software as a Service)**.

---

## Equipe  

| Nome | Cargo | E-mail | GitHub |
|------|--------|---------|--------|
| **Davi Nascimento de Jesus** | UI/UX Designer | davi.jesus@inteli.edu.br | [github.com/davidijesus](https://github.com/davidijesus) |
| **Thiago Volcati** | Full Stack Engineer | thiago.volcati@inteli.edu.br | [github.com/tvolcati](https://github.com/tvolcati) |
| **David Deodato Nascimento** | Dev Blockchain e AI | david.deodato@inteli.edu.br | [github.com/daviddeodato](https://github.com/daviddeodato) |

---

##  Estrutura de Pastas  

Abaixo está a estrutura principal do repositório da **Clima.Seguro**, refletindo a separação entre frontend, backend e arquivos de suporte.

```bash
📦 clima-seguro/
├── backend/ # Backend da aplicação (API, autenticação e integração de dados)
├── memory_bank/ # Camada de armazenamento temporário e logs
├── public/ # Arquivos públicos e estáticos acessíveis no build final
├── scripts/ # Scripts auxiliares de deploy, build e automação
├── src/ # Código-fonte principal (React + TypeScript + Shadcn/UI)
│ ├── components/ # Componentes reutilizáveis de interface
│ ├── pages/ # Páginas e rotas da aplicação
│ ├── services/ # Serviços e integrações (APIs externas, MapBiomas, INMET etc.)
│ ├── hooks/ # Hooks personalizados
│ ├── assets/ # Ícones, imagens e gráficos
│ └── utils/ # Funções auxiliares e helpers de cálculo
├── storage/ # Banco de dados local e arquivos temporários (.db, cache)
├── .env.example # Modelo de variáveis de ambiente
├── ANALISE_RESIDENCIAIS.md # Documentação técnica de cálculo de risco residencial
├── INTEGRACAO_CALCULO_RISCO.md # Documentação de integração dos algoritmos de risco
├── README.md # Documentação principal do projeto
├── tailwind.config.ts # Configuração do Tailwind CSS
├── postcss.config.js # Configuração de processamento CSS
├── tsconfig.json # Configuração do TypeScript
├── vite.config.ts # Configuração do bundler Vite
├── eslint.config.js # Padrões de lint e qualidade de código
├── index.html # Entry point do frontend
├── package.json # Dependências e scripts npm
└── clima_seguro.db # Banco de dados SQLite local para protótipo
```

## Execução Local da Documentação

### 1. Pré-requisitos  

- Node.js >= 18  
- npm
- Git  

### 2. Clonando o Repositório  

```bash
git clone https://github.com/inteli-clima-seguro/clima-seguro.git
cd clima-seguro
cd docs
```

### 3. Instalação de Dependências

```bash
npm install
```

### 4. Execução em Ambiente Local

```bash
npm run dev
```

Acesse:
👉 http://localhost:3000

## Licença
Este projeto é de código aberto sob a licença MIT.

Você pode copiar, modificar e distribuir o código, desde que preserve os créditos originais da equipe Clima.Seguro.

```kotlin
MIT License  
Copyright (c) 2025 Clima.Seguro
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files.
```
