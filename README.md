# DOU Notification

Projeto desenvolvido para a disciplina **EXA618 — Programação para Redes**  
Universidade Estadual de Feira de Santana (UEFS)

---

## Descrição

Sistema de monitoramento e notificação de publicações no **Diário Oficial da União (DOU)**. O usuário cadastra seu nome e número de inscrição em concursos públicos, e o sistema realiza buscas automatizadas no portal oficial `www.in.gov.br`, coletando e armazenando as publicações relevantes.

---

## Estrutura do Projeto

```
DOU_NOTIFICATION/
├── API/
│   ├── main.py         # Ponto de entrada — menu CLI com loop
│   ├── model.py        # Camada de apresentação (coleta de inputs)
│   ├── controller.py   # Lógica de negócio e acesso ao banco
│   └── service.py      # Crawler — requisições e parsing do DOU
└── DB/
    └── database.db     # Banco de dados SQLite
```

---

## Arquitetura

```
main.py  →  model.py  →  controller.py  →  service.py  →  DOU (in.gov.br)
                               ↓
                         SQLite (database.db)
```

---

## Banco de Dados

| Tabela | Descrição |
|---|---|
| `person` | Dados do usuário (nome, telefone, e-mail) |
| `possibilities` | Variações do nome para busca (original, maiúsculo, minúsculo, sem acentos, etc.) |
| `user_autentication` | Credenciais de login (usuário = e-mail, senha em SHA-256) |
| `enrollment` | Inscrições em concursos públicos vinculadas ao usuário |
| `result` | Publicações do DOU coletadas pelo crawler |

---

## Funcionalidades

- **Cadastro** de pessoa com nome, telefone, e-mail e senha
- **Login/Logout** com autenticação por hash SHA-256
- **Edição** de dados cadastrais (incluindo senha)
- **Exclusão** em cascata (person, possibilities, user_autentication)
- **Matrícula** em concurso público por número de inscrição
- **Busca no DOU**: realiza uma requisição para cada variação de nome e por inscrição, deduplica os resultados e armazena na tabela `result`

---

## Crawler (service.py)

O crawler acessa o portal `www.in.gov.br` e extrai os resultados embutidos na página como JSON no elemento `#BuscaDouPortlet_params`, utilizando:

- **`requests`** — requisições HTTP com headers de navegador para evitar bloqueios
- **`BeautifulSoup`** — parsing do HTML da resposta
- **Busca por frase exata** — nomes compostos são envolvidos em aspas (`"Abel Ramalho Galvão"`) para evitar resultados irrelevantes

Dados extraídos por publicação:

| Campo | Descrição |
|---|---|
| `title` | Título da publicação |
| `content` | Trecho onde o nome aparece |
| `publicationDate` | Data de publicação |
| `edition` | Número da edição |
| `section` | Seção do DOU (DO1, DO2, DO3) |
| `href` | Link direto para a publicação |

---

## Etapas do Projeto

| Parte | Descrição | Status |
|---|---|---|
| **Parte 1** | Crawler — coleta de dados estruturados do DOU | ✅ Implementado |
| **Parte 2** | Armazenamento e API REST para recuperação dos dados | 🔜 Pendente |
| **Parte 3** | Interface Web responsiva consumindo a API | 🔜 Pendente |

---

## Como Executar

### Pré-requisitos

```bash
pip install requests beautifulsoup4
```

### Execução

```bash
cd DOU_NOTIFICATION/API
python3 main.py
```

### Menu principal

```
###### NOTIFICAÇÕES DO DOU ######

1 - CADASTRO
2 - EDIÇÃO
3 - CONSULTA      ← requer login
4 - EXCLUSÃO
5 - LOGIN / LOGOUT
6 - SAIR
```

---

## Dependências

| Biblioteca | Uso |
|---|---|
| `sqlite3` | Banco de dados (built-in Python) |
| `requests` | Requisições HTTP ao portal do DOU |
| `beautifulsoup4` | Parsing do HTML da resposta |
| `hashlib` | Hash SHA-256 das senhas |
| `unicodedata` | Normalização de acentos para variações de nome |

---

## Autor

Abel Ramalho Galvão  
EXA618 — Programação para Redes  
UEFS — 2026.1
