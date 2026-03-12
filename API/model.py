from controller import *

# Entrada de dados do usuário

def new_person():
    # Solicita os dados de cadastro.
    print(f"###### CADASTRO DE PESSOA ######\n\n")
    nome = input("Nome: ")
    telefone = input("Telefone: ")
    email = input("Email: ")
    password = input("Senha: ")
    return create_person(nome, telefone, email, password)


def update_person():
    # Solicita os dados de edição.
    print(f"###### EDIÇÃO DE PESSOA ######\n\n")
    id_person = input("ID: ")
    nome = input("Novo nome (deixe em branco para não alterar): ")
    telefone = input("Novo telefone (deixe em branco para não alterar): ")
    email = input("Novo email (deixe em branco para não alterar): ")
    password = input("Nova senha (deixe em branco para não alterar): ")
    return edit_person(
        id_person,
        nome if nome else None,
        telefone if telefone else None,
        email if email else None,
        password if password else None
    )


def remove_person():
    # Solicita o ID para exclusão.
    print(f"###### EXCLUSÃO DE PESSOA ######\n\n")
    id_person = input("ID: ")
    return delete_person(id_person)


def login():
    # Solicita as credenciais.
    print(f"###### LOGIN ######\n\n")
    user = input("Usuário: ")
    password = input("Senha: ")
    return login_user(user, password)


def new_enrollment(id_person):
    # Solicita a inscrição.
    print(f"###### MATRÍCULA EM CONCURSO ######\n\n")
    subscrition = input("Nº de inscrição: ")
    return create_enrollment(id_person, subscrition)


def search_person(id_person):
    # Inicia a busca no DOU.
    print(f"###### BUSCAR SITUAÇÃO NO DOU ######\n")
    search_dou(id_person)