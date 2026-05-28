/**
 * pages/query.js – Tela de consulta ao DOU.
 */

import { Api }      from '../api.js';
import { Session }  from '../session.js';
import { Toast }    from '../toast.js';
import { navigate } from '../router.js';
import { setLoading, showError, escapeHtml } from '../utils.js';

export const query = {
  template: () => /* html */`
    <div class="view page-wrapper">

      <div class="page-header">
        <h2>🔍 Consultar DOU</h2>
        <p>Pesquise suas publicações no Diário Oficial da União</p>
      </div>

      <div class="card query-card">
        <h3 class="card-title">Buscar publicações</h3>
        <p class="query-info">
          O sistema vai buscar seu nome e inscrições cadastradas em todas
          as seções do DOU e armazenar os resultados para consulta.
        </p>
        <div class="query-user-info" id="query-user-info"></div>
        <div class="query-actions">
          <button class="btn btn-primary btn-lg" id="btn-search-dou">
            <span class="btn-text">🔎 Executar busca no DOU</span>
            <span class="btn-spinner hidden">⏳ Buscando…</span>
          </button>
        </div>
        <div class="form-error hidden" id="query-error"></div>
      </div>

    </div>
  `,

  init() {
    const session = Session.get();

    // Exibe nome do usuário
    const infoEl = document.getElementById('query-user-info');
    infoEl.innerHTML = `Buscando publicações para: <strong>${escapeHtml(session.nome)}</strong>`;

    // Busca no DOU
    const btnSearch = document.getElementById('btn-search-dou');
    btnSearch.addEventListener('click', async () => {
      const errorEl = document.getElementById('query-error');
      errorEl.classList.add('hidden');

      setLoading(btnSearch, true);
      try {
        const data = await Api.searchDou(session.id_person);
        Toast.success(`Busca concluída! ${data.count} resultado(s) encontrado(s).`);
        navigate('results', { replace: true });
      } catch (err) {
        showError('query-error', err.message);
        setLoading(btnSearch, false);
      }
    });
  },
};
