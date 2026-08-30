"""Data-access package."""

from app.db import models  # noqa: F401  (registers tables on Base.metadata)

__all__ = ["models"]
