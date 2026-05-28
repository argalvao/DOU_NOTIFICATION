/**
 * api.js – Cliente HTTP para a API do DOU Notificações.
 * Base URL configurável via variável API_BASE.
 */

const API_BASE = '';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== null) options.body = JSON.stringify(body);

  try {
    const res  = await fetch(`${API_BASE}${path}`, options);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(json.error || `Erro ${res.status}`, res.status);
    return json;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      'Não foi possível conectar ao servidor. Verifique se a API está em execução.',
      0,
    );
  }
}

export const Api = {
  /* Autenticação */
  login: (user, password) =>
    request('POST', '/api/login', { user, password }),

  /* Pessoas */
  createPerson: (data) =>
    request('POST', '/api/persons', data),

  getPerson: (id) =>
    request('GET', `/api/persons/${id}`),

  /* Inscrições */
  getEnrollments: (personId) =>
    request('GET', `/api/persons/${personId}/enrollments`),

  createEnrollment: (personId, subscription) =>
    request('POST', `/api/persons/${personId}/enrollments`, { subscription }),

  deleteEnrollment: (personId, enrollmentId) =>
    request('DELETE', `/api/persons/${personId}/enrollments/${enrollmentId}`),

  /* Resultados */
  getResults(personId, query = '', source = '') {
    let url = `/api/persons/${personId}/results`;
    const params = new URLSearchParams();
    if (query)  params.set('query',  query);
    if (source) params.set('source', source);
    if ([...params].length) url += '?' + params.toString();
    return request('GET', url);
  },

  /* Busca no DOU */
  searchDou: (personId) =>
    request('POST', `/api/persons/${personId}/search`),
};
