import requests
import json
from bs4 import BeautifulSoup
from urllib.parse import quote

HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9",
}

ELEMENT_ID = "_br_com_seatecnologia_in_buscadou_BuscaDouPortlet_params"
BASE_URL = "https://www.in.gov.br/web/dou/-/"

def _strip_html(text):
    return BeautifulSoup(text, "html.parser").get_text(separator=" ", strip=True)

def _fetch(query):
    # Usa aspas para busca de frase exata no DOU
    quoted = f'"{query}"' if ' ' in query else query
    url = f"https://www.in.gov.br/consulta/-/buscar/dou?q={quote(quoted)}&s=todos&exactDate=all&sortType=0"
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")
        elem = soup.find(id=ELEMENT_ID)
        if not elem:
            return []

        data = json.loads(elem.get_text())
        items = []
        for hit in data.get("jsonArray", []):
            items.append({
                "title": hit.get("title", "Sem título"),
                "content": _strip_html(hit.get("content", "")),
                "publicationDate": hit.get("pubDate", "—"),
                "edition": hit.get("editionNumber", "—"),
                "section": hit.get("pubName", "—"),
                "href": BASE_URL + hit.get("urlTitle", ""),
            })
        return items

    except requests.exceptions.RequestException as e:
        print(f"Erro de conexão ao consultar DOU para '{query}': {e}")
        return []
    except (json.JSONDecodeError, KeyError) as e:
        print(f"Erro ao interpretar resposta do DOU para '{query}': {e}")
        return []

def consult_competition_nome(nome_variacao):
    return _fetch(nome_variacao)

def consult_competition_matricula(subscription):
    return _fetch(subscription)