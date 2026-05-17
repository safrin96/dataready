from __future__ import annotations

from typing import Optional

CSV_MAX_UPLOAD_BYTES = 100 * 1024 * 1024
DASHBOARD_IMAGE_MAX_UPLOAD_BYTES = 20 * 1024 * 1024
DATA_DICTIONARY_MAX_UPLOAD_BYTES = 40 * 1024 * 1024
CSV_MAX_ROWS_SAMPLED = 10_000


def validate_upload_limits(
    *,
    dataset_bytes: bytes,
    dashboard_bytes: Optional[bytes],
    dictionary_bytes: Optional[bytes],
) -> None:
    if len(dataset_bytes) > CSV_MAX_UPLOAD_BYTES:
        raise ValueError(
            f"CSV upload is too large. Max supported size is {CSV_MAX_UPLOAD_BYTES // (1024 * 1024)} MB."
        )
    if dashboard_bytes is not None and len(dashboard_bytes) > DASHBOARD_IMAGE_MAX_UPLOAD_BYTES:
        raise ValueError(
            f"Dashboard image is too large. Max supported size is {DASHBOARD_IMAGE_MAX_UPLOAD_BYTES // (1024 * 1024)} MB."
        )
    if dictionary_bytes is not None and len(dictionary_bytes) > DATA_DICTIONARY_MAX_UPLOAD_BYTES:
        raise ValueError(
            f"Data dictionary PDF is too large. Max supported size is {DATA_DICTIONARY_MAX_UPLOAD_BYTES // (1024 * 1024)} MB."
        )
