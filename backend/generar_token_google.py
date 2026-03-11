#!/usr/bin/env python3
"""
Genera el GOOGLE_ADS_REFRESH_TOKEN para poner en el .env del servidor.
Ejecutar UNA SOLA VEZ localmente.

Requisitos previos:
  1. En Google Cloud Console → Credenciales → tu OAuth Client ID:
     Agrega este URI en "URIs de redireccionamiento autorizados":
       http://localhost:8765/callback
  2. Tener GOOGLE_ADS_CLIENT_ID y GOOGLE_ADS_CLIENT_SECRET en el .env

Uso:
    python generar_token_google.py
"""

import os
import sys
import webbrowser
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler

import requests
from dotenv import load_dotenv

load_dotenv()

CLIENT_ID = os.getenv("GOOGLE_ADS_CLIENT_ID")
CLIENT_SECRET = os.getenv("GOOGLE_ADS_CLIENT_SECRET")
PORT = 8765
REDIRECT_URI = f"http://localhost:{PORT}/callback"

if not CLIENT_ID or not CLIENT_SECRET:
    print("❌  Falta GOOGLE_ADS_CLIENT_ID o GOOGLE_ADS_CLIENT_SECRET en el .env")
    sys.exit(1)

captured = {"code": None, "error": None}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        if "code" in params:
            captured["code"] = params["code"][0]
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(
                b"<h2>\u2705 Autorizado. Regresa a la terminal para copiar tu token.</h2>"
            )
        else:
            err = params.get("error", ["desconocido"])[0]
            captured["error"] = err
            self.send_response(400)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(f"<h2>Error: {err}</h2>".encode())

    def log_message(self, *args):
        pass  # silenciar logs del servidor


auth_url = (
    "https://accounts.google.com/o/oauth2/auth"
    f"?client_id={CLIENT_ID}"
    f"&redirect_uri={urllib.parse.quote(REDIRECT_URI)}"
    "&response_type=code"
    "&scope=https://www.googleapis.com/auth/adwords"
    "&access_type=offline"
    "&prompt=consent"
)

print()
print("=" * 65)
print("  GENERADOR DE REFRESH TOKEN – Google Ads")
print("=" * 65)
print()
print("ANTES de continuar, asegúrate de haber agregado este URI")
print("en Google Cloud Console → Credenciales → tu OAuth Client ID")
print("(sección: URIs de redireccionamiento autorizados):")
print()
print(f"    {REDIRECT_URI}")
print()
input("Presiona ENTER cuando ya lo hayas agregado...")

print()
print("🌐  Abriendo navegador para autorizar...")
webbrowser.open(auth_url)
print(f"⏳  Esperando callback en {REDIRECT_URI} ...")

HTTPServer(("localhost", PORT), Handler).handle_request()

if captured["error"]:
    print(f"\n❌  Error de autorización: {captured['error']}")
    sys.exit(1)

if not captured["code"]:
    print("\n❌  No se recibió código de autorización")
    sys.exit(1)

print("🔄  Canjeando código por refresh_token...")

resp = requests.post(
    "https://oauth2.googleapis.com/token",
    json={
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "code": captured["code"],
        "grant_type": "authorization_code",
        "redirect_uri": REDIRECT_URI,
    },
    timeout=15,
)

if not resp.ok:
    err = resp.json().get("error_description", resp.text[:300])
    print(f"\n❌  Error al canjear código: {err}")
    sys.exit(1)

refresh_token = resp.json().get("refresh_token")

if not refresh_token:
    print()
    print("❌  Google no devolvió refresh_token.")
    print("   Puede que ya hayas autorizado esta app antes.")
    print("   Solución: ve a https://myaccount.google.com/permissions")
    print("   Busca la app, revoca el acceso, y vuelve a ejecutar este script.")
    sys.exit(1)

print()
print("=" * 65)
print("✅  ¡Éxito! Agrega esto al .env del SERVIDOR (y al local):")
print("=" * 65)
print()
print(f"GOOGLE_ADS_REFRESH_TOKEN={refresh_token}")
print()
print("=" * 65)
print()
print("Después también agrega el mapa de marcas (Customer IDs sin guiones):")
print()
print('GOOGLE_ADS_CUSTOMER_MAP={"GWM Chihuahua":"XXXXXXXXXX","Kia Juventud":"XXXXXXXXXX","Kia Juarez":"XXXXXXXXXX","Subaru Chihuahua":"XXXXXXXXXX","Toyota HG / Cuu":"XXXXXXXXXX","Toyota Monclova":"XXXXXXXXXX"}')
print()
