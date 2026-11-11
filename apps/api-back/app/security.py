import hashlib
import hmac
import os
import threading
import time
import uuid
from dataclasses import dataclass
from typing import Mapping

from fastapi import HTTPException, status


RAG_REQUEST_MAX_SKEW_SECONDS = 60
_SEEN_REQUEST_IDS: dict[str, int] = {}
_SEEN_REQUEST_IDS_LOCK = threading.Lock()


@dataclass(frozen=True)
class RagRequestContext:
    user_id: int
    session_id: str


def _canonical_payload(
    action: str,
    timestamp: int,
    user_id: int,
    session_id: str,
    question: str,
    request_id: str,
) -> str:
    return "\n".join(
        [action, str(timestamp), str(user_id), session_id, request_id, question]
    )


def verify_rag_request(
    headers: Mapping[str, str],
    *,
    action: str,
    question: str = "",
    now: int | None = None,
) -> RagRequestContext:
    secret = os.getenv("RAG_INTERNAL_SECRET", "")
    if len(secret) < 32:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="RAG service unavailable.",
        )

    user_id_header = headers.get("x-rag-user-id", "")
    session_id = headers.get("x-rag-session-id", "")
    request_id = headers.get("x-rag-request-id", "")
    timestamp_header = headers.get("x-rag-timestamp", "")
    signature = headers.get("x-rag-signature", "")
    action_header = headers.get("x-rag-action", "")

    try:
        user_id = int(user_id_header)
        timestamp = int(timestamp_header)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized RAG request.",
        ) from None

    current_time = int(time.time()) if now is None else now
    if (
        user_id <= 0
        or not session_id
        or len(session_id) > 128
        or not request_id
        or len(request_id) > 64
        or action_header != action
        or abs(current_time - timestamp) > RAG_REQUEST_MAX_SKEW_SECONDS
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized RAG request.",
        )

    expected = hmac.new(
        secret.encode("utf-8"),
        _canonical_payload(
            action, timestamp, user_id, session_id, question, request_id
        ).encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized RAG request.",
        )

    try:
        parsed_request_id = uuid.UUID(request_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized RAG request.",
        ) from None

    if str(parsed_request_id) != request_id.lower():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized RAG request.",
        )

    with _SEEN_REQUEST_IDS_LOCK:
        expired_ids = [
            seen_id
            for seen_id, expires_at in _SEEN_REQUEST_IDS.items()
            if expires_at < current_time
        ]
        for expired_id in expired_ids:
            _SEEN_REQUEST_IDS.pop(expired_id, None)

        if request_id in _SEEN_REQUEST_IDS:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthorized RAG request.",
            )

        _SEEN_REQUEST_IDS[request_id] = timestamp + RAG_REQUEST_MAX_SKEW_SECONDS

    return RagRequestContext(user_id=user_id, session_id=session_id)
