/* ============================================================
   DOU NOTIFICAÇÕES – SPA App
   ============================================================ */

'use strict';

/* ──────────────────────────────────────────────
   CONFIG
   ────────────────────────────────────────────── */
const API_BASE = 'http://127.0.0.1:8000';
const RESULTS_PER_PAGE = 8;

/* ──────────────────────────────────────────────
   SESSION (localStorage)
   ────────────────────────────────────────────── */
const Session = (() => {
  const KEY = 'dou_session';

  function get()        { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } }
  function set(data)    { localStorage.setItem(KEY, JSON.stringify(data)); }
  function clear()      { localStorage.removeItem(KEY); }
  function isLoggedIn() { return !!get(); }

  return { get, set, clear, isLoggedIn };
})();

/* ──────────────────────────────────────────────
   API CLIENT
   ────────────────────────────────────────────── */
const Api = (() => {

  async function request(method, path, body = null) {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body !== null) options.body = JSON.stringify(body);

    try {
      const res = await fetch(`${API_BASE}${path}`, options);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new ApiError(json.error || `Erro ${res.status}`, res.status);
      return json;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError('Não foi possível conectar ao servidor. Verifique se a API está em execução.', 0);
    }
  }

  function get(path)          { return request('GET',    path); }
  function post(path, body)   { return request('POST',   path, body); }
  function put(path, body)    { return request('PUT',    path, body); }
  function del(path)          { return request('DELETE', path); }

  // Endpoints
  const login         = (user, password)       => post('/api/login', { user, password });
  const createPerson  = (data)                 => post('/api/persons', data);
  const getPerson     = (id)                   => get(`/api/persons/${id}`);
  const getEnrollments = (personId)            => get(`/api/persons/${personId}/enrollments`);
  const createEnrollment = (personId, sub)     => post(`/api/persons/${personId}/enrollments`, { subscription: sub });
  const getResults    = (personId, q, src)     => {
    let url = `/api/persons/${personId}/results`;
    const params = new URLSearchParams();
    if (q)   params.set('query', q);
    if (src) params.set('source', src);
    if ([...params].length) url += '?' + params.toString();
    return get(url);
  };
  const searchDou     = (personId)             => post(`/api/persons/${personId}/search`);
  const health        = ()                     => get('/api/health');

  return { login, createPerson, getPerson, getEnrollments, createEnrollment, getResults, searchDou, health };
})();

class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

/* ──────────────────────────────────────────────
   TOAST
   ────────────────────────────────────────────── */
const Toast = (() => {
  const container = document.getElementById('toast-container');

  function show(message, type = 'info', duration = 4000) {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), duration);
  }

  return {
    success: (m) => show(m, 'success'),
    error:   (m) => show(m, 'error'),
    info:    (m) => show(m, 'info'),
  };
})();

/* ──────────────────────────────────────────────
   ROUTER (hash-based)
   ────────────────────────────────────────────── */
const Router = (() => {
  const PROTECTED = ['enrollment', 'query', 'results'];
  const GUEST_ONLY = ['login', 'register'];
  const views = {};
  let currentPage = null;

  function registerView(name, el) { views[name] = el; }

  function navigate(page, { replace = false } = {}) {
    const target = page || 'home';
    if (replace) {
      history.replaceState(null, '', `#${target}`);
      resolve(); // replaceState não dispara hashchange — resolver manualmente
    } else {
      location.hash = `#${target}`;
    }
  }

  function resolve() {
    const hash = location.hash.replace('#', '') || 'home';
    const session = Session.isLoggedIn();

    let page = hash;

    if (PROTECTED.includes(page) && !session) {
      Toast.info('Faça login para acessar esta página.');
      page = 'login';
      history.replaceState(null, '', '#login');
    }

    if (GUEST_ONLY.includes(page) && session) {
      page = 'home';
      history.replaceState(null, '', '#home');
    }

    if (!views[page]) page = 'home';

    // Hide all, show target
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[page].classList.remove('hidden');

    updateNav(page, session);

    if (page !== currentPage) {
      currentPage = page;
      onPageEnter(page);
    } else {
      // Re-entering same page (e.g. refresh link)
      onPageEnter(page);
    }
  }

  window.addEventListener('hashchange', resolve);

  return { navigate, resolve, registerView };
})();

/* ──────────────────────────────────────────────
   NAV
   ────────────────────────────────────────────── */
function updateNav(activePage, loggedIn) {
  // Auth-conditional items
  document.querySelectorAll('.nav-auth-on').forEach(el =>
    el.classList.toggle('hidden', !loggedIn)
  );
  document.querySelectorAll('.nav-auth-off').forEach(el =>
    el.classList.toggle('hidden', loggedIn)
  );

  // Home CTA buttons
  document.querySelectorAll('.hero-cta-on').forEach(el =>
    el.classList.toggle('hidden', !loggedIn)
  );
  document.querySelectorAll('.hero-cta-off').forEach(el =>
    el.classList.toggle('hidden', loggedIn)
  );

  // Active link
  document.querySelectorAll('.nav-links a').forEach(a => {
    const page = a.getAttribute('data-page');
    a.classList.toggle('active', page === activePage);
  });
}

// Mobile menu toggle
const navToggle = document.getElementById('nav-toggle');
const navLinks  = document.getElementById('nav-links');
navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.classList.toggle('open', open);
});
navLinks.addEventListener('click', e => {
  if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') {
    navLinks.classList.remove('open');
    navToggle.classList.remove('open');
  }
});

/* ──────────────────────────────────────────────
   FORM HELPERS
   ────────────────────────────────────────────── */
function setLoading(btn, loading) {
  const text    = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.btn-spinner');
  btn.disabled  = loading;
  text?.classList.toggle('hidden', loading);
  spinner?.classList.toggle('hidden', !loading);
}

function showError(elId, message) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
}

function clearError(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = '';
  el.classList.add('hidden');
}

// Toggle password visibility
document.querySelectorAll('.toggle-pass').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
    btn.textContent = input.type === 'password' ? '👁' : '🙈';
  });
});

/* ──────────────────────────────────────────────
   PAGE: LOGIN
   ────────────────────────────────────────────── */
function initLogin() {
  const form    = document.getElementById('form-login');
  const btnEl   = document.getElementById('btn-login');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError('login-error');

    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      showError('login-error', 'Preencha todos os campos.');
      return;
    }

    setLoading(btnEl, true);
    try {
      const session = await Api.login(email, password);
      Session.set(session);
      Toast.success(`Bem-vindo, ${session.nome}!`);
      Router.navigate('home', { replace: true });
    } catch (err) {
      showError('login-error', err.message);
    } finally {
      setLoading(btnEl, false);
    }
  });
}

/* ──────────────────────────────────────────────
   PAGE: REGISTER
   ────────────────────────────────────────────── */
function initRegister() {
  const form  = document.getElementById('form-register');
  const btnEl = document.getElementById('btn-register');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError('register-error');

    const nome     = document.getElementById('reg-nome').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const telefone = document.getElementById('reg-telefone').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm  = document.getElementById('reg-confirm').value;

    if (!nome || !email || !password) {
      showError('register-error', 'Preencha todos os campos obrigatórios.');
      return;
    }
    if (password.length < 6) {
      showError('register-error', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      showError('register-error', 'As senhas não coincidem.');
      return;
    }

    setLoading(btnEl, true);
    try {
      const person = await Api.createPerson({ nome, email, telefone: telefone || null, password });
      // Auto-login after register: use email as user credential
      const session = await Api.login(email, password);
      Session.set(session);
      Toast.success(`Conta criada com sucesso! Bem-vindo, ${person.nome}!`);
      form.reset();
      Router.navigate('enrollment', { replace: true });
    } catch (err) {
      showError('register-error', err.message);
    } finally {
      setLoading(btnEl, false);
    }
  });
}

/* ──────────────────────────────────────────────
   PAGE: ENROLLMENT
   ────────────────────────────────────────────── */
let enrollmentData = [];

async function loadEnrollments() {
  const session = Session.get();
  if (!session) return;

  const listEl = document.getElementById('enrollment-list');
  listEl.innerHTML = `<div class="loading-state"><span class="spinner"></span> Carregando inscrições…</div>`;

  try {
    const data = await Api.getEnrollments(session.id_person);
    enrollmentData = data.items || [];
    renderEnrollments(enrollmentData);
  } catch (err) {
    listEl.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">⚠️</div>
      <h3>Erro ao carregar</h3>
      <p>${err.message}</p>
    </div>`;
  }
}

function renderEnrollments(items) {
  const listEl = document.getElementById('enrollment-list');

  if (!items.length) {
    listEl.innerHTML = `<div class="enrollment-empty">
      Nenhuma inscrição cadastrada. Adicione sua primeira acima.
    </div>`;
    return;
  }

  const rows = items.map(item => `
    <tr>
      <td>${item.id_enrollment}</td>
      <td><strong>${escapeHtml(item.subscription)}</strong></td>
    </tr>
  `).join('');

  listEl.innerHTML = `
    <table class="enrollment-table">
      <thead>
        <tr><th>#</th><th>Número de inscrição</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function initEnrollment() {
  const form  = document.getElementById('form-enrollment');
  const btnEl = document.getElementById('btn-enrollment');
  const refreshBtn = document.getElementById('btn-refresh-enr');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError('enrollment-error');

    const session = Session.get();
    const sub = document.getElementById('enr-subscription').value.trim();

    if (!sub) {
      showError('enrollment-error', 'Informe o número de inscrição.');
      return;
    }

    setLoading(btnEl, true);
    try {
      await Api.createEnrollment(session.id_person, sub);
      Toast.success('Inscrição cadastrada com sucesso!');
      document.getElementById('enr-subscription').value = '';
      await loadEnrollments();
    } catch (err) {
      showError('enrollment-error', err.message);
    } finally {
      setLoading(btnEl, false);
    }
  });

  refreshBtn.addEventListener('click', loadEnrollments);
}

/* ──────────────────────────────────────────────
   PAGE: QUERY
   ────────────────────────────────────────────── */
function initQuery() {
  const btnSearch  = document.getElementById('btn-search-dou');
  const formFilter = document.getElementById('form-filter');

  btnSearch.addEventListener('click', async () => {
    const session = Session.get();
    clearError('query-error');

    const resultEl = document.getElementById('query-result');
    resultEl.classList.add('hidden');

    setLoading(btnSearch, true);
    try {
      const data = await Api.searchDou(session.id_person);
      resultEl.textContent = `✔ Busca concluída. ${data.count} resultado(s) encontrado(s).`;
      resultEl.classList.remove('hidden');
      Toast.success('Busca no DOU concluída!');
    } catch (err) {
      showError('query-error', err.message);
    } finally {
      setLoading(btnSearch, false);
    }
  });

  formFilter.addEventListener('submit', (e) => {
    e.preventDefault();
    const q   = document.getElementById('filter-query').value.trim();
    const src = document.getElementById('filter-source').value;

    // Navigate to results with filter params encoded in hash
    const params = new URLSearchParams();
    if (q)   params.set('q', q);
    if (src) params.set('src', src);
    location.hash = `#results${params.toString() ? '?' + params.toString() : ''}`;
  });
}

function onQueryEnter() {
  const session = Session.get();
  if (!session) return;

  const info = document.getElementById('query-user-info');
  info.innerHTML = `Buscando publicações para: <strong>${escapeHtml(session.nome)}</strong>`;
}

/* ──────────────────────────────────────────────
   PAGE: RESULTS
   ────────────────────────────────────────────── */
let allResults  = [];
let currentPage = 1;
let filterText  = '';

async function loadResults(query = '', source = '') {
  const session = Session.get();
  if (!session) return;

  const container = document.getElementById('results-container');
  container.innerHTML = `<div class="loading-state"><span class="spinner"></span> Carregando resultados…</div>`;
  document.getElementById('results-meta').textContent = '–';
  document.getElementById('pagination').innerHTML = '';

  try {
    const data = await Api.getResults(session.id_person, query, source);
    allResults = data.items || [];
    currentPage = 1;
    filterText  = '';
    document.getElementById('results-search').value = '';
    renderResults();
    document.getElementById('results-meta').textContent =
      `${data.count} resultado(s) encontrado(s) para ${escapeHtml(session.nome)}`;
  } catch (err) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">⚠️</div>
      <h3>Erro ao carregar resultados</h3>
      <p>${err.message}</p>
    </div>`;
  }
}

function renderResults() {
  const container = document.getElementById('results-container');
  const pagination = document.getElementById('pagination');

  const filtered = filterText
    ? allResults.filter(r => {
        const q = filterText.toLowerCase();
        return (r.title  || '').toLowerCase().includes(q)
            || (r.content || '').toLowerCase().includes(q)
            || (r.section || '').toLowerCase().includes(q);
      })
    : allResults;

  if (!filtered.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">📭</div>
      <h3>Nenhum resultado encontrado</h3>
      <p>Tente executar uma nova busca no DOU ou aguarde a atualização diária automática.</p>
    </div>`;
    pagination.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(filtered.length / RESULTS_PER_PAGE);
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * RESULTS_PER_PAGE;
  const slice = filtered.slice(start, start + RESULTS_PER_PAGE);

  container.innerHTML = slice.map(item => resultCardHtml(item)).join('');
  renderPagination(totalPages, filtered.length);
}

function resultCardHtml(item) {
  const section  = escapeHtml(item.section  || '—');
  const date     = escapeHtml(item.publicationDate || '—');
  const edition  = escapeHtml(item.edition  || '—');
  const title    = escapeHtml(item.title    || 'Sem título');
  const content  = escapeHtml(item.content  || '');
  const source   = item.source === 'xml' ? 'xml' : 'web';
  const href     = item.href || '';

  return `
    <div class="result-card">
      <div class="result-header">
        <div class="result-title">${title}</div>
        <div class="result-badges">
          <span class="badge badge-section">${section}</span>
          <span class="badge badge-source-${source}">${source === 'xml' ? 'Dados Abertos' : 'Portal DOU'}</span>
        </div>
      </div>
      <div class="result-meta">
        <span>${date}</span>
        <span>Edição ${edition}</span>
      </div>
      ${content ? `<div class="result-content">${content.substring(0, 400)}${content.length > 400 ? '…' : ''}</div>` : ''}
      ${href ? `<a class="result-link" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">🔗 Ver no DOU ↗</a>` : ''}
    </div>
  `;
}

function renderPagination(totalPages, totalItems) {
  const pagination = document.getElementById('pagination');
  if (totalPages <= 1) { pagination.innerHTML = ''; return; }

  const pages = [];
  const range = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - range && i <= currentPage + range)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  pagination.innerHTML = [
    `<button ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">‹</button>`,
    ...pages.map(p =>
      p === '...'
        ? `<button disabled>…</button>`
        : `<button class="${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`
    ),
    `<button ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">›</button>`,
  ].join('');

  pagination.querySelectorAll('button[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = parseInt(btn.dataset.page, 10);
      renderResults();
      document.getElementById('view-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function initResults() {
  const searchInput  = document.getElementById('results-search');
  const refreshBtn   = document.getElementById('btn-refresh-results');

  searchInput.addEventListener('input', () => {
    filterText  = searchInput.value.trim();
    currentPage = 1;
    renderResults();
  });

  refreshBtn.addEventListener('click', () => loadResults());
}

function onResultsEnter() {
  // Parse filter params from hash if coming from query page
  const hash = location.hash;
  const qIndex = hash.indexOf('?');
  let q = '', src = '';
  if (qIndex !== -1) {
    const params = new URLSearchParams(hash.substring(qIndex + 1));
    q   = params.get('q')   || '';
    src = params.get('src') || '';
    if (q) document.getElementById('filter-query').value = q;
    if (src) document.getElementById('filter-source').value = src;
  }
  loadResults(q, src);
}

/* ──────────────────────────────────────────────
   PAGE ENTER HOOKS
   ────────────────────────────────────────────── */
function onPageEnter(page) {
  switch (page) {
    case 'enrollment': loadEnrollments(); break;
    case 'query':      onQueryEnter();    break;
    case 'results':    onResultsEnter();  break;
  }
}

/* ──────────────────────────────────────────────
   LOGOUT
   ────────────────────────────────────────────── */
document.getElementById('btn-logout').addEventListener('click', () => {
  const session = Session.get();
  Session.clear();
  Toast.info(`Até logo, ${session?.nome || ''}!`);
  Router.navigate('home', { replace: true });
});

/* ──────────────────────────────────────────────
   SECURITY: HTML ESCAPE
   ────────────────────────────────────────────── */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
  if (typeof str !== 'string') return '';
  // Only allow http/https URLs
  const trimmed = str.trim();
  if (!/^https?:\/\//i.test(trimmed)) return '#';
  return escapeHtml(trimmed);
}

/* ──────────────────────────────────────────────
   BOOTSTRAP
   ────────────────────────────────────────────── */
function init() {
  // Register views
  ['home', 'login', 'register', 'enrollment', 'query', 'results'].forEach(page => {
    Router.registerView(page, document.getElementById(`view-${page}`));
  });

  // Init forms
  initLogin();
  initRegister();
  initEnrollment();
  initQuery();
  initResults();

  // Initial route
  Router.resolve();
}

document.addEventListener('DOMContentLoaded', init);
