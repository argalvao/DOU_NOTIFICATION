/**
 * session.js – Gerenciamento da sessão do usuário via localStorage.
 */

const SESSION_KEY = 'dou_session';

export const Session = {
  get() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
    catch { return null; }
  },
  set(data)    { localStorage.setItem(SESSION_KEY, JSON.stringify(data)); },
  clear()      { localStorage.removeItem(SESSION_KEY); },
  isLoggedIn() { return !!this.get(); },
};
