/**
 * pages/results.js – Tela de resultados do DOU.
 */

import { Api }     from '../api.js';
import { Session } from '../session.js';
import { escapeHtml, escapeAttr } from '../utils.js';

const PER_PAGE = 8;

// Estado da página (módulo singleton)
let _all      = [];
let _page     = 1;
let _filter   = '';

export const results = {
  template: () => /* html */`
    <div class="view page-wrapper">

      <div class="page-header">
        <h2>📄 Resultados do DOU</h2>
        <p>Publicações encontradas com base no seu perfil e inscrições</p>
      </div>

      <div class="results-toolbar">
        <div class="results-meta" id="results-meta">–</div>
        <div class="results-toolbar-actions">
          <input id="results-search" type="search"
                 placeholder="Filtrar resultados…" class="filter-input" />
          <button class="btn btn-ghost btn-sm" id="btn-refresh-results">↺ Atualizar</button>
        </div>
      </div>

      <div id="results-container">
        <div class="loading-state">
          <span class="spinner"></span> Carregando resultados…
        </div>
      </div>

      <div class="pagination" id="pagination"></div>

    </div>
  `,

  init() {
    // Lê filtros opcionais passados via hash (ex.: #results?q=silva&src=web)
    const hash = location.hash;
    const qi   = hash.indexOf('?');
    let q = '', src = '';
    if (qi !== -1) {
      const params = new URLSearchParams(hash.substring(qi + 1));
      q   = params.get('q')   || '';
      src = params.get('src') || '';
      if (q)   document.getElementById('results-search').value = q;
    }

    _load(q, src);

    document.getElementById('results-search').addEventListener('input', (e) => {
      _filter = e.target.value.trim();
      _page   = 1;
      _render();
    });

    document.getElementById('btn-refresh-results')
      .addEventListener('click', () => _load());
  },
};

async function _load(query = '', source = '') {
  const session    = Session.get();
  const container  = document.getElementById('results-container');
  const metaEl     = document.getElementById('results-meta');
  const pagination = document.getElementById('pagination');
  if (!container) return;

  container.innerHTML  = `<div class="loading-state"><span class="spinner"></span> Carregando resultados…</div>`;
  metaEl.textContent   = '–';
  pagination.innerHTML = '';

  try {
    const data = await Api.getResults(session.id_person, query, source);
    _all    = data.items || [];
    _page   = 1;
    _filter = '';
    const searchEl = document.getElementById('results-search');
    if (searchEl) searchEl.value = '';
    _render();
    metaEl.textContent = `${data.count} resultado(s) encontrado(s) para ${escapeHtml(session.nome)}`;
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Erro ao carregar resultados</h3>
        <p>${escapeHtml(err.message)}</p>
      </div>`;
  }
}

function _render() {
  const container  = document.getElementById('results-container');
  const pagination = document.getElementById('pagination');
  if (!container) return;

  const filtered = _filter
    ? _all.filter(r => {
        const q = _filter.toLowerCase();
        return (r.title   || '').toLowerCase().includes(q)
            || (r.content || '').toLowerCase().includes(q)
            || (r.section || '').toLowerCase().includes(q);
      })
    : _all;

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <h3>Nenhum resultado encontrado</h3>
        <p>Tente executar uma nova busca no DOU ou aguarde a atualização diária automática.</p>
      </div>`;
    pagination.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  if (_page > totalPages) _page = totalPages;

  const slice = filtered.slice((_page - 1) * PER_PAGE, _page * PER_PAGE);
  container.innerHTML = slice.map(_cardHtml).join('');
  _renderPagination(totalPages);
}

function _cardHtml(item) {
  const section = escapeHtml(item.section          || '—');
  const date    = escapeHtml(item.publicationDate  || '—');
  const edition = escapeHtml(item.edition          || '—');
  const title   = escapeHtml(item.title            || 'Sem título');
  const content = escapeHtml(item.content          || '');
  const source  = item.source === 'xml' ? 'xml' : 'web';
  const href    = escapeAttr(item.href             || '');

  return `
    <div class="result-card">
      <div class="result-header">
        <div class="result-title">${title}</div>
        <div class="result-badges">
          <span class="badge badge-section">${section}</span>
          <span class="badge badge-source-${source}">
            ${source === 'xml' ? 'Dados Abertos' : 'Portal DOU'}
          </span>
        </div>
      </div>
      <div class="result-meta">
        <span>${date}</span>
        <span>Edição ${edition}</span>
      </div>
      ${content
        ? `<div class="result-content">${content.substring(0, 400)}${content.length > 400 ? '…' : ''}</div>`
        : ''}
      ${href !== '#'
        ? `<a class="result-link" href="${href}" target="_blank" rel="noopener noreferrer">🔗 Ver no DOU ↗</a>`
        : ''}
    </div>`;
}

function _renderPagination(totalPages) {
  const pagination = document.getElementById('pagination');
  if (!pagination || totalPages <= 1) {
    if (pagination) pagination.innerHTML = '';
    return;
  }

  const range = 2;
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= _page - range && i <= _page + range)) {
      pages.push(i);
    } else if (pages.at(-1) !== '…') {
      pages.push('…');
    }
  }

  pagination.innerHTML = [
    `<button ${_page === 1 ? 'disabled' : ''} data-page="${_page - 1}">‹</button>`,
    ...pages.map(p =>
      p === '…'
        ? `<button disabled>…</button>`
        : `<button class="${p === _page ? 'active' : ''}" data-page="${p}">${p}</button>`,
    ),
    `<button ${_page === totalPages ? 'disabled' : ''} data-page="${_page + 1}">›</button>`,
  ].join('');

  pagination.querySelectorAll('button[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      _page = parseInt(btn.dataset.page, 10);
      _render();
      document.getElementById('results-container')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}
