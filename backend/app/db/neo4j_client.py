from collections.abc import Generator
from functools import lru_cache

from neo4j import Driver, GraphDatabase, Session

from app.core.config import get_settings


@lru_cache
def get_neo4j_driver() -> Driver:
    settings = get_settings()
    return GraphDatabase.driver(
        settings.neo4j_uri, auth=(settings.neo4j_user, settings.neo4j_password)
    )


def get_neo4j_session() -> Generator[Session, None, None]:
    driver = get_neo4j_driver()
    session = driver.session()
    try:
        yield session
    finally:
        session.close()
