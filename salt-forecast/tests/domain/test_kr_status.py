"""국내 종목 상태 억제 사유(FC-REQ-020 FR-9)."""

from __future__ import annotations

from salt_forecast.domain.kr_status import KrStatusFlags, status_reason


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
