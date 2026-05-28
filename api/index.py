import sys
from pathlib import Path

# Adiciona o diretório API/ ao path para que as importações relativas funcionem
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'API'))

from app import app  # noqa: F401 – Vercel usa este objeto WSGI
