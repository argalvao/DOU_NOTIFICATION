/**
 * main.js – Ponto de entrada da SPA.
 * Importa todos os módulos de página, registra-os no router
 * e configura os comportamentos globais (navbar mobile, logout).
 */

import { registerPage, navigate, resolve } from './router.js';
import { Session } from './session.js';
import { Toast }   from './toast.js';

import { home }       from './pages/home.js';
import { login }      from './pages/login.js';
import { register }   from './pages/register.js';
import { enrollment } from './pages/enrollment.js';
import { query }      from './pages/query.js';
import { results }    from './pages/results.js';
import { profile }    from './pages/profile.js';

// Registra as páginas no router
registerPage('home',       home);
registerPage('login',      login);
registerPage('register',   register);
registerPage('enrollment', enrollment);
registerPage('query',      query);
registerPage('results',    results);
registerPage('profile',    profile);

// Bootstrap após carregamento do DOM
document.addEventListener('DOMContentLoaded', () => {

  // -- Mobile: hambúrguer --
  const navToggle  = document.getElementById('nav-toggle');
  const navLinks   = document.querySelector('.nav-links');

  navToggle?.addEventListener('click', () => {
    navLinks?.classList.toggle('open');
    navToggle.classList.toggle('open');
    navToggle.setAttribute('aria-expanded',
      navToggle.classList.contains('open') ? 'true' : 'false');
  });

  // Fecha menu ao clicar em link de navegação
  navLinks?.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      navLinks.classList.remove('open');
      navToggle?.classList.remove('open');
      navToggle?.setAttribute('aria-expanded', 'false');
    }
  });

  // -- Logout --
  document.getElementById('btn-logout')?.addEventListener('click', (e) => {
    e.preventDefault();
    Session.clear();
    Toast.info('Sessão encerrada.');
    navigate('home', { replace: true });
  });

  // Inicia o router (renderiza a página conforme o hash atual)
  resolve();
});
