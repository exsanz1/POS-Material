"""
Database engine and session configuration for POS Material.

Uses SQLite as the backend database with SQLAlchemy 2.0 ORM style.
"""

from pathlib import Path

from sqlalchemy import BigInteger, Integer, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Database file path
DB_PATH = Path(__file__).resolve().parent.parent / "pos_material.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, echo=False)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# SQLite-compatible BigInteger: uses INTEGER on SQLite (required for
# autoincrement primary keys) and BIGINT on other databases.
BigInt = BigInteger().with_variant(Integer, "sqlite")


class Base(DeclarativeBase):
    """Base class for all ORM models."""


