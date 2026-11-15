import logging
import threading

import chromadb
from chromadb.api.models.Collection import Collection
from chromadb.api.shared_system_client import SharedSystemClient

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_COLLECTION_NAME = "course_resource_chunks"

# Several uploads ingest at once in FastAPI's thread pool. Chroma's client is
# safe to share across threads but not to *create* concurrently: two threads
# starting the same persistent system race, and the loser leaves a half-started
# system cached for that path ("'RustBindingsAPI' object has no attribute
# 'bindings'"), which then breaks every later call. So the client is built once,
# under a lock, and a failed start is cleared from Chroma's cache so the next
# call can retry instead of reusing the broken system.
_client: chromadb.ClientAPI | None = None
_client_lock = threading.Lock()


def get_chroma_client() -> chromadb.ClientAPI:
    global _client
    if _client is not None:
        return _client
    with _client_lock:
        if _client is None:
            try:
                _client = chromadb.PersistentClient(path=get_settings().chroma_persist_dir)
            except Exception:
                SharedSystemClient.clear_system_cache()
                logger.exception("Couldn't open the Chroma store")
                raise
    return _client


def get_chunk_collection() -> Collection:
    return get_chroma_client().get_or_create_collection(
        name=_COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )
