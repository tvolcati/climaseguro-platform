import os
from typing import List


async def describe_images_with_gemini(paths: List[str]) -> List[str]:
    """
    Placeholder de integração com Gemini Vision.
    Se `GEMINI_API_KEY` não estiver definido, retorna descrições genéricas.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        # Fallback determinístico para desenvolvimento offline.
        return [
            f"Descrição automática (offline): evidências visuais para análise técnica – arquivo '{os.path.basename(p)}'."
            for p in paths
        ]

    # Exemplo de integração (comentado para não quebrar em ambientes sem a lib):
    # import google.generativeai as genai
    # genai.configure(api_key=api_key)
    # model = genai.GenerativeModel("gemini-1.5-flash")
    # results = []
    # for path in paths:
    #     with open(path, "rb") as f:
    #         img_bytes = f.read()
    #     prompt = "Descreva a imagem com foco em: número de moradias, tipologia, estado aparente, indícios de risco (encosta, drenagem), e referências geográficas. Seja objetivo e técnico."
    #     resp = model.generate_content([prompt, {"mime_type": "image/jpeg", "data": img_bytes}])
    #     results.append(resp.text or "")
    # return results

    # Por ora, mesmo com API_KEY definida, retornamos stub para consistência.
    return [
        f"Descrição automática: análise técnica preliminar – arquivo '{os.path.basename(p)}'."
        for p in paths
    ]

import os  # manter import local usado acima


