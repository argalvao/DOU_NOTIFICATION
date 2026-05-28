/**
 * utils.js – Funções utilitárias compartilhadas entre páginas.
 */

/** Escapa caracteres HTML para prevenir XSS. */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Valida e escapa um atributo de URL — aceita apenas http/https. */
export function escapeAttr(str) {
  if (typeof str !== 'string') return '#';
  const trimmed = str.trim();
  if (!/^https?:\/\//i.test(trimmed)) return '#';
  return escapeHtml(trimmed);
}

/** Ativa/desativa estado de carregamento em um botão. */
export function setLoading(btn, loading) {
  const text    = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.btn-spinner');
  btn.disabled  = loading;
  text?.classList.toggle('hidden', loading);
  spinner?.classList.toggle('hidden', !loading);
}

/** Exibe uma mensagem de erro em um elemento pelo ID. */
export function showError(elId, message) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
}

/** Limpa e esconde a mensagem de erro de um elemento. */
export function clearError(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = '';
  el.classList.add('hidden');
}

/**
 * Configura os botões de toggle de visibilidade de senha
 * dentro do elemento `root` fornecido (padrão: document).
 */
export function setupPasswordToggles(root = document) {
  root.querySelectorAll('.toggle-pass').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.textContent = input.type === 'password' ? '👁' : '🙈';
    });
  });
}
