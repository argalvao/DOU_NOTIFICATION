import sqlite3
import unicodedata
import hashlib
import json
from service import *

DB_PATH = '../DB/database.db' 


def remove_accents(texto):
    nfkd = unicodedata.normalize('NFKD', texto)
    return u"".join([c for c in nfkd if not unicodedata.combining(c)])

def create_possibilities(nome, fk_person_id, cursor):
    nome_ingles = remove_accents(nome).title()

    name_possibilities = [
        nome,                          # Posição 0: Original
        nome.upper(),                  # Posição 1: Maiúsculo
        nome.lower(),                  # Posição 2: Minúsculo
        nome_ingles,                   # Posição 3: Padrão inglês (sem acentos)
        nome_ingles.upper(),           # Posição 4: Padrão inglês maiúsculo
        nome_ingles.lower()            # Posição 5: Padrão inglês minúsculo
    ]
    
    sql = '''
        INSERT INTO possibilities (fk_id_person, nome_variacao)
        VALUES (?, ?)
    '''
    
    for variacao in name_possibilities:
        cursor.execute(sql, (fk_person_id, variacao))

def update_possibilities(nome, fk_person_id, cursor):
    sql_delete = "DELETE FROM possibilities WHERE fk_id_person = ?"
    cursor.execute(sql_delete, (fk_person_id,))
    create_possibilities(nome, fk_person_id, cursor)

def create_person(nome, telefone, email, password):
    try:
        with sqlite3.connect(DB_PATH) as conexao:
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
            new_id = cursor.lastrowid # Pega o ID gerado para a nova pessoa
            
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
    try:
        with sqlite3.connect(DB_PATH) as conexao:
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
    try:
        with sqlite3.connect(DB_PATH) as conexao:
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
    try:
        with sqlite3.connect(DB_PATH) as conexao:
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
        print(f"Erro ao deletar pessoa com ID {id_person}: {erro}")
        return False

def create_enrollment(id_person, subscrition):
    try:
        with sqlite3.connect(DB_PATH) as conexao:
            cursor = conexao.cursor()

            sql = '''
                INSERT INTO enrollment (fk_person_id, subscription)
                VALUES (?, ?)
            '''
            cursor.execute(sql, (id_person, subscrition))
            conexao.commit()
            print(f"Pessoa com ID {id_person} matriculada no curso {subscrition}.")

    except sqlite3.Error as erro:
        print(f"Erro ao matricular pessoa com ID {id_person} inscrição {subscrition}: {erro}")

def search_dou(id_person):
    try:
        with sqlite3.connect(DB_PATH) as conexao:
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
            print("Nenhuma variação de nome ou inscrição cadastrada para busca.")
            return

        print("Buscando no DOU, aguarde...")

        fila = []
        vistos = set()

        for variacao in variacoes:
            print(f"  Buscando por: '{variacao}'...")
            for item in consult_competition_nome(variacao):
                chave = (item.get('title', ''), item.get('publicationDate', ''))
                if chave not in vistos:
                    vistos.add(chave)
                    fila.append(item)

        for inscricao in inscricoes:
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

        print(f"\n===== RESULTADOS DO DOU ({len(fila)} encontrado(s)) =====")
        if not fila:
            print("Nenhum resultado encontrado.")
        else:
            with sqlite3.connect(DB_PATH) as conexao:
                cursor = conexao.cursor()
                salvos = 0
                for i, item in enumerate(fila, 1):
                    print(f"\n[{i}] {item.get('title', 'Sem título')}")
                    print(f"    Seção: {item.get('section', '—')} | Edição: {item.get('edition', '—')} | Data: {item.get('publicationDate', '—')}")
                    if item.get('content'):
                        trecho = item['content'][:200].replace('\n', ' ')
                        print(f"    Trecho: ...{trecho}...")
                    if item.get('href'):
                        print(f"    Link: {item['href']}")

                    dou_result = json.dumps(item, ensure_ascii=False)
                    # Evita duplicatas: só insere se ainda não existe para essa pessoa
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
            print(f"\n{salvos} novo(s) resultado(s) salvo(s) no banco.")

    except sqlite3.Error as erro:
        print(f"Erro ao buscar no DOU: {erro}")

