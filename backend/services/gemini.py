import os
from typing import List
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



