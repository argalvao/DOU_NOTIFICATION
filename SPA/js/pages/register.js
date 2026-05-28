/**
 * pages/register.js – Tela de cadastro de usuário.
 */

import { Api }      from '../api.js';
import { Session }  from '../session.js';
import { Toast }    from '../toast.js';
import { navigate } from '../router.js';
import { setLoading, showError, clearError, setupPasswordToggles } from '../utils.js';

export const register = {
  template: () => /* html */`
    <div class="view form-page">
      <div class="form-card">
        <div class="form-card-header">
          <div class="form-icon">✏️</div>
          <h2>Criar conta</h2>
          <p>Preencha os dados abaixo para se cadastrar</p>
        </div>

        <form id="form-register" novalidate>
          <div class="field">
            <label for="reg-nome">Nome completo <span class="required">*</span></label>
            <input id="reg-nome" type="text" placeholder="Seu nome completo"
                   autocomplete="name" required />
          </div>

          <div class="field">
            <label for="reg-email">E-mail <span class="required">*</span></label>
            <input id="reg-email" type="email" placeholder="seu@email.com"
                   autocomplete="email" required />
          </div>

          <div class="field">
            <label for="reg-telefone">Telefone</label>
            <input id="reg-telefone" type="tel" placeholder="(00) 00000-0000"
                   autocomplete="tel" />
          </div>

          <div class="field">
            <label for="reg-password">Senha <span class="required">*</span></label>
            <div class="input-icon-wrapper">
              <input id="reg-password" type="password" placeholder="Mínimo 6 caracteres"
                     autocomplete="new-password" required minlength="6" />
              <button type="button" class="toggle-pass" data-target="reg-password">👁</button>
            </div>
          </div>

          <div class="field">
            <label for="reg-confirm">Confirmar senha <span class="required">*</span></label>
            <div class="input-icon-wrapper">
              <input id="reg-confirm" type="password" placeholder="Repita a senha"
                     autocomplete="new-password" required />
              <button type="button" class="toggle-pass" data-target="reg-confirm">👁</button>
            </div>
          </div>

          <div class="form-error hidden" id="register-error"></div>

          <button type="submit" class="btn btn-primary btn-full" id="btn-register">
            <span class="btn-text">Criar conta</span>
            <span class="btn-spinner hidden">⏳</span>
          </button>
        </form>

        <p class="form-footer">Já tem conta? <a href="#login">Fazer login</a></p>
      </div>
    </div>
  `,

  init() {
    setupPasswordToggles();

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
        const person  = await Api.createPerson({ nome, email, telefone: telefone || null, password });
        const session = await Api.login(email, password);
        Session.set(session);
        Toast.success(`Conta criada com sucesso! Bem-vindo, ${person.nome}!`);
        navigate('enrollment', { replace: true });
      } catch (err) {
        showError('register-error', err.message);
      } finally {
        setLoading(btnEl, false);
      }
    });
  },
};
