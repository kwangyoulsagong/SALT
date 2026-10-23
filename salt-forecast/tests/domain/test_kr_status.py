"""국내 종목 상태 억제 사유(FC-REQ-020 FR-9)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from salt_forecast.domain.kr_status import STATUS_MAX_AGE, KrStatusFlags, status_known_at, status_reason


def _f(
    liquidation: bool = False, halted: bool = False, administrative: bool = False, warn: str = "00"
) -> KrStatusFlags:
    return KrStatusFlags(liquidation, halted, administrative, warn)


def test_normal_and_caution_pass() -> None:
    assert status_reason(_f()) is None
    assert status_reason(_f(warn="01")) is None  # 투자주의는 거르지 않는다


def test_warning_and_danger() -> None:
    assert status_reason(_f(warn="02")) == "investment_warning"
    assert status_reason(_f(warn="03")) == "investment_warning"


def test_heaviest_wins() -> None:
    assert status_reason(_f(True, True, True, "03")) == "delisting_liquidation"
    assert status_reason(_f(halted=True, administrative=True, warn="02")) == "trading_halted"
    assert status_reason(_f(administrative=True, warn="02")) == "administrative_issue"


def test_status_known_only_after_sync_and_while_fresh() -> None:
    """동기화 시각이 상태의 available_at — 과거 as_of 재실행 · 묵은 마스터엔 쓰지 않는다."""
    synced = datetime(2026, 10, 22, 22, 30, tzinfo=UTC)
    assert status_known_at(synced, synced + timedelta(hours=2))
    assert not status_known_at(synced, synced - timedelta(seconds=1))  # 그 전 as_of — 미래 정보
    assert not status_known_at(synced, synced + STATUS_MAX_AGE + timedelta(seconds=1))
    assert not status_known_at(None, synced)
