/**
 * router.js – Roteador hash-based para a SPA.
 *
 * Rotas protegidas redirecionam para login se não autenticado.
 * Rotas exclusivas de visitante redirecionam para home se autenticado.
 * Cada página é um módulo com `template()` e opcionalmente `init()`.
 */

import { Session } from './session.js';
import { Toast }   from './toast.js';

const PROTECTED  = new Set(['enrollment', 'query', 'results', 'profile']);
const GUEST_ONLY = new Set(['login', 'register']);

/** @type {Record<string, { template(): string, init?(): void }>} */
const registry = {};

const appEl = document.getElementById('app');

/** Registra um módulo de página no roteador. */
export function registerPage(name, pageModule) {
  registry[name] = pageModule;
}

/** Navega para a página indicada. */
export function navigate(page, { replace = false } = {}) {
  const target = page || 'home';
  if (replace) {
    history.replaceState(null, '', `#${target}`);
    resolve(); // replaceState não dispara hashchange
  } else {
    location.hash = `#${target}`;
  }
}

/** Resolve a rota atual e renderiza a página correspondente. */
export function resolve() {
  const raw      = location.hash.replace('#', '').split('?')[0] || 'home';
  const loggedIn = Session.isLoggedIn();
  let page       = raw;

  if (PROTECTED.has(page) && !loggedIn) {
    Toast.info('Faça login para acessar esta página.');
    page = 'login';
    history.replaceState(null, '', '#login');
  }

  if (GUEST_ONLY.has(page) && loggedIn) {
    page = 'home';
    history.replaceState(null, '', '#home');
  }

  if (!registry[page]) page = 'home';

  appEl.innerHTML = registry[page].template();
  _updateNav(page, loggedIn);
  registry[page].init?.();
}

function _updateNav(activePage, loggedIn) {
  document.querySelectorAll('.nav-auth-on').forEach(el =>
    el.classList.toggle('hidden', !loggedIn),
  );
  document.querySelectorAll('.nav-auth-off').forEach(el =>
    el.classList.toggle('hidden', loggedIn),
  );
  // Botões CTA da home (renderizados dinamicamente)
  document.querySelectorAll('.hero-cta-on').forEach(el =>
    el.classList.toggle('hidden', !loggedIn),
  );
  document.querySelectorAll('.hero-cta-off').forEach(el =>
    el.classList.toggle('hidden', loggedIn),
  );
  document.querySelectorAll('.nav-links a[data-page]').forEach(a =>
    a.classList.toggle('active', a.dataset.page === activePage),
  );
}

window.addEventListener('hashchange', resolve);
