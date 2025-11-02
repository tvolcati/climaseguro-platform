from sqlalchemy import text
from .database import engine
from .models import Base


def reset_db() -> None:
    """Dropa e recria todas as tabelas (uso em desenvolvimento)."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


