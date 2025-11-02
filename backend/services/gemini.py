import os
import re
from typing import List, Dict
import google.generativeai as genai


async def describe_images_with_gemini(paths: List[str]) -> List[str]:
    """Gera descrições por imagem usando um modelo suportado de forma dinâmica.

    Não assumimos o nome do modelo. Listamos os modelos disponíveis e tentamos, em ordem
    de preferência: um modelo 1.5 "flash" com generateContent; depois um 1.5 "pro"; por fim,
    qualquer modelo com generateContent. Em caso de falha, retornamos fallback determinístico.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        # Fallback determinístico para desenvolvimento offline.
        return [
            f"[MODO OFFLINE] Análise automática: arquivo '{os.path.basename(p)}'. "
            f"Estimativa: aproximadamente 3-5 residências visíveis na área. "
            f"Para análise precisa, configure GEMINI_API_KEY."
            for p in paths
        ]

    try:
        genai.configure(api_key=api_key)

        # 1) Listar modelos com generateContent
        try:
            available = list(genai.list_models())
            gc_models = [m for m in available if "generateContent" in getattr(m, "supported_generation_methods", [])]
            # Ordenar por preferência: 1.5 flash > 1.5 pro > demais
            def score(m):
                name = getattr(m, "name", "").lower()
                s = 0
                if "1.5" in name:
                    s += 2
                if "flash" in name:
                    s += 2
                if "pro" in name:
                    s += 1
                return s
            candidates = sorted(gc_models, key=score, reverse=True)
            candidate_names = [getattr(m, "name", "") for m in candidates]
            if not candidate_names:
                candidate_names = ["models/gemini-2.5-flash", "models/gemini-2.5-pro"]  # fallback leve
        except Exception as e_list:
            print(f"Falha ao listar modelos: {e_list}")
            candidate_names = ["models/gemini-2.5-flash", "models/gemini-2.5-pro"]

        # 2) Tentar modelos até funcionar ao menos um
        last_error = None
        for model_name in candidate_names:
            try:
                model = genai.GenerativeModel(model_name)
                results = []
                for path in paths:
                    try:
                        with open(path, "rb") as f:
                            img_bytes = f.read()
                        prompt = (
                            "Analise a imagem com foco em: número de moradias visíveis, tipologia, "
                            "estado aparente, indícios de risco (encosta/drenagem), e referências geográficas. "
                            "Responda tecnicamente e objetivamente."
                        )
                        response = model.generate_content([
                            prompt,
                            {"mime_type": "image/jpeg", "data": img_bytes},
                        ])
                        description = getattr(response, "text", None) or "Análise não disponível"
                        results.append(description)
                    except Exception as img_error:
                        print(f"Erro processando imagem {path} com {model_name}: {img_error}")
                        results.append(f"Erro ao processar imagem: {os.path.basename(path)}")
                return results
            except Exception as model_error:
                last_error = model_error
                print(f"Modelo indisponível ({model_name}): {model_error}")
                continue

        # 3) Se nenhum modelo funcionou → fallback determinístico
        print(f"Nenhum modelo Gemini funcionou: {last_error}")
        return [
            f"[FALLBACK] Descrição automática (sem IA ativa) – arquivo '{os.path.basename(p)}'."
            for p in paths
        ]
    except Exception as e:
        print(f"Erro geral na integração com Gemini: {e}")
        return [
            f"[ERRO] Não foi possível analisar '{os.path.basename(p)}'. Verifique GEMINI_API_KEY."
            for p in paths
        ]


async def analyze_image_base64(image_data: bytes, coordinates: dict) -> Dict:
    """
    Analisa imagem de satélite (bytes) e retorna contagem de residências.
    Usado para análise automática ao clicar em zona de risco.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        # Fallback offline: retorna valor mockado baseado em coordenadas
        import random
        random.seed(hash(str(coordinates)))
        count = random.randint(15, 50)
        return {
            "residence_count": count,
            "description": f"[MODO OFFLINE] Estimativa automática: {count} residências na área. Configure GEMINI_API_KEY para análise real.",
            "confidence": 0.5
        }

    try:
        # Configurar Gemini
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        # Prompt focado em contagem precisa
        prompt = """Analise esta imagem de satélite e conte EXATAMENTE quantas residências/moradias estão visíveis.

INSTRUÇÕES IMPORTANTES:
- Conte APENAS estruturas que sejam claramente residências
- Seja preciso: conte cada casa/prédio individual
- Ignore estruturas comerciais, industriais ou agrícolas
- Se houver prédios, estime o número de unidades residenciais

FORMATO DA RESPOSTA:
Linha 1: "TOTAL: X residências"
Linha 2-N: Descrição breve da área (tipo de construções, densidade, estado aparente, riscos visíveis)

Exemplo:
TOTAL: 23 residências
Área residencial de média densidade com casas predominantemente térreas. Construções em bom estado, algumas próximas a encostas. Vegetação esparsa ao redor.
"""
        
        # Gerar análise
        response = model.generate_content([
            prompt,
            {"mime_type": "image/png", "data": image_data}
        ])
        
        text = response.text or ""
        
        # Extrair número de residências
        count = extract_residence_count(text)
        
        # Limpar a descrição (remover a linha TOTAL)
        description_lines = [line for line in text.split('\n') if not line.startswith('TOTAL:')]
        description = '\n'.join(description_lines).strip()
        
        # Confiança baseada na presença de número claro
        confidence = 0.85 if count > 0 else 0.5
        
        print(f"🤖 Gemini analisou coordenadas {coordinates}: {count} residências")
        
        return {
            "residence_count": count,
            "description": description or "Análise não disponível",
            "confidence": confidence
        }
        
    except Exception as e:
        print(f"❌ Erro na análise Gemini: {e}")
        return {
            "residence_count": 0,
            "description": f"Erro ao analisar imagem: {str(e)}",
            "confidence": 0.0
        }


def extract_residence_count(text: str) -> int:
    """
    Extrai o número de residências do texto do Gemini.
    Tenta múltiplos padrões para máxima compatibilidade.
    """
    print(f"📄 Texto do Gemini para extração:\n{text}\n")
    
    # Padrão 1: "TOTAL: X residências"
    match = re.search(r'TOTAL:\s*(\d+)', text, re.IGNORECASE)
    if match:
        count = int(match.group(1))
        print(f"✅ Extraído via padrão TOTAL: {count}")
        return count
    
    # Padrão 2: "X residências identificadas"
    match = re.search(r'(\d+)\s+residência', text, re.IGNORECASE)
    if match:
        count = int(match.group(1))
        print(f"✅ Extraído via padrão 'X residências': {count}")
        return count
    
    # Padrão 3: Outros padrões comuns
    patterns = [
        r'(\d+)\s+casa',
        r'(\d+)\s+moradia',
        r'(\d+)\s+imóve',
        r'(\d+)\s+unidade',
        r'aproximadamente\s+(\d+)',
        r'cerca de\s+(\d+)',
        r'em torno de\s+(\d+)',
        r'total.*?(\d+)',
        r'identificad.*?(\d+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            count = int(match.group(1))
            print(f"✅ Extraído via padrão '{pattern}': {count}")
            return count
    
    # Fallback: pegar o primeiro número >= 1
    numbers = re.findall(r'\b(\d+)\b', text)
    for num_str in numbers:
        num = int(num_str)
        if num >= 1 and num < 1000:  # Filtro razoável
            print(f"⚠️ Usando primeiro número razoável encontrado: {num}")
            return num
    
    print(f"❌ Nenhum número de residências encontrado, retornando 0")
    return 0





def _pick_text_model() -> str:
    """Seleciona dinamicamente um modelo de texto com generateContent."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY ausente")
    genai.configure(api_key=api_key)
    try:
        available = list(genai.list_models())
        gc_models = [m for m in available if "generateContent" in getattr(m, "supported_generation_methods", [])]
        def score(m):
            name = getattr(m, "name", "").lower()
            s = 0
            if "2.5" in name or "2.0" in name or "1.5" in name:
                s += 2
            if "pro" in name:
                s += 2
            if "flash" in name:
                s += 1
            return s
        best = sorted(gc_models, key=score, reverse=True)
        if best:
            return getattr(best[0], "name", "models/gemini-2.0-pro")
    except Exception as e:
        print(f"Falha ao listar modelos de texto: {e}")
    return "models/gemini-2.0-pro"


def generate_legal_document_text(fund_name: str, doc_type: str, context: dict, sections: List[str]) -> str:
    """Gera texto longo, formal e jurídico em PT-BR para o documento solicitado.

    O output NÃO deve conter JSON; apenas o texto final formatado em seções, com
    títulos, parágrafos e linguagem administrativa.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY ausente")

    model_name = _pick_text_model()
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)

    context_hint = (
        "Este é o contexto resumido do processo (NÃO reproduzir como JSON no resultado, use apenas como fonte de dados):\n"
        + str(context)
    )

    estrutura = "\n".join([f"- {s}" for s in sections])
    prompt = f"""
Você é um redator jurídico da administração pública municipal. Gere um documento oficial em português do Brasil, com linguagem administrativa e técnica, sólido e bem fundamentado, para o fundo/programa: {fund_name}. Tipo de documento: {doc_type}.

Requisitos de estilo e formato:
- Texto corrido, organizado em seções com títulos claros.
- Argumentação jurídica robusta, com motivação, finalidade pública, proporcionalidade e razoabilidade.
- Fundamentação técnica (engenharia/defesa civil) quando cabível.
- Evite listas em excesso; prefira parágrafos longos, porém legíveis.
- NÃO inclua código, tabelas JSON ou dumps do contexto; NUNCA imprima chaves/valores.
- Se informações não estiverem no contexto, declare a premissa de forma neutra sem inventar dados.

Estrutura mínima obrigatória (siga esta ordem):
{estrutura}

Diretrizes adicionais:
- Não cite nomes de pessoas reais; use apenas cargos e funções (ex.: responsável técnico).
- Use números e unidades quando disponíveis (custos, coordenadas, população), sem expor dados pessoais.
- Inclua uma conclusão com encaminhamentos e responsabilidades institucionais.

{context_hint}

Produza o documento completo agora. O resultado deve ser apenas o texto final com seções e parágrafos.
"""

    resp = model.generate_content(prompt)
    return getattr(resp, "text", "")

