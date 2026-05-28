/**
 * pages/login.js – Tela de login.
 */

import { Api }      from '../api.js';
import { Session }  from '../session.js';
import { Toast }    from '../toast.js';
import { navigate } from '../router.js';
import { setLoading, showError, clearError, setupPasswordToggles } from '../utils.js';

export const login = {
  template: () => /* html */`
    <div class="view form-page">
      <div class="form-card">
        <div class="form-card-header">
          <div class="form-icon">🔐</div>
          <h2>Entrar na conta</h2>
          <p>Informe suas credenciais para acessar o sistema</p>
        </div>

        <form id="form-login" novalidate>
          <div class="field">
            <label for="login-email">E-mail</label>
            <input id="login-email" type="email" placeholder="seu@email.com"
                   autocomplete="email" required />
          </div>

          <div class="field">
            <label for="login-password">Senha</label>
            <div class="input-icon-wrapper">
              <input id="login-password" type="password" placeholder="••••••••"
                     autocomplete="current-password" required />
              <button type="button" class="toggle-pass" data-target="login-password">👁</button>
            </div>
          </div>

          <div class="form-error hidden" id="login-error"></div>

          <button type="submit" class="btn btn-primary btn-full" id="btn-login">
            <span class="btn-text">Entrar</span>
            <span class="btn-spinner hidden">⏳</span>
          </button>
        </form>

        <p class="form-footer">Não tem conta? <a href="#register">Criar cadastro</a></p>
      </div>
    </div>
  `,

  init() {
    setupPasswordToggles();

    const form  = document.getElementById('form-login');
    const btnEl = document.getElementById('btn-login');

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
        navigate('home', { replace: true });
      } catch (err) {
        showError('login-error', err.message);
      } finally {
        setLoading(btnEl, false);
      }
    });
  },
};
