"""공통 HTTP — 타임아웃 · 재시도(429 · 5xx · 연결만) · pacer. 소스 파일은 이걸 쓴다(data-pipeline.md §3)."""

from __future__ import annotations

import time
from collections.abc import Callable
from typing import Any

import httpx

TIMEOUT = httpx.Timeout(20.0, connect=5.0)
MAX_RETRIES = 3


class SourceError(Exception):
    def __init__(self, message: str, *, retryable: bool) -> None:
        super().__init__(message)
        self.retryable = retryable


class Pacer:
    """초당 요청 수 상한 — 한도의 80%."""

    def __init__(self, per_second: float) -> None:
        self.interval = 1.0 / per_second
        self.next_at = 0.0

    def wait(self) -> None:
        now = time.monotonic()
        if now < self.next_at:
            time.sleep(self.next_at - now)
        self.next_at = max(now, self.next_at) + self.interval

    def hold(self, seconds: float) -> None:
        self.next_at = max(self.next_at, time.monotonic() + seconds)


def get_json(
    client: httpx.Client,
    url: str,
    params: dict[str, Any],
    pacer: Pacer,
    *,
    observe: Callable[[httpx.Response], None] | None = None,
    label: str = "",
) -> Any:
    """GET 전용. 4xx 는 재시도하지 않는다. 오류 메시지에 URL 쿼리(키)를 싣지 않는다."""
    delay = 1.0
    for attempt in range(MAX_RETRIES + 1):
        pacer.wait()
        try:
            res = client.get(url, params=params, timeout=TIMEOUT)
        except httpx.TransportError as e:
            if attempt == MAX_RETRIES:
                raise SourceError(f"{label} 연결 실패: {type(e).__name__}", retryable=True) from e
        else:
            if observe is not None:
                observe(res)
            if res.status_code == 200:
                return res.json()
            if res.status_code != 429 and res.status_code < 500:
                raise SourceError(f"{label} {res.status_code}", retryable=False)
            if attempt == MAX_RETRIES:
                raise SourceError(f"{label} {res.status_code} 재시도 소진", retryable=True)
        time.sleep(delay)
        delay *= 2
    raise AssertionError("unreachable")
