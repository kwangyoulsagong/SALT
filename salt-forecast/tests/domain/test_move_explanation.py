"""오늘 등락 한 줄 운영 측정 — 나빠짐 경계 · 표본 결정성(FC-REQ-027 FR-5 · FR-6)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from salt_forecast.domain.move_explanation import (
    WORSE_BLOCKED_SHARE,
    WORSE_MIN_ATTEMPTS,
    Attempt,
    label_sample,
    summarize,
)

T0 = datetime(2026, 11, 12, 5, tzinfo=UTC)


def _a(gate: str, i: int = 0, asset: str = "kr", cites: int = 2, facts: int = 4) -> Attempt:
    ok = gate == "ok"
    return Attempt(
        asset=asset,
        symbol=f"{i:06d}",
        trade_date="2026-11-12",
        gate=gate,
        text="공시가 있었어요[1]." if ok else None,
        citations=tuple(f"f{j}" for j in range(cites)) if ok else (),
        fact_count=facts,
        rejections=() if ok else ("causal",),
        provider="local_claude",
        generated_at=T0 + timedelta(minutes=i),
    )


@pytest.mark.parametrize(
    ("ok", "blocked", "want"),
    [
        (WORSE_MIN_ATTEMPTS - 1, 0, None),  # 시도가 적으면 판정 안 함
        (7, 3, False),  # 30% 는 기준 안(초과만 나빠짐)
        (6, 4, True),
        (10, 0, False),
    ],
)
def test_worsened_boundary(ok: int, blocked: int, want: bool | None) -> None:
    rows = [_a("ok", i) for i in range(ok)] + [_a("guard_blocked", ok + i) for i in range(blocked)]
    (s,) = summarize(rows)
    assert s.worsened is want
    if s.attempts >= WORSE_MIN_ATTEMPTS:
        assert (s.blocked_share or 0) > WORSE_BLOCKED_SHARE if want else (s.blocked_share or 0) <= WORSE_BLOCKED_SHARE


def test_summary_counts_by_asset() -> None:
    rows = [
        _a("ok", 0, cites=1, facts=4),
        _a("ok", 1, cites=3, facts=6),
        _a("no_citation", 2),
        _a("ok", 3, asset="crypto"),
    ]
    kr, crypto = sorted(summarize(rows), key=lambda s: s.asset, reverse=True)
    assert (kr.asset, kr.attempts, kr.ok, kr.no_citation) == ("kr", 3, 2, 1)
    assert kr.mean_citations == 2.0
    assert kr.coverage == pytest.approx((1 / 4 + 3 / 6) / 2)
    assert dict(kr.rejections) == {"causal": 1}
    assert crypto.attempts == 1


def test_label_sample_even_and_deterministic() -> None:
    rows = [_a("ok", i) for i in range(25)] + [_a("guard_blocked", 100)]
    a = label_sample(rows, 10)
    assert len(a) == 10
    assert all(x.gate == "ok" for x in a)
    assert a == label_sample(list(reversed(rows)), 10)
    assert label_sample(rows[:3], 10) == rows[:3]
