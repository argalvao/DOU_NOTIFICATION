# Consulta ao portal do DOU

import requests
import json
from bs4 import BeautifulSoup
from datetime import date
from pathlib import Path
from urllib.parse import quote

# Cabeçalhos da requisição
HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9",
}

# Elemento com os resultados
ELEMENT_ID = "_br_com_seatecnologia_in_buscadou_BuscaDouPortlet_params"

# URL base dos resultados
BASE_URL = "https://www.in.gov.br/web/dou/-/"

# Página oficial de dados abertos do DOU
OPEN_DATA_URL = "https://www.in.gov.br/web/guest/acesso-a-informacao/dados-abertos/base-de-dados"

# Diretório de download dos arquivos ZIP do DOU
DOWNLOAD_DIR = Path(__file__).resolve().parent.parent / "DB" / "DOWNLOAD"

MONTH_NAMES = {
    1: "Janeiro",
    2: "Fevereiro",
    3: "Março",
    4: "Abril",
    5: "Maio",
    6: "Junho",
    7: "Julho",
    8: "Agosto",
    9: "Setembro",
    10: "Outubro",
    11: "Novembro",
    12: "Dezembro",
}


def _strip_html(text):
    # Remove tags HTML
    return BeautifulSoup(text, "html.parser").get_text(separator=" ", strip=True)


def _fetch(query):
    # Busca resultados no DOU
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
                "title":           hit.get("title", "Sem título"),
                "content":         _strip_html(hit.get("content", "")),
                "publicationDate": hit.get("pubDate", "—"),
                "edition":         hit.get("editionNumber", "—"),
                "section":         hit.get("pubName", "—"),
                "href":            BASE_URL + hit.get("urlTitle", ""),
            })
        return items

    except requests.exceptions.RequestException as e:
        print(f"Erro de conexão ao consultar DOU para '{query}': {e}")
        return []
    except (json.JSONDecodeError, KeyError) as e:
        print(f"Erro ao interpretar resposta do DOU para '{query}': {e}")
        return []


def _build_open_data_url(month, year):
    # Monta a URL da página de dados abertos filtrada por ano e mês
    month_name = MONTH_NAMES.get(month)
    if month_name is None:
        raise ValueError(f"Mês inválido: {month}")

    return f"{OPEN_DATA_URL}?ano={year}&mes={quote(month_name)}"


def download_dou(month=None, year=None):
    # Baixa o arquivo ZIP da seção 2 do DOU para DB/DOWNLOAD
    reference_date = date.today()
    month = month or reference_date.month
    year = year or reference_date.year

    file_name = f"S02{month:02d}{year:04d}.zip"

    try:
        open_data_url = _build_open_data_url(month, year)
        response = requests.get(open_data_url, headers=HEADERS, timeout=20)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")
        download_url = None

        for link in soup.find_all("a", href=True):
            href = link["href"]
            if file_name in href and "download=true" in href:
                download_url = href
                break

        if not download_url:
            print(f"Arquivo '{file_name}' ainda não está disponível para download.")
            return None

        if download_url.startswith("/"):
            download_url = f"https://www.in.gov.br{download_url}"

        DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
        output_path = DOWNLOAD_DIR / file_name

        with requests.get(download_url, headers=HEADERS, timeout=60, stream=True) as file_response:
            file_response.raise_for_status()
            with output_path.open("wb") as file_handle:
                for chunk in file_response.iter_content(chunk_size=8192):
                    if chunk:
                        file_handle.write(chunk)

        print(f"Arquivo '{file_name}' baixado com sucesso em '{output_path}'.")
        return output_path

    except requests.exceptions.RequestException as e:
        print(f"Erro ao baixar arquivo do DOU '{file_name}': {e}")
        return None
    except ValueError as e:
        print(f"Erro ao montar download do DOU: {e}")
        return None


def consult_competition_nome(nome_variacao):
    # Busca por nome
    return _fetch(nome_variacao)


def consult_competition_matricula(subscription):
    # Busca por inscrição
    return _fetch(subscription)