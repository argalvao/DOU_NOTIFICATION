/**
 * pages/profile.js – Tela de edição do perfil do usuário.
 */

import { Api }      from '../api.js';
import { Session }  from '../session.js';
import { Toast }    from '../toast.js';
import { navigate } from '../router.js';
import { setLoading, showError, clearError, setupPasswordToggles } from '../utils.js';

export const profile = {
  template: () => /* html */`
    <div class="view form-page">
      <div class="form-card">
        <div class="form-card-header">
          <div class="form-icon">👤</div>
          <h2>Meu Perfil</h2>
          <p>Atualize seus dados cadastrais</p>
        </div>

        <form id="form-profile" novalidate>
          <div class="field">
            <label for="prof-nome">Nome completo <span class="required">*</span></label>
            <input id="prof-nome" type="text" placeholder="Seu nome completo"
                   autocomplete="name" required />
          </div>

          <div class="field">
            <label for="prof-email">E-mail <span class="required">*</span></label>
            <input id="prof-email" type="email" placeholder="seu@email.com"
                   autocomplete="email" required />
          </div>

          <div class="field">
            <label for="prof-telefone">Telefone</label>
            <input id="prof-telefone" type="tel" placeholder="(00) 00000-0000"
                   autocomplete="tel" />
          </div>

          <fieldset class="fieldset-section">
            <legend>Alterar senha <span class="legend-hint">(deixe em branco para não alterar)</span></legend>

            <div class="field">
              <label for="prof-password">Nova senha</label>
              <div class="input-icon-wrapper">
                <input id="prof-password" type="password" placeholder="Mínimo 6 caracteres"
                       autocomplete="new-password" minlength="6" />
                <button type="button" class="toggle-pass" data-target="prof-password">👁</button>
              </div>
            </div>

            <div class="field">
              <label for="prof-confirm">Confirmar nova senha</label>
              <div class="input-icon-wrapper">
                <input id="prof-confirm" type="password" placeholder="Repita a nova senha"
                       autocomplete="new-password" />
                <button type="button" class="toggle-pass" data-target="prof-confirm">👁</button>
              </div>
            </div>
          </fieldset>

          <div class="form-error hidden" id="profile-error"></div>

          <button type="submit" class="btn btn-primary btn-full" id="btn-profile">
            <span class="btn-text">Salvar alterações</span>
            <span class="btn-spinner hidden">⏳</span>
          </button>
        </form>

        <p class="form-footer">
          <a href="#home" id="btn-back-profile">← Voltar ao início</a>
        </p>
      </div>
    </div>
  `,

  async init() {
    setupPasswordToggles();

    const session = Session.get();
    if (!session) {
      navigate('login', { replace: true });
      return;
    }

    const btnEl = document.getElementById('btn-profile');

    // Carrega dados atuais
    try {
      const person = await Api.getPerson(session.id_person);
      document.getElementById('prof-nome').value     = person.nome     ?? '';
      document.getElementById('prof-email').value    = person.email    ?? '';
      document.getElementById('prof-telefone').value = person.telefone ?? '';
    } catch (err) {
      Toast.error('Não foi possível carregar os dados do perfil.');
    }

    const form = document.getElementById('form-profile');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearError('profile-error');

      const nome     = document.getElementById('prof-nome').value.trim();
      const email    = document.getElementById('prof-email').value.trim();
      const telefone = document.getElementById('prof-telefone').value.trim();
      const password = document.getElementById('prof-password').value;
      const confirm  = document.getElementById('prof-confirm').value;

      if (!nome || !email) {
        showError('profile-error', 'Nome e e-mail são obrigatórios.');
        return;
      }
      if (password && password.length < 6) {
        showError('profile-error', 'A nova senha deve ter pelo menos 6 caracteres.');
        return;
      }
      if (password && password !== confirm) {
        showError('profile-error', 'As senhas não coincidem.');
        return;
      }

      const payload = { nome, email, telefone: telefone || null };
      if (password) payload.password = password;

      setLoading(btnEl, true);
      try {
        const updated = await Api.updatePerson(session.id_person, payload);
        // Atualiza o nome na sessão, caso tenha mudado
        Session.set({ ...session, nome: updated.nome });
        Toast.success('Perfil atualizado com sucesso!');
        // Limpa campos de senha
        document.getElementById('prof-password').value = '';
        document.getElementById('prof-confirm').value  = '';
      } catch (err) {
        showError('profile-error', err.message);
      } finally {
        setLoading(btnEl, false);
      }
    });
  },
};
