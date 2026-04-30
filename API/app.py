import os
import socket
import threading

from flask import Flask, jsonify, request

from controller import (
    create_enrollment,
    create_person,
    delete_person,
    edit_person,
    email_exists,
    get_dou,
    get_person_by_id,
    initialize_database,
    list_enrollments_by_person,
    list_people,
    list_results_by_person,
    login_user,
    search_dou,
)


app = Flask(__name__)
initialize_database()

_api_thread = None


@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    return response


def json_error(message, status_code=400):
    return jsonify({"error": message}), status_code


def get_json_body():
    payload = request.get_json(silent=True)
    if payload is None:
        return None, json_error("Envie um corpo JSON válido.")
    return payload, None


def ensure_person_exists(person_id):
    person = get_person_by_id(person_id)
    if not person:
        return None, json_error("Pessoa não encontrada.", 404)
    return person, None


@app.get('/api/health')
def health_check():
    return jsonify({
        "status": "ok",
        "service": "dou-notification-api",
        "part": 2,
    })


@app.get('/api/persons')
def get_persons():
    persons = list_people()
    return jsonify({
        "count": len(persons),
        "items": persons,
    })


@app.get('/api/persons/<int:person_id>')
def get_person(person_id):
    person, error = ensure_person_exists(person_id)
    if error:
        return error

    return jsonify(person)


@app.post('/api/persons')
def post_person():
    payload, error = get_json_body()
    if error:
        return error

    nome = str(payload.get('nome', '')).strip()
    telefone = str(payload.get('telefone', '')).strip() or None
    email = str(payload.get('email', '')).strip()
    password = str(payload.get('password', '')).strip()

    if not nome or not email or not password:
        return json_error("Os campos 'nome', 'email' e 'password' são obrigatórios.")

    if email_exists(email):
        return json_error("Já existe um usuário cadastrado com este email.", 409)

    person = create_person(nome, telefone, email, password)
    if not person:
        return json_error("Não foi possível cadastrar a pessoa.", 500)

    return jsonify(person), 201


@app.put('/api/persons/<int:person_id>')
def put_person(person_id):
    _, error = ensure_person_exists(person_id)
    if error:
        return error

    payload, error = get_json_body()
    if error:
        return error

    nome = payload.get('nome')
    telefone = payload.get('telefone')
    email = payload.get('email')
    password = payload.get('password')

    if email is not None:
        email = str(email).strip()
        if not email:
            return json_error("O campo 'email' não pode ficar vazio.")
        if email_exists(email, exclude_person_id=person_id):
            return json_error("Já existe um usuário cadastrado com este email.", 409)

    updated = edit_person(
        person_id,
        nome=str(nome).strip() if nome is not None else None,
        telefone=str(telefone).strip() if telefone is not None else None,
        email=email,
        password=str(password).strip() if password is not None else None,
    )

    if not updated:
        return json_error("Nenhuma alteração foi aplicada.", 400)

    return jsonify(get_person_by_id(person_id))


@app.delete('/api/persons/<int:person_id>')
def remove_person(person_id):
    _, error = ensure_person_exists(person_id)
    if error:
        return error

    deleted = delete_person(person_id)
    if not deleted:
        return json_error("Não foi possível excluir a pessoa.", 500)

    return jsonify({"message": "Pessoa removida com sucesso."})


@app.post('/api/login')
def post_login():
    payload, error = get_json_body()
    if error:
        return error

    user = str(payload.get('user', '')).strip()
    password = str(payload.get('password', '')).strip()

    if not user or not password:
        return json_error("Os campos 'user' e 'password' são obrigatórios.")

    session = login_user(user, password)
    if not session:
        return json_error("Usuário ou senha inválidos.", 401)

    return jsonify(session)


@app.get('/api/persons/<int:person_id>/enrollments')
def get_enrollments(person_id):
    person, error = ensure_person_exists(person_id)
    if error:
        return error

    enrollments = list_enrollments_by_person(person_id)
    return jsonify({
        "person": person,
        "count": len(enrollments),
        "items": enrollments,
    })


@app.post('/api/persons/<int:person_id>/enrollments')
def post_enrollment(person_id):
    _, error = ensure_person_exists(person_id)
    if error:
        return error

    payload, error = get_json_body()
    if error:
        return error

    subscription = str(payload.get('subscription', '')).strip()
    if not subscription:
        return json_error("O campo 'subscription' é obrigatório.")

    enrollment = create_enrollment(person_id, subscription)
    if not enrollment:
        return json_error("Não foi possível cadastrar a inscrição.", 500)

    return jsonify(enrollment), 201


@app.get('/api/persons/<int:person_id>/results')
def get_results(person_id):
    person, error = ensure_person_exists(person_id)
    if error:
        return error

    query = request.args.get('query', type=str)
    source = request.args.get('source', type=str)
    results = list_results_by_person(person_id, query=query, source=source)

    return jsonify({
        "person": person,
        "count": len(results),
        "filters": {
            "query": query,
            "source": source,
        },
        "items": results,
    })


@app.post('/api/persons/<int:person_id>/search')
def post_search(person_id):
    person, error = ensure_person_exists(person_id)
    if error:
        return error

    search_dou(person_id, verbose=False)
    results = list_results_by_person(person_id)

    return jsonify({
        "message": "Busca executada com sucesso.",
        "person": person,
        "count": len(results),
        "items": results,
    })


def start_background_jobs():
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not app.debug:
        get_dou()


def _is_port_in_use(host, port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        return sock.connect_ex((host, port)) == 0


def run_api(host='127.0.0.1', port=8000):
    start_background_jobs()
    app.run(host=host, port=port, debug=False, use_reloader=False)


def run_api_background(host='127.0.0.1', port=8000):
    global _api_thread

    if _api_thread and _api_thread.is_alive():
        return _api_thread

    if _is_port_in_use(host, port):
        return None

    _api_thread = threading.Thread(
        target=run_api,
        kwargs={'host': host, 'port': port},
        daemon=True,
        name='dou_notification_api'
    )
    _api_thread.start()
    return _api_thread


if __name__ == '__main__':
    run_api(host='0.0.0.0', port=8000)