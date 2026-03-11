"""
Migración: Google Ads integration
- Agrega columna google_ads_id a la tabla campanyas
- Crea tabla system_settings para tokens OAuth
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, SessionLocal
from sqlalchemy import text


def run():
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE campanyas
            ADD COLUMN IF NOT EXISTS google_ads_id VARCHAR;
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS system_settings (
                id SERIAL PRIMARY KEY,
                key VARCHAR UNIQUE NOT NULL,
                value TEXT,
                updated_at TIMESTAMP DEFAULT NOW()
            );
        """))
        conn.commit()
    print("✅ Migración Google Ads completada")


if __name__ == "__main__":
    run()
