"""원인 설명 채점 누수 — 행을 찍은 뒤 닫힌 라벨은 그 행의 p 에 들어가지 않는다(time-and-leakage.md §6 미래 오염).

방법: 표본에 '미래' 행(라벨이 모든 기존 행의 찍은 시각 뒤에 닫힘)을 더해도 기존 행들의 채점(d)이 같아야 한다.
미래 행 자체는 채점되지만, 기존 행의 Brier 합은 바뀌면 안 된다 → 기존 행만 따로 계산한 값과 비교.
"""

from __future__ import annotations

from datetime import date, timedelta

import numpy as np

from salt_forecast.domain.cause_explain import Row, forecasts, score_cell

D0 = date(2026, 11, 16)


def _rows(rng: np.random.Generator, days: int, start: int = 0) -> list[Row]:
    out: list[Row] = []
    for d in range(start, start + days):
        cap = 10_000_000 + d * 86_400
        for i in range(12):
            kind = ("sector", "market", "news")[i % 3]
            base = "pos" if rng.random() < 0.5 else "neg"
            out.append(Row(f"S{i}", D0 + timedelta(days=d), cap, cap + 86_400 - 1, kind, base, float(rng.normal())))
    return out


def test_future_labels_do_not_change_past_forecasts() -> None:
    rng = np.random.default_rng(20261116)
    past = _rows(rng, 40)
    # 미래 행 — 라벨이 기존 모든 행을 찍은 뒤 닫힌다. 극단값(전부 오름)이라 누수가 있으면 p 가 움직인다
    future = [Row(r.symbol, r.trade_date, r.captured_at, r.label_at, r.kind, r.base, abs(r.excess) + 1)
              for r in _rows(np.random.default_rng(7), 10, start=40)]  # fmt: skip
    alone = forecasts(past)
    both = forecasts(past + future)[: len(past)]
    assert sum(f is not None for f in alone) > 0
    assert alone == both


def test_shuffled_labels_no_skill() -> None:
    """셔플 라벨 — 종류와 무관한 라벨이면 기준을 이기지 못한다(통과하면 누수 의심)."""
    rng = np.random.default_rng(11)
    rows = _rows(rng, 80)
    ex = rng.permutation([r.excess for r in rows])
    shuffled = [
        Row(r.symbol, r.trade_date, r.captured_at, r.label_at, r.kind, r.base, float(e))
        for r, e in zip(rows, ex, strict=True)
    ]
    c = score_cell("kr", 1, shuffled)
    assert c.rows_scored > 300
    assert c.p > 0.0166667


def test_same_time_other_symbols_not_used() -> None:
    """같은 날 같은 시각에 찍은 다른 종목 라벨은 아직 안 닫혔다 — 하루치뿐이면 전부 cold."""
    rng = np.random.default_rng(1)
    c = score_cell("kr", 1, _rows(rng, 1))
    assert c.rows_scored == 0 and c.rows_cold == 12
