import os
import re
from typing import List, Dict
import google.generativeai as genai


async def describe_images_with_gemini(paths: List[str]) -> List[str]:
    """
    Integração com Gemini Vision para análise de residências.
    Usa prompt específico para contar moradias em zonas de risco.
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
        # Configurar Gemini
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        results = []
        for path in paths:
            try:
                # Carregar imagem
                with open(path, "rb") as f:
                    img_bytes = f.read()
                
                # Prompt otimizado para contagem de residências
                prompt = """Analise esta imagem e identifique:

1. NÚMERO TOTAL de residências/moradias visíveis (seja preciso na contagem)
2. Tipo de construções (casas, prédios, barracos, etc.)
3. Estado aparente das construções (bom, regular, precário)
4. Indícios de risco (proximidade de encostas, rios, áreas instáveis)
5. Estimativa de densidade populacional

Forneça uma resposta técnica e objetiva, começando SEMPRE com o número exato de residências identificadas.
Formato: "X residências identificadas. [descrição detalhada]"
"""
                
                # Gerar análise
                response = model.generate_content([
                    prompt,
                    {"mime_type": "image/jpeg", "data": img_bytes}
                ])
                
                description = response.text or "Análise não disponível"
                results.append(description)
                
            except Exception as img_error:
                print(f"Erro processando imagem {path}: {img_error}")
                results.append(f"Erro ao processar imagem: {os.path.basename(path)}")
        
        return results
        
    except Exception as e:
        print(f"Erro na integração com Gemini: {e}")
        # Fallback em caso de erro
        return [
            f"[ERRO] Não foi possível analisar '{os.path.basename(p)}'. "
            f"Verifique a configuração do Gemini API."
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




