# DOU Notification

Projeto desenvolvido para a disciplina **EXA618 — Programação para Redes**  
Universidade Estadual de Feira de Santana (UEFS)

---

## Descrição

Sistema de monitoramento e notificação de publicações no **Diário Oficial da União (DOU)**. O usuário cadastra seu nome e números de inscrição em concursos públicos, e o sistema realiza buscas automatizadas no portal oficial `www.in.gov.br`, coletando e armazenando publicações relevantes tanto pela **API/pesquisa web do DOU** quanto pelos **arquivos XML extraídos dos pacotes mensais oficiais**.

---

## Estrutura do Projeto

```
DOU_NOTIFICATION/
├── API/
│   ├── app.py          # API REST em Flask
│   ├── main.py         # Ponto de entrada — menu CLI com loop
│   ├── model.py        # Camada de apresentação (coleta de inputs)
│   ├── controller.py   # Lógica de negócio, agendamento e acesso ao banco
│   └── service.py      # Crawler e download dos pacotes oficiais do DOU
├── requirements.txt    # Dependências do projeto
└── DB/
    ├── database.db     # Banco de dados SQLite
    └── DOWNLOAD/       # ZIPs mensais e XMLs extraídos do DOU
```

---

## Arquitetura

```
main.py  →  model.py  →  controller.py  →  service.py  →  DOU (in.gov.br)
                     ↓                    ↓
                SQLite (database.db)   DB/DOWNLOAD (ZIP/XML)
```

---

## Banco de Dados

| Tabela | Descrição |
|---|---|
| `person` | Dados do usuário (nome, telefone, e-mail) |
| `possibilities` | Variações do nome para busca (original, maiúsculo, minúsculo, sem acentos, etc.) |
| `user` | Credenciais de login (usuário = e-mail, senha em SHA-256) |
| `enrollment` | Inscrições em concursos públicos vinculadas ao usuário |
| `result` | Publicações do DOU coletadas via pesquisa web e/ou XML |

---

## Funcionalidades

- **Cadastro** de pessoa com nome, telefone, e-mail e senha
- **Login/Logout** com autenticação por hash SHA-256
- **Edição** de dados cadastrais (incluindo senha)
- **Exclusão** em cascata (person, possibilities, user)
- **Matrícula** em concurso público por número de inscrição
- **Busca no DOU** via portal web: realiza uma requisição para cada variação de nome e por inscrição, deduplica os resultados e armazena na tabela `result`
- **Download automático da Seção 2 do DOU** para [DB/DOWNLOAD](DB/DOWNLOAD), sempre às 05:00
- **Extração automática dos arquivos ZIP** baixados para pastas com os XMLs do mês correspondente
- **Busca complementar nos XMLs extraídos** para todos os usuários cadastrados
- **Rotina automática diária em background** para download, extração e processamento dos resultados

---

## Coleta de Dados

### Pesquisa web do DOU (`service.py`)

O crawler acessa o portal `www.in.gov.br` e extrai os resultados embutidos na página como JSON no elemento `#BuscaDouPortlet_params`, utilizando:

- **`requests`** — requisições HTTP com headers de navegador para evitar bloqueios
- **`BeautifulSoup`** — parsing do HTML da resposta
- **Busca por frase exata** — nomes compostos são envolvidos em aspas (`"Abel Ramalho Galvão"`) para evitar resultados irrelevantes

### Base mensal em formato aberto (`service.py` + `controller.py`)

Além da pesquisa web, o sistema também consome a base mensal oficial do DOU em formato aberto:

- acessa a página oficial de dados abertos do DOU;
- baixa o arquivo `S02MMYYYY.zip` da **Seção 2**;
- armazena o ZIP em [DB/DOWNLOAD](DB/DOWNLOAD);
- extrai automaticamente os arquivos XML;
- lê os XMLs e procura ocorrências dos nomes e inscrições cadastrados.

Observação: a Imprensa Nacional publica esses pacotes mensalmente, normalmente na **primeira terça-feira do mês**, contendo as edições do **mês anterior**. Por isso, o arquivo do mês vigente pode ainda não estar disponível em alguns dias.

Dados extraídos por publicação:

| Campo | Descrição |
|---|---|
| `title` | Título da publicação |
| `content` | Trecho onde o nome aparece |
| `publicationDate` | Data de publicação |
| `edition` | Número da edição |
| `section` | Seção do DOU (DO1, DO2, DO3) |
| `href` | Link direto para a publicação |
| `source` | Origem do dado (`xml`, quando vier da base extraída) |
| `xmlPath` | Caminho relativo do XML processado, quando aplicável |

---

## Rotina Automática

Ao iniciar o sistema, uma thread em background é criada para executar diariamente a rotina automática do DOU.

Fluxo da rotina:

1. aguarda até **05:00**;
2. tenta baixar o pacote mensal da **Seção 2**;
3. extrai o conteúdo do ZIP, quando disponível;
4. executa `search_dou_all()` para todos os usuários cadastrados;
5. salva no banco apenas os resultados ainda não armazenados.

As buscas automáticas usam logs resumidos para evitar poluição no terminal.

---

## Etapas do Projeto

| Parte | Descrição | Status |
|---|---|---|
| **Parte 1** | Crawler, download mensal, extração XML e coleta estruturada do DOU | ✅ Implementado |
| **Parte 2** | Armazenamento e API REST para recuperação dos dados em JSON | ✅ Implementado localmente |
| **Parte 3** | Interface Web responsiva consumindo a API | 🔜 Pendente |

### Endpoints da API REST

Ao lado do menu em terminal, o projeto possui uma API HTTP que retorna JSON. Quando `main.py` é inicializado, a API também é iniciada automaticamente em background na porta `8000`, se ela ainda não estiver em execução.

Arquivo principal da API: [API/app.py](API/app.py)

Endpoints disponíveis:

- `GET /api/health`
- `GET /api/persons`
- `GET /api/persons/<id>`
- `POST /api/persons`
- `PUT /api/persons/<id>`
- `DELETE /api/persons/<id>`
- `POST /api/login`
- `GET /api/persons/<id>/enrollments`
- `POST /api/persons/<id>/enrollments`
- `GET /api/persons/<id>/results?query=&source=`
- `POST /api/persons/<id>/search`

Exemplo de corpo JSON para criar pessoa:

```json
{
    "nome": "Abel Ramalho Galvão",
    "telefone": "75999999999",
    "email": "abel@email.com",
    "password": "123456"
}
```

Exemplo de corpo JSON para login:

```json
{
    "user": "abel@email.com",
    "password": "123456"
}
```

---

## Como Executar

### Pré-requisitos

```bash
cd DOU_NOTIFICATION
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

Ou, se preferir usar o Python global já configurado no sistema:

```bash
pip install -r requirements.txt
```

### Execução

```bash
cd DOU_NOTIFICATION/API
../.venv/bin/python main.py
```

Ao iniciar o menu, a seguinte mensagem será exibida no topo da tela:

```text
API disponível em http://127.0.0.1:8000
```

Isso indica que a API REST foi iniciada automaticamente em background pelo próprio `main.py`.

### Execução da API REST

```bash
cd DOU_NOTIFICATION
.venv/bin/python API/app.py
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
| `Flask` | API REST HTTP com retorno em JSON |
| `sqlite3` | Banco de dados (built-in Python) |
| `requests` | Requisições HTTP ao portal do DOU |
| `beautifulsoup4` | Parsing do HTML da resposta |
| `hashlib` | Hash SHA-256 das senhas |
| `unicodedata` | Normalização de acentos para variações de nome |
| `threading` | Rotina automática em background |
| `zipfile` | Extração dos pacotes ZIP do DOU |
| `xml.etree.ElementTree` | Leitura dos XMLs extraídos |

---

## Autor

Abel Ramalho Galvão  
EXA618 — Programação para Redes  
UEFS — 2026.1
