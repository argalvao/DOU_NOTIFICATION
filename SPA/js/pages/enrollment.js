/**
 * pages/enrollment.js – Tela de cadastro de inscrições em concursos.
 */

import { Api }     from '../api.js';
import { Session } from '../session.js';
import { Toast }   from '../toast.js';
import { setLoading, showError, clearError, escapeHtml } from '../utils.js';

export const enrollment = {
  template: () => /* html */`
    <div class="view page-wrapper">

      <div class="page-header">
        <h2>📋 Inscrições em Concursos</h2>
        <p>Gerencie os números de inscrição que deseja monitorar no DOU</p>
      </div>

      <!-- Adicionar inscrição -->
      <div class="card">
        <h3 class="card-title">Nova inscrição</h3>
        <form id="form-enrollment" novalidate>
          <div class="field-row">
            <div class="field flex-1">
              <label for="enr-subscription">Número de inscrição</label>
              <input id="enr-subscription" type="text" placeholder="Ex.: 123456789" required />
            </div>
            <button type="submit" class="btn btn-primary btn-enrollment" id="btn-enrollment">
              <span class="btn-text">Adicionar</span>
              <span class="btn-spinner hidden">⏳</span>
            </button>
          </div>
          <div class="form-error hidden" id="enrollment-error"></div>
        </form>
      </div>

      <!-- Lista de inscrições -->
      <div class="card">
        <div class="card-title-row">
          <h3 class="card-title">Minhas inscrições</h3>
          <button class="btn btn-ghost btn-sm" id="btn-refresh-enr">↺ Atualizar</button>
        </div>
        <div id="enrollment-list">
          <div class="loading-state">
            <span class="spinner"></span> Carregando inscrições…
          </div>
        </div>
      </div>

    </div>
  `,

  init() {
    _loadEnrollments();

    document.getElementById('btn-refresh-enr')
      .addEventListener('click', _loadEnrollments);

    const form  = document.getElementById('form-enrollment');
    const btnEl = document.getElementById('btn-enrollment');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearError('enrollment-error');

      const session = Session.get();
      const sub     = document.getElementById('enr-subscription').value.trim();

      if (!sub) {
        showError('enrollment-error', 'Informe o número de inscrição.');
        return;
      }

      setLoading(btnEl, true);
      try {
        await Api.createEnrollment(session.id_person, sub);
        Toast.success('Inscrição cadastrada com sucesso!');
        document.getElementById('enr-subscription').value = '';
        await _loadEnrollments();
      } catch (err) {
        showError('enrollment-error', err.message);
      } finally {
        setLoading(btnEl, false);
      }
    });
  },
};

async function _loadEnrollments() {
  const session = Session.get();
  const listEl  = document.getElementById('enrollment-list');
  if (!listEl) return;

  listEl.innerHTML = `<div class="loading-state"><span class="spinner"></span> Carregando inscrições…</div>`;

  try {
    const data  = await Api.getEnrollments(session.id_person);
    const items = data.items || [];
    listEl.innerHTML = items.length ? _tableHtml(items) : _emptyHtml();

    // Wira os botões de remoção
    listEl.querySelectorAll('.btn-delete-enr').forEach(btn => {
      btn.addEventListener('click', async () => {
        const enrollmentId = parseInt(btn.dataset.id, 10);
        btn.disabled = true;
        btn.textContent = '⏳';
        try {
          await Api.deleteEnrollment(session.id_person, enrollmentId);
          Toast.success('Inscrição removida.');
          await _loadEnrollments();
        } catch (err) {
          Toast.error(err.message);
          btn.disabled = false;
          btn.textContent = '🗑';
        }
      });
    });
  } catch (err) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Erro ao carregar</h3>
        <p>${escapeHtml(err.message)}</p>
      </div>`;
  }
}

function _tableHtml(items) {
  const rows = items.map(item => `
    <tr>
      <td>${item.id_enrollment}</td>
      <td><strong>${escapeHtml(item.subscription)}</strong></td>
      <td>
        <button class="btn btn-ghost btn-sm btn-delete-enr"
                data-id="${item.id_enrollment}"
                title="Remover inscrição">🗑</button>
      </td>
    </tr>
  `).join('');

  return `
    <table class="enrollment-table">
      <thead>
        <tr><th>#</th><th>Número de inscrição</th><th></th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function _emptyHtml() {
  return `<div class="enrollment-empty">
    Nenhuma inscrição cadastrada. Adicione sua primeira acima.
  </div>`;
}
