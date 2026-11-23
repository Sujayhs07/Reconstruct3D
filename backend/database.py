"""
Database Configuration & Engine Setup
-------------------------------------
Why this matters:
FastAPI handles web requests across multiple asynchronous and worker threads.
When running long 3D reconstruction tasks in background worker threads while users
browse projects and monitor real-time progress, standard SQLite can suffer from
"database is locked" errors due to its default rollback journal.

To solve this:
1. SQLite WAL (Write-Ahead Logging) mode is activated. Readers do not block writers,
   and writers do not block readers.
2. busy_timeout is set to 30.0s so threads wait patiently instead of crashing on lock contention.
3. PRAGMA synchronous = NORMAL optimizes disk I/O while maintaining crash safety in WAL mode.
"""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from backend.config import settings

# SQLite configuration with thread safety and 30s busy timeout for concurrent workers
connect_args = {"check_same_thread": False}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["timeout"] = 30.0

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args
)

# Enable SQLite Write-Ahead Logging (WAL) for concurrent read/write isolation
if settings.DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        """
        Executes PRAGMAs on every raw SQLite connection:
        - WAL mode enables multi-reader, single-writer concurrent access.
        - NORMAL synchronous reduces disk fsync overhead without risking corruption.
        """
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

# SessionLocal is the factory for creating independent database sessions per request
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    """Declarative base class for all SQLAlchemy ORM models."""
    pass

def get_db():
    """
    FastAPI dependency injection provider.
    Yields a scoped database session and guarantees clean closure after the HTTP request finishes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
