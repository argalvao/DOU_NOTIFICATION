/**
 * toast.js – Notificações temporárias na tela.
 */

function show(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

export const Toast = {
  success: (m) => show(m, 'success'),
  error:   (m) => show(m, 'error'),
  info:    (m) => show(m, 'info'),
};
