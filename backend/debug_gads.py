#!/usr/bin/env python3
"""Debug script para diagnosticar por qué no aparecen campañas."""
import os, json, sys
from dotenv import load_dotenv
load_dotenv()
import requests

client_id = os.getenv("GOOGLE_ADS_CLIENT_ID")
client_secret = os.getenv("GOOGLE_ADS_CLIENT_SECRET")
refresh_token = os.getenv("GOOGLE_ADS_REFRESH_TOKEN")
dev_token = os.getenv("GOOGLE_ADS_DEVELOPER_TOKEN")
manager_id = os.getenv("GOOGLE_ADS_MANAGER_ID", "").replace("-", "")
customer_map_str = os.getenv("GOOGLE_ADS_CUSTOMER_MAP", "{}")

print("=" * 60)
print("DIAGNÓSTICO GOOGLE ADS")
print("=" * 60)
print(f"CLIENT_ID:      {'OK (' + client_id[:20] + '...)' if client_id else 'FALTA'}")
print(f"CLIENT_SECRET:  {'OK' if client_secret else 'FALTA'}")
print(f"REFRESH_TOKEN:  {'OK (' + refresh_token[:10] + '...)' if refresh_token else 'FALTA'}")
print(f"DEV_TOKEN:      {'OK' if dev_token else 'FALTA'}")
print(f"MANAGER_ID:     {manager_id or 'vacío'}")

try:
    customer_map = json.loads(customer_map_str)
    print(f"CUSTOMER_MAP:   {len(customer_map)} marcas: {list(customer_map.keys())}")
except Exception as e:
    print(f"CUSTOMER_MAP:   ERROR parseando JSON: {e}")
    customer_map = {}

print()

# 1. Obtener access token
print("1. Obteniendo access token...")
resp = requests.post("https://oauth2.googleapis.com/token", json={
    "client_id": client_id,
    "client_secret": client_secret,
    "refresh_token": refresh_token,
    "grant_type": "refresh_token",
}, timeout=15)
if not resp.ok:
    print(f"   ERROR: {resp.status_code} - {resp.text[:300]}")
    sys.exit(1)
token = resp.json()["access_token"]
print("   OK")

# 2. Probar cada cuenta
print()
print("2. Consultando campañas por cuenta...")
for marca, cid in customer_map.items():
    cid_clean = str(cid).replace("-", "")
    print(f"\n   [{marca}] customer_id={cid_clean}")
    url = f"https://googleads.googleapis.com/v17/customers/{cid_clean}/googleAds:search"
    headers = {
        "Authorization": f"Bearer {token}",
        "developer-token": dev_token,
        "Content-Type": "application/json",
    }
    if manager_id:
        headers["login-customer-id"] = manager_id

    query = "SELECT campaign.id, campaign.name, campaign.status FROM campaign WHERE campaign.status != 'REMOVED' ORDER BY campaign.name"
    r = requests.post(url, headers=headers, json={"query": query}, timeout=30)
    print(f"   Status: {r.status_code}")
    if r.ok:
        results = r.json().get("results", [])
        print(f"   Campañas encontradas: {len(results)}")
        for row in results[:5]:
            c = row.get("campaign", {})
            print(f"     - [{c.get('status')}] {c.get('name')} (id={c.get('id')})")
    else:
        try:
            err = r.json()
            print(f"   ERROR: {json.dumps(err, indent=2)[:500]}")
        except Exception:
            print(f"   ERROR: {r.text[:300]}")
