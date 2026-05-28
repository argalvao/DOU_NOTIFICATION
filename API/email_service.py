"""
email_service.py – Envio de notificações por e-mail.

Configuração via variáveis de ambiente (arquivo .env na raiz do projeto):
  SMTP_HOST   – servidor SMTP (ex.: smtp.gmail.com)
  SMTP_PORT   – porta TLS (padrão: 587)
  SMTP_USER   – e-mail remetente
  SMTP_PASS   – senha ou App Password do remetente
  SMTP_FROM   – nome exibido no campo "De" (opcional)
  APP_URL      – URL da interface web (ex.: http://127.0.0.1:8000)
"""

import os
import smtplib
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


def _cfg(key, default=''):
    return os.environ.get(key, default).strip()


def _is_configured():
    return bool(_cfg('SMTP_HOST') and _cfg('SMTP_USER') and _cfg('SMTP_PASS'))


# ─── Template HTML ────────────────────────────────────────────────────────────

def _build_html(nome: str, new_items: list, is_manual: bool) -> str:
    origin = 'busca manual' if is_manual else 'busca automática diária'
    app_url = _cfg('APP_URL', 'http://127.0.0.1:8000')

    rows_html = ''
    for item in new_items:
        title   = item.get('title',           'Sem título')
        section = item.get('section',         '—')
        date_   = item.get('publicationDate', '—')
        edition = item.get('edition',         '—')
        content = item.get('content',         '')
        href    = item.get('href',            '')

        snippet = content[:300].replace('\n', ' ') + ('…' if len(content) > 300 else '') if content else ''
        link_html = (
            f'<a href="{href}" style="color:#1351B4;">Ver no DOU ↗</a>'
            if href and href.startswith('http') else ''
        )

        rows_html += f'''
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #E8E8E8;vertical-align:top;">
            <div style="font-weight:600;color:#1B1B1B;margin-bottom:4px;">{title}</div>
            <div style="font-size:12px;color:#555;margin-bottom:6px;">
              {section} &middot; Edição {edition} &middot; {date_}
            </div>
            {f'<div style="font-size:13px;color:#333;margin-bottom:6px;">{snippet}</div>' if snippet else ''}
            {link_html}
          </td>
        </tr>'''

    count = len(new_items)
    plural = 'resultado' if count == 1 else 'resultados'

    return f'''<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>DOU Notificações</title></head>
<body style="margin:0;padding:0;background:#F4F4F4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F4;padding:24px 0;">
<tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0"
         style="background:#FFFFFF;border-radius:8px;overflow:hidden;
                box-shadow:0 2px 8px rgba(0,0,0,.08);">

    <!-- Cabeçalho -->
    <tr>
      <td style="background:#1351B4;padding:24px 32px;">
        <span style="color:#FFCD07;font-size:20px;font-weight:700;">📋 DOU Notificações</span>
      </td>
    </tr>

    <!-- Corpo -->
    <tr>
      <td style="padding:28px 32px;">
        <p style="font-size:16px;color:#1B1B1B;margin:0 0 8px;">Olá, <strong>{nome}</strong>!</p>
        <p style="font-size:14px;color:#555;margin:0 0 20px;">
          Encontramos <strong>{count} {plural} novo(s)</strong> no Diário Oficial da União
          durante a {origin}.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0">
          {rows_html}
        </table>

        <div style="margin-top:24px;text-align:center;">
          <a href="{app_url}/#results"
             style="background:#1351B4;color:#FFF;padding:12px 28px;border-radius:6px;
                    text-decoration:none;font-size:14px;font-weight:600;">
            Ver todos os resultados
          </a>
        </div>
      </td>
    </tr>

    <!-- Rodapé -->
    <tr>
      <td style="background:#F4F4F4;padding:16px 32px;text-align:center;
                 font-size:11px;color:#888;border-top:1px solid #E8E8E8;">
        DOU Notificações &copy; 2026 · EXA618 &mdash;
        Você recebeu este e-mail porque realizou uma busca no sistema.
      </td>
    </tr>

  </table>
</td></tr>
</table>
</body>
</html>'''


def _build_text(nome: str, new_items: list, is_manual: bool) -> str:
    origin = 'busca manual' if is_manual else 'busca automática diária'
    app_url = _cfg('APP_URL', 'http://127.0.0.1:8000')
    lines = [
        f'Olá, {nome}!',
        f'',
        f'Encontramos {len(new_items)} resultado(s) novo(s) no DOU durante a {origin}.',
        f'',
    ]
    for i, item in enumerate(new_items, 1):
        lines.append(f"[{i}] {item.get('title', 'Sem título')}")
        lines.append(f"    Seção: {item.get('section','—')} | Edição: {item.get('edition','—')} | Data: {item.get('publicationDate','—')}")
        if item.get('href', '').startswith('http'):
            lines.append(f"    Link: {item['href']}")
        lines.append('')
    lines.append(f'Acesse seus resultados: {app_url}/#results')
    return '\n'.join(lines)


# ─── Envio ────────────────────────────────────────────────────────────────────

def _send(to_email: str, nome: str, new_items: list, is_manual: bool):
    if not _is_configured():
        print('[EMAIL] Configuração SMTP ausente – notificação não enviada.')
        return

    host   = _cfg('SMTP_HOST')
    port   = int(_cfg('SMTP_PORT', '587'))
    user   = _cfg('SMTP_USER')
    passwd = _cfg('SMTP_PASS')
    from_  = _cfg('SMTP_FROM', f'DOU Notificações <{user}>')

    msg = MIMEMultipart('alternative')
    msg['Subject'] = f'[DOU] {len(new_items)} novo(s) resultado(s) encontrado(s)'
    msg['From']    = from_
    msg['To']      = to_email

    msg.attach(MIMEText(_build_text(nome, new_items, is_manual), 'plain', 'utf-8'))
    msg.attach(MIMEText(_build_html(nome, new_items, is_manual), 'html',  'utf-8'))

    try:
        with smtplib.SMTP(host, port, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.login(user, passwd)
            server.sendmail(user, to_email, msg.as_string())
        print(f'[EMAIL] Notificação enviada para {to_email} ({len(new_items)} resultado(s)).')
    except Exception as exc:
        print(f'[EMAIL] Falha ao enviar para {to_email}: {exc}')


def send_results_notification(to_email: str, nome: str, new_items: list, is_manual: bool = True):
    """
    Envia e-mail de notificação em uma thread separada (não bloqueia a API).

    :param to_email:  endereço de destino
    :param nome:      nome do usuário para personalização
    :param new_items: lista de dicts dos resultados novos encontrados
    :param is_manual: True = busca manual; False = rotina automática
    """
    if not new_items:
        return
    threading.Thread(
        target=_send,
        args=(to_email, nome, new_items, is_manual),
        daemon=True,
        name=f'email-{to_email}',
    ).start()
