"""채점 작업 — 원천 하나를 못 읽으면 그 종류의 사본은 지우지 않는다(FC-REQ-024 FR-5 · 루트 O4 판단 6).

못 읽은 것을 "원천에서 사라졌다"로 읽으면 뷰 권한 하나 · 이름 하나 바뀐 날 사본 전부가 지워진다.
DB 0 — 층 함수를 바꿔 끼운다.
"""

from __future__ import annotations

from collections.abc import Generator, Iterable, Sequence
from contextlib import contextmanager
from datetime import UTC, date, datetime

import pytest
from sqlalchemy.exc import DBAPIError

from salt_forecast.domain.personal_projection import Issuance, LandingState, Verdict, landing_issuance
from salt_forecast.jobs import _common, personal_scoring


@contextmanager
def _lock(_eng: object, _name: str) -> Generator[bool]:
    yield True


def _nothing(*_args: object, **_kwargs: object) -> int:
    return 0


def _no_verdicts(*_args: object) -> list[Verdict]:
    return []


def _broken(_eng: object) -> list[object]:
    raise DBAPIError("SELECT", None, Exception("permission denied"))


def test_unreadable_source_is_not_pruned(monkeypatch: pytest.MonkeyPatch) -> None:
    issue = landing_issuance(
        "l1", "h", date(2026, 1, 1), datetime(2026, 1, 3, tzinfo=UTC), "empirical_window", None, 30, 29
    )
    pruned: list[tuple[str, list[str]]] = []

    def landings(_eng: object) -> list[tuple[Issuance, LandingState]]:
        return [(issue, LandingState(date(2026, 2, 8), None))]

    def copies(_eng: object, issues: Iterable[Issuance], _now: datetime) -> int:
        return len(list(issues))

    def prune(_eng: object, kind: str, ids: Sequence[str]) -> int:
        pruned.append((kind, list(ids)))
        return 0

    for mod in (_common, personal_scoring):
        monkeypatch.setattr(mod, "engine", object)
    monkeypatch.setattr(_common, "advisory_lock", _lock)
    for name in ("close_interrupted", "start_run", "finish_run"):
        monkeypatch.setattr(_common, name, _nothing)
    monkeypatch.setattr(personal_scoring, "read_savings", _broken)
    monkeypatch.setattr(personal_scoring, "read_landings", landings)
    monkeypatch.setattr(personal_scoring, "save_copies", copies)
    monkeypatch.setattr(personal_scoring, "prune_missing", prune)
    monkeypatch.setattr(personal_scoring, "save_verdicts", _nothing)
    monkeypatch.setattr(personal_scoring, "load_verdicts", _no_verdicts)
    monkeypatch.setattr(personal_scoring, "write_checks", _nothing)
    assert personal_scoring.main(["--as-of", "2026-03-01T00:00:00+00:00"]) == 0
    assert pruned == [("household_landing", ["l1"])]  # 저축은 못 읽었으니 지우기 0
