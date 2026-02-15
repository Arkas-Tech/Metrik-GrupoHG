import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from dotenv import load_dotenv

# Cargar variables de entorno primero
load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DB_TYPE = os.getenv("DB_TYPE", "postgresql")

if DB_TYPE == "sqlite":
    DATABASE_PATH = os.path.join(BASE_DIR, "sgpme.db")
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{DATABASE_PATH}"
    print(f"🔧 Usando SQLite: {DATABASE_PATH}")
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, 
        connect_args={"check_same_thread": False}
    )
else:
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME", "sgpme")
    
    SQLALCHEMY_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    print(f"🔧 Usando PostgreSQL: {DB_HOST}:{DB_PORT}/{DB_NAME}")
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        pool_recycle=3600
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()