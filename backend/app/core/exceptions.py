"""
Application-level exception hierarchy.

The service layer raises these typed errors.
Routers catch them and convert to HTTPException with the right status code.
This keeps HTTP concerns out of the service layer.
"""


class AppError(Exception):
    """Base class for all application errors."""


class NotFoundError(AppError):
    """Raised when a requested resource does not exist."""

    def __init__(self, resource: str, identifier: int | str) -> None:
        self.resource = resource
        self.identifier = identifier
        super().__init__(f"{resource} with id '{identifier}' not found.")


class DuplicateEntryError(AppError):
    """Raised when a unique-constrained field value already exists."""

    def __init__(self, field: str, value: str) -> None:
        self.field = field
        self.value = value
        super().__init__(f"'{value}' is already registered as {field}.")
