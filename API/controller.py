import sqlite3
import unicodedata
import hashlib
import json
import threading
import time
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from pathlib import Path
from bs4 import BeautifulSoup
from service import *

# Caminho do banco
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / 'DB' / 'database.db'
DOWNLOAD_PATH = BASE_DIR / 'DB' / 'DOWNLOAD'

# Controle da thread de download diário do DOU
_dou_thread = None

# Cache dos XMLs extraídos do DOU para evitar reprocessamento desnecessário
_dou_xml_cache = {}


def get_connection():
    # Abre conexão com o banco
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    return sqlite3.connect(DB_PATH)


def _seconds_until_next_run(target_hour=5, target_minute=0):
    # Calcula quantos segundos faltam até a próxima execução diária
    now = datetime.now()
    next_run = now.replace(hour=target_hour, minute=target_minute, second=0, microsecond=0)

    if now >= next_run:
        next_run += timedelta(days=1)

    return (next_run - now).total_seconds()


def _get_dou_loop():
    # Loop contínuo para baixar diariamente o DOU às 05:00
    while True:
        wait_seconds = _seconds_until_next_run(5, 0)
        time.sleep(wait_seconds)

        reference_date = datetime.now()
        print(f"[AUTO] Iniciando rotina diária do DOU em {reference_date.strftime('%d/%m/%Y %H:%M:%S')}")
        downloaded_file = download_dou(reference_date.month, reference_date.year)
        extract_dou(downloaded_file)
        search_dou_all(verbose=False)
        print("[AUTO] Rotina diária do DOU finalizada.")


def get_dou():
    # Inicia em background o download diário do DOU da seção 2 às 05:00
    global _dou_thread

    if _dou_thread and _dou_thread.is_alive():
        return _dou_thread

    _dou_thread = threading.Thread(target=_get_dou_loop, daemon=True, name='get_dou')
    _dou_thread.start()
    return _dou_thread


def extract_dou(zip_path):
    # Extrai um arquivo ZIP do DOU em DB/DOWNLOAD sempre que houver novo download
    if not zip_path:
        return None

    zip_file = Path(zip_path)

    if not zip_file.exists():
        print(f"Arquivo ZIP não encontrado para extração: '{zip_file}'.")
        return None

    if zip_file.suffix.lower() != '.zip':
        print(f"Arquivo inválido para extração: '{zip_file.name}'.")
        return None

    extract_dir = zip_file.parent / zip_file.stem

    try:
        with zipfile.ZipFile(zip_file, 'r') as zip_ref:
            members = [member for member in zip_ref.namelist() if member and not member.endswith('/')]

            if extract_dir.exists() and any(extract_dir.iterdir()):
                print(f"Arquivo '{zip_file.name}' já foi extraído em '{extract_dir}'.")
                return extract_dir

            extract_dir.mkdir(parents=True, exist_ok=True)
            zip_ref.extractall(extract_dir)

        print(f"Arquivo '{zip_file.name}' extraído com sucesso em '{extract_dir}'.")
        return extract_dir

    except zipfile.BadZipFile:
        print(f"Arquivo ZIP inválido ou corrompido: '{zip_file.name}'.")
        return None
    except OSError as erro:
        print(f"Erro ao extrair arquivo '{zip_file.name}': {erro}")
        return None


def _parse_extracted_dou_xml(xml_path):
    # Converte um XML extraído do DOU em um dicionário compatível com os resultados atuais
    try:
        root = ET.fromstring(xml_path.read_text(encoding='utf-8-sig'))
    except (ET.ParseError, OSError):
        return None

    article = root.find('.//article') if root.tag != 'article' else root
    if article is None:
        return None

    body = article.find('body')
    identifica = body.findtext('Identifica', default='').strip() if body is not None else ''
    texto_html = body.findtext('Texto', default='') if body is not None else ''

    return {
        "title": identifica or article.get('name', xml_path.stem),
        "content": strip_html(texto_html),
        "publicationDate": article.get('pubDate', '—'),
        "edition": article.get('editionNumber', '—'),
        "section": article.get('pubName', '—'),
        "href": article.get('pdfPage', ''),
        "source": "xml",
        "xmlPath": str(xml_path.relative_to(BASE_DIR)),
    }


def _load_extracted_dou_items():
    # Carrega os XMLs extraídos do DOU com cache por data de modificação
    global _dou_xml_cache

    if not DOWNLOAD_PATH.exists():
        _dou_xml_cache = {}
        return []

    current_files = {}
    items = []

    for xml_path in DOWNLOAD_PATH.rglob('*.xml'):
        try:
            stat = xml_path.stat()
        except OSError:
            continue

        cache_key = str(xml_path)
        current_files[cache_key] = True
        cached_entry = _dou_xml_cache.get(cache_key)

        if cached_entry and cached_entry['mtime_ns'] == stat.st_mtime_ns:
            item = cached_entry['item']
        else:
            item = _parse_extracted_dou_xml(xml_path)
            _dou_xml_cache[cache_key] = {
                'mtime_ns': stat.st_mtime_ns,
                'item': item,
            }

        if item:
            items.append(item)

    _dou_xml_cache = {
        path: entry
        for path, entry in _dou_xml_cache.items()
        if path in current_files
    }

    return items


def _search_dou_in_extracted_files(variacoes, inscricoes, extracted_items=None):
    # Busca correspondências nos arquivos XML já extraídos do DOU
    if not DOWNLOAD_PATH.exists() or not variacoes:
        return []

    extracted_items = extracted_items if extracted_items is not None else _load_extracted_dou_items()

    items = []
    vistos = set()

    for item in extracted_items:
        texto_item = (item.get('title', '') + ' ' + item.get('content', '')).lower()
        nome_encontrado = any(variacao.lower() in texto_item for variacao in variacoes)

        if not nome_encontrado:
            continue

        if inscricoes:
            inscricao_encontrada = any(str(inscricao).lower() in texto_item for inscricao in inscricoes)
            if not nome_encontrado and not inscricao_encontrada:
                continue

        chave = (
            item.get('title', ''),
            item.get('publicationDate', ''),
            item.get('xmlPath', ''),
        )
        if chave in vistos:
            continue

        vistos.add(chave)
        items.append(item)

    return items


def search_dou_all(verbose=True):
    # Executa a busca no DOU para todas as pessoas cadastradas
    try:
        with get_connection() as conexao:
            cursor = conexao.cursor()
            cursor.execute("SELECT id_person FROM person")
            person_ids = [row[0] for row in cursor.fetchall()]

        extracted_items = _load_extracted_dou_items()

        if not person_ids:
            if verbose:
                print("Nenhum usuário cadastrado para busca automática no DOU.")
            return

        if verbose:
            print("Iniciando busca automática no DOU para todos os usuários...")
        for person_id in person_ids:
            search_dou(person_id, verbose=verbose, extracted_items=extracted_items)

        if not verbose:
            print(f"[AUTO] Busca automática concluída para {len(person_ids)} usuário(s).")

    except sqlite3.Error as erro:
        print(f"Erro ao executar busca automática no DOU: {erro}")


def remove_accents(texto):
    # Remove acentos
    nfkd = unicodedata.normalize('NFKD', texto)
    return u"".join([c for c in nfkd if not unicodedata.combining(c)])


def strip_html(text):
    # Remove tags HTML de textos vindos do XML do DOU
    return BeautifulSoup(text, "html.parser").get_text(separator=" ", strip=True)

def create_possibilities(nome, fk_person_id, cursor):
    # Cria variações do nome para busca

    nome_ingles = remove_accents(nome).title()

    name_possibilities = [
        nome,
        nome.upper(),
        nome.lower(),
        nome_ingles,
        nome_ingles.upper(),
        nome_ingles.lower()
    ]

    sql = '''
        INSERT INTO possibilities (fk_id_person, nome_variacao)
        VALUES (?, ?)
    '''

    for variacao in name_possibilities:
        cursor.execute(sql, (fk_person_id, variacao))

def update_possibilities(nome, fk_person_id, cursor):
    # Atualiza variações do nome
    sql_delete = "DELETE FROM possibilities WHERE fk_id_person = ?"
    cursor.execute(sql_delete, (fk_person_id,))
    create_possibilities(nome, fk_person_id, cursor)

def create_person(nome, telefone, email, password):
    # Cadastra uma pessoa
    try:
        with get_connection() as conexao:
            cursor = conexao.cursor()

            sql_person = '''
                INSERT INTO person (nome, telefone, email)
                VALUES (?, ?, ?)
            '''
            sql_user = '''
                INSERT INTO user (user, password, fk_id_person)
                VALUES (?, ?, ?)
            '''

            cursor.execute(sql_person, (nome, telefone, email))
            new_id = cursor.lastrowid

            create_possibilities(nome, new_id, cursor)

            if password is not None:
                hashed = hashlib.sha256(password.encode()).hexdigest()
                cursor.execute(sql_user, (email, hashed, new_id))

            conexao.commit()
            print(f"'{nome}' cadastrado(a) com ID {new_id}.")

    except sqlite3.Error as erro:
        print(f"Erro ao cadastrar '{nome}': {erro}")
        return None

def edit_person(id_person, nome=None, telefone=None, email=None, password=None):
    # Edita os dados de uma pessoa
    try:
        with get_connection() as conexao:
            cursor = conexao.cursor()

            updates = []
            params = []

            if nome is not None:
                updates.append("nome = ?")
                params.append(nome)
                update_possibilities(nome, id_person, cursor)
            if telefone is not None:
                updates.append("telefone = ?")
                params.append(telefone)
            if email is not None:
                updates.append("email = ?")
                params.append(email)

            if password is not None:
                hashed = hashlib.sha256(password.encode()).hexdigest()
                cursor.execute(
                    "UPDATE user SET password = ? WHERE fk_id_person = ?",
                    (hashed, id_person)
                )

            if not updates:
                if password is not None:
                    conexao.commit()
                    print(f"Senha de {nome} atualizada com sucesso.")
                    return True
                print("Nenhum campo para atualizar.")
                return False

            params.append(id_person)
            sql = f"UPDATE person SET {', '.join(updates)} WHERE id_person = ?"

            cursor.execute(sql, params)
            conexao.commit()

            if cursor.rowcount > 0:
                print(f"'{nome}' atualizada com sucesso.")
                return True
            else:
                print(f"Nenhuma pessoa encontrada com o nome: '{nome}'.")
                return False

    except sqlite3.Error as erro:
        print(f"Erro ao atualizar pessoa com ID {id_person}: {erro}")
        return False

def login_user(user, password):
    # Autentica um usuário
    try:
        with get_connection() as conexao:
            cursor = conexao.cursor()

            hashed = hashlib.sha256(password.encode()).hexdigest()

            sql = '''
                SELECT ua.id_autentication, p.id_person, p.nome
                FROM user ua
                JOIN person p ON p.id_person = ua.fk_id_person
                WHERE LOWER(ua.user) = LOWER(?) AND ua.password = ?
            '''
            cursor.execute(sql, (user, hashed))
            row = cursor.fetchone()

            if row:
                print(f"Login bem-sucedido! Bem-vindo(a), {row[2]}.")
                return {"id_autentication": row[0], "id_person": row[1], "nome": row[2]}
            else:
                print("Usuário ou senha inválidos.")
                return None

    except sqlite3.Error as erro:
        print(f"Erro ao realizar login: {erro}")
        return None

def delete_person(id_person):
    # Remove uma pessoa
    try:
        with get_connection() as conexao:
            cursor = conexao.cursor()

            cursor.execute("DELETE FROM possibilities WHERE fk_id_person = ?", (id_person,))
            cursor.execute("DELETE FROM user WHERE fk_id_person = ?", (id_person,))
            cursor.execute("DELETE FROM person WHERE id_person = ?", (id_person,))
            conexao.commit()

            if cursor.rowcount > 0:
                print(f"Pessoa com ID {id_person} deletada com sucesso.")
                return True
            else:
                print(f"Nenhuma pessoa encontrada com ID {id_person}.")
                return False

    except sqlite3.Error as erro:
        print(f"Erro ao deletar: {erro}")
        return False

def create_enrollment(id_person, subscrition):
    # Salva uma inscrição
    try:
        with get_connection() as conexao:
            cursor = conexao.cursor()

            sql = '''
                INSERT INTO enrollment (fk_person_id, subscription)
                VALUES (?, ?)
            '''
            cursor.execute(sql, (id_person, subscrition))
            conexao.commit()
            print(f"Matricula inserida para busca com inscrição nº {subscrition}.")

    except sqlite3.Error as erro:
        print(f"Erro ao matricular pessoa com ID {id_person} inscrição {subscrition}: {erro}")

def search_dou(id_person, verbose=True, extracted_items=None):
    # Busca resultados no DOU
    try:
        with get_connection() as conexao:
            cursor = conexao.cursor()

            cursor.execute(
                "SELECT nome_variacao FROM possibilities WHERE fk_id_person = ?",
                (id_person,)
            )
            variacoes = [row[0] for row in cursor.fetchall()]

            cursor.execute(
                "SELECT subscription FROM enrollment WHERE fk_person_id = ?",
                (id_person,)
            )
            inscricoes = [row[0] for row in cursor.fetchall()]

        if not variacoes and not inscricoes:
            if verbose:
                print("Nenhuma variação de nome ou inscrição cadastrada para busca.")
            return

        if verbose:
            print("Buscando no DOU, aguarde...")

        fila = []
        vistos = set()

        for variacao in variacoes:
            if verbose:
                print(f"  Buscando por: '{variacao}'...")
            for item in consult_competition_nome(variacao):
                chave = (item.get('title', ''), item.get('publicationDate', ''))
                if chave not in vistos:
                    vistos.add(chave)
                    fila.append(item)

        for inscricao in inscricoes:
            if verbose:
                print(f"  Buscando por inscrição: '{inscricao}'...")
            for item in consult_competition_matricula(inscricao):
                texto_item = (item.get('title', '') + ' ' + item.get('content', '')).lower()
                nome_encontrado = any(v.lower() in texto_item for v in variacoes)
                if not nome_encontrado:
                    continue
                chave = (item.get('title', ''), item.get('publicationDate', ''))
                if chave not in vistos:
                    vistos.add(chave)
                    fila.append(item)

        xml_items = _search_dou_in_extracted_files(variacoes, inscricoes, extracted_items=extracted_items)
        for item in xml_items:
            chave = (item.get('title', ''), item.get('publicationDate', ''), item.get('xmlPath', ''))
            if chave not in vistos:
                vistos.add(chave)
                fila.append(item)

        if verbose:
            print(f"\n===== RESULTADOS DO DOU ({len(fila)} encontrado(s)) =====")
        if not fila:
            if verbose:
                print("Nenhum resultado encontrado.")
        else:
            with get_connection() as conexao:
                cursor = conexao.cursor()
                salvos = 0
                for i, item in enumerate(fila, 1):
                    if verbose:
                        print(f"\n[{i}] {item.get('title', 'Sem título')}")
                        print(f"    Seção: {item.get('section', '—')} | Edição: {item.get('edition', '—')} | Data: {item.get('publicationDate', '—')}")
                        if item.get('content'):
                            trecho = item['content'][:200].replace('\n', ' ')
                            print(f"    Trecho: ...{trecho}...")
                        if item.get('href'):
                            print(f"    Link: {item['href']}")

                    dou_result = json.dumps(item, ensure_ascii=False)

                    cursor.execute(
                        "SELECT 1 FROM result WHERE dou_result = ? AND fk_person_id = ?",
                        (dou_result, id_person)
                    )
                    if not cursor.fetchone():
                        cursor.execute(
                            "INSERT INTO result (dou_result, fk_person_id) VALUES (?, ?)",
                            (dou_result, id_person)
                        )
                        salvos += 1
                conexao.commit()
            if verbose:
                print(f"\n{salvos} novo(s) resultado(s) salvo(s) no banco.")
            else:
                print(f"[AUTO] Usuário {id_person}: {len(fila)} resultado(s), {salvos} novo(s) salvo(s).")

    except sqlite3.Error as erro:
        print(f"Erro ao buscar no DOU: {erro}")

