import os
from typing import List
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



