"""
whatsapp_service.py – Envio de notificações por WhatsApp via Z-API.

Configuração via variáveis de ambiente (arquivo .env na raiz do projeto):
  ZAPI_INSTANCE_ID   – ID da instância Z-API
  ZAPI_TOKEN         – Token da instância Z-API
  ZAPI_CLIENT_TOKEN  – Client-Token de segurança (opcional, mas recomendado)

O número do destinatário é lido do campo `telefone` da tabela `person`.
Formatos aceitos: 75999999999 | (75) 9 9999-9999 | 5575999999999
O código de país 55 é adicionado automaticamente quando ausente.
"""

import os
import re
import threading
import requests


def _cfg(key, default=''):
    return os.environ.get(key, default).strip()


def _is_configured():
    return bool(_cfg('ZAPI_INSTANCE_ID') and _cfg('ZAPI_TOKEN'))


def _normalize_phone(telefone: str) -> str | None:
    """
    Converte qualquer formato de telefone brasileiro para E.164 sem o '+'.
    Retorna None se o número não parecer válido.
    """
    if not telefone:
        return None

    digits = re.sub(r'\D', '', telefone)

    # Remove DDI 55 inicial para reprocessar com tamanho
    if digits.startswith('55') and len(digits) > 12:
        digits = digits[2:]

    # Aceita: 10 dígitos (DDD + 8) ou 11 dígitos (DDD + 9)
    if len(digits) not in (10, 11):
        return None

    return '55' + digits


def _build_message(nome: str, items: list, is_manual: bool) -> str:
    origin = 'busca manual' if is_manual else 'rotina automática diária'
    total = len(items)
    label = 'resultado' if total == 1 else 'resultados'

    lines = [
        f'*📋 DOU Notificações*',
        f'Olá, *{nome}*!',
        f'',
        f'{"📌" if is_manual else "🔔"} {total} {label} encontrado(s) via *{origin}*.',
        f'',
    ]

    for i, item in enumerate(items[:5], 1):          # máx 5 itens na mensagem
        title   = item.get('title', 'Sem título')
        section = item.get('section', '—')
        date_   = item.get('publicationDate', '—')
        href    = item.get('href', '')

        lines.append(f'*{i}. {title}*')
        lines.append(f'   Seção: {section} | Data: {date_}')
        if href and href.startswith('http'):
            lines.append(f'   {href}')
        lines.append('')

    if total > 5:
        lines.append(f'_… e mais {total - 5} resultado(s). Acesse a plataforma para ver todos._')
        lines.append('')

    app_url = _cfg('APP_URL', 'http://127.0.0.1:8000')
    lines.append(f'🔗 {app_url}/#results')

    return '\n'.join(lines)


def _send(telefone: str, nome: str, items: list, is_manual: bool):
    instance_id   = _cfg('ZAPI_INSTANCE_ID')
    token         = _cfg('ZAPI_TOKEN')
    client_token  = _cfg('ZAPI_CLIENT_TOKEN')

    phone = _normalize_phone(telefone)
    if not phone:
        print(f'[WHATSAPP] Número inválido ou ausente: {telefone!r}')
        return

    url = f'https://api.z-api.io/instances/{instance_id}/token/{token}/send-text'

    headers = {'Content-Type': 'application/json'}
    if client_token:
        headers['Client-Token'] = client_token

    payload = {
        'phone': phone,
        'message': _build_message(nome, items, is_manual),
    }

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=15)
        if resp.ok:
            print(f'[WHATSAPP] Mensagem enviada para {phone} ({len(items)} resultado(s)).')
        else:
            print(f'[WHATSAPP] Falha ao enviar para {phone}: {resp.status_code} {resp.text}')
    except Exception as exc:
        print(f'[WHATSAPP] Erro ao enviar para {phone}: {exc}')


def send_whatsapp_notification(telefone: str, nome: str, items: list, is_manual: bool = True):
    """
    Envia notificação WhatsApp em thread separada (não bloqueia a API).

    :param telefone:  número do destinatário (qualquer formato BR)
    :param nome:      nome do usuário para personalização
    :param items:     lista de dicts dos resultados encontrados
    :param is_manual: True = busca manual; False = rotina automática
    """
    if not items or not _is_configured():
        return

    threading.Thread(
        target=_send,
        args=(telefone, nome, items, is_manual),
        daemon=True,
        name=f'whatsapp-{telefone}',
    ).start()
