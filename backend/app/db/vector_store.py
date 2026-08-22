from functools import lru_cache

import chromadb
from chromadb.api.models.Collection import Collection

from app.core.config import get_settings

_COLLECTION_NAME = "course_resource_chunks"


@lru_cache
def get_chroma_client() -> chromadb.ClientAPI:
    settings = get_settings()
    return chromadb.PersistentClient(path=settings.chroma_persist_dir)


def get_chunk_collection() -> Collection:
    client = get_chroma_client()
    return client.get_or_create_collection(
        name=_COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )
