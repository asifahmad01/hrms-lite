from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    Single declarative base shared by all ORM models.
    Import Base from here — never from session.py — to avoid circular imports.
    """
    pass
