"""작업 시간 상한 — 매달린 작업이 다음 회차를 막지 않게(2026-11-10 뉴스 작업 8시간 멈춤)."""

from __future__ import annotations

import argparse
import time
from collections.abc import Generator
from contextlib import contextmanager

import pytest

from salt_forecast.jobs import _common


@contextmanager
def _always_lock(_eng: object, _name: str) -> Generator[bool]:
    yield True


def test_hung_body_is_cut_and_alarm_cleared(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(_common, "engine", lambda: object())
    monkeypatch.setattr(_common, "advisory_lock", _always_lock)
    args = argparse.Namespace(dry_run=True)

    def hang() -> int:
        time.sleep(5)
        return 1

    started = time.perf_counter()
    with pytest.raises(_common.JobTimeoutError):
        _common.run_job("t", args, hang, max_seconds=1)
    assert time.perf_counter() - started < 3
    # 끝난 뒤 알람이 남지 않는다 — 다음 작업이 엉뚱하게 끊기지 않게
    assert _common.run_job("t", args, lambda: 1, max_seconds=1) == 0
    time.sleep(1.2)
