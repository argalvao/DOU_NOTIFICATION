/**
 * pages/home.js – Página inicial (landing page).
 */

export const home = {
  template: () => /* html */`
    <div class="view">

      <!-- Hero -->
      <div class="hero">
        <div class="hero-content">
          <span class="hero-badge">Diário Oficial da União</span>
          <h1>Acompanhe resultados de <em>concursos públicos</em> sem esforço</h1>
          <p class="hero-lead">
            Cadastre sua inscrição e o sistema busca automaticamente
            qualquer publicação com o seu nome no DOU – mantendo você sempre
            informado sobre homologações, convocações e nomeações.
          </p>
          <div class="hero-actions">
            <a href="#register" class="btn btn-primary btn-lg hero-cta-off">Criar conta grátis</a>
            <a href="#query"    class="btn btn-outline btn-lg hero-cta-on hidden">Fazer consulta agora</a>
            <button type="button" class="btn btn-ghost btn-lg" id="btn-saibamais">Saiba mais ↓</button>
          </div>
        </div>

        <div class="hero-visual" aria-hidden="true">
          <div class="dou-card">
            <div class="dou-card-header">
              <span class="dot green"></span>
              <span class="dot yellow"></span>
              <span class="dot red"></span>
              <span class="dou-card-title">Diário Oficial da União</span>
            </div>
            <div class="dou-card-body">
              <p class="dou-line title-line">MINISTÉRIO DA GESTÃO</p>
              <p class="dou-line">Seção 2 · Edição Nº 89 · 27/05/2026</p>
              <p class="dou-line highlight-line">RESULTADO FINAL – CONCURSO Nº 001/2026</p>
              <p class="dou-line">Candidato aprovado: <strong>João da Silva</strong></p>
              <p class="dou-line small">Inscrição Nº 123456789 · Cargo: Analista</p>
              <span class="dou-badge">✔ Encontrado</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Como funciona -->
      <div class="section-wrapper">
        <h2 class="section-title">Como funciona</h2>
        <p class="section-sub">Três passos simples para nunca perder uma publicação</p>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">👤</div>
            <h3>1. Crie sua conta</h3>
            <p>Cadastre-se informando nome, e-mail e telefone. Seus dados ficam protegidos e criptografados.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🔢</div>
            <h3>2. Informe sua inscrição</h3>
            <p>Adicione o número de inscrição do concurso que está acompanhando. Você pode ter múltiplas inscrições.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🔍</div>
            <h3>3. Consulte o DOU</h3>
            <p>O sistema varre o Diário Oficial e apresenta todas as publicações relevantes para o seu perfil.</p>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-bar">
        <div class="stat-item">
          <span class="stat-number">24h</span>
          <span class="stat-label">Atualização diária automática</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">3</span>
          <span class="stat-label">Seções do DOU monitoradas</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">100%</span>
          <span class="stat-label">Gratuito e de código aberto</span>
        </div>
      </div>

      <!-- CTA -->
      <div class="cta-section">
        <h2>Pronto para começar?</h2>
        <p>Não perca mais nenhuma publicação sobre o seu concurso.</p>
        <a href="#register" class="btn btn-primary btn-lg hero-cta-off">Criar conta</a>
        <a href="#results"  class="btn btn-primary btn-lg hero-cta-on hidden">Ver meus resultados</a>
      </div>

    </div>
  `,

  init() {
    document.getElementById('btn-saibamais')?.addEventListener('click', () => {
      document.querySelector('.section-wrapper')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  },
};
