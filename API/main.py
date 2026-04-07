import os
from model import *

# Sessão atual
session = None

# Inicia o agendamento diário do download do DOU em background
get_dou()


def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

# Menu principal
while True:
    clear_screen()

    print(f"###### NOTIFICAÇÕES DO DOU ######")

    if session:
        print(f"Usuário logado: {session['nome']}\n")
        print(f"1 - CADASTRO\n2 - EDIÇÃO\n3 - CONSULTA\n4 - EXCLUSÃO\n5 - LOGOUT\n6 - SAIR\n")
    else:
        print(f"(Nenhum usuário logado)\n")
        print(f"1 - CADASTRO\n2 - EDIÇÃO\n3 - CONSULTA\n4 - EXCLUSÃO\n5 - LOGIN\n6 - SAIR\n")

    option = input("Selecione uma opção para continuar: ")
    clear_screen()

    match option:
        case "1":
            new_person()

        case "2":
            update_person()

        case "3":
            if not session:
                print("Acesso negado. Faça login para acessar a consulta.")
            else:
                clear_screen()
                print(f"###### MATRÍCULAS DE CONCURSOS ######\n\n")
                print(f"1 - NOVA MATRÍCULA\n2 - BUSCAR SITUAÇÃO\n3 - VOLTAR\n")
                sub_option = input("Selecione uma opção para continuar: ")
                clear_screen()
                match sub_option:
                    case "1":
                        new_enrollment(session['id_person'])
                    case "2":
                        search_person(session['id_person'])
                    case "3":
                        continue
                    case _:
                        print("Opção inválida. Tente novamente.")

        case "4":
            remove_person()

        case "5":
            if session:
                print(f"Até logo, {session['nome']}!")
                session = None
            else:
                session = login()

        case "6":
            print("Encerrando o sistema. Até logo!")
            break

        case _:
            print("Opção inválida. Tente novamente.")

    input("\nPressione Enter para continuar...")
