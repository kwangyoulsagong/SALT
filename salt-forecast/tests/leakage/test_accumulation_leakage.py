"""밴드 적립 누수 시험(time-and-leakage.md §6 · band-accumulation@2) — as_of 뒤에 알게 된 행을 지워도 같은 결과.

검산(닫힌 주 · E · 90% 구간 · 실패 사례)과 이번 주 판정(지표 · 밴드 · 관문 · 배수)이 전부 같아야 한다. 빈 시험이 아니게
라벨이 닫힌 주가 실제로 있는 시각을 고른다.
"""

from __future__ import annotations

from dataclasses import replace
from datetime import UTC, datetime

import numpy as np

from salt_forecast.domain.accumulation import DAY
from salt_forecast.domain.asof_series import VintagedSeries
from salt_forecast.scoring.accumulation import Inputs, run


def _vs(obs: np.ndarray, vals: np.ndarray, lag: int) -> VintagedSeries:
    o = obs.astype(np.int64)
    return VintagedSeries.build(o, o + lag, vals.astype(np.float64))


def _cut(s: VintagedSeries, t: int) -> VintagedSeries:
    keep = s.available <= t
    return VintagedSeries.build(s.observed[keep], s.available[keep], s.value[keep])


def _inputs() -> Inputs:
    rng = np.random.default_rng(7)
    start = int(datetime(2010, 7, 18, tzinfo=UTC).timestamp())
    days = start + np.arange(5000) * DAY
    price = np.exp(np.cumsum(rng.normal(0.002, 0.04, days.size)))
    mvrv = 0.7 + 2.5 * (np.sin(np.arange(days.size) / 400.0) + 1) / 2
    mcap = price * 1e7
    months = np.array(
        [int(datetime(2004 + i // 12, i % 12 + 1, 1, tzinfo=UTC).timestamp()) for i in range(230)], dtype=np.int64
    )
    month_end = np.array(
        [int(datetime(2004 + (i + 1) // 12, (i + 1) % 12 + 1, 1, tzinfo=UTC).timestamp()) - DAY for i in range(230)],
        dtype=np.int64,
    )
    per = VintagedSeries.build(months, month_end + 50 * DAY, 8 + 6 * rng.random(230))
    kdays = int(datetime(2004, 1, 1, tzinfo=UTC).timestamp()) + np.arange(7000) * DAY
    kidx = np.exp(np.cumsum(rng.normal(0.0003, 0.012, kdays.size))) * 1000
    return Inputs(
        mvrv=_vs(days, mvrv, 2 * DAY),
        mcap=_vs(days, mcap, 2 * DAY),
        btc_price=_vs(days, price, 2 * DAY),
        kospi_per=per,
        kospi_index=_vs(kdays, kidx, DAY),
        kospi_dividend=None,
        kimchi=None,
    )


def test_results_ignore_rows_known_after_as_of() -> None:
    full = _inputs()
    as_of = datetime(2021, 6, 9, 12, tzinfo=UTC)
    t = int(as_of.timestamp())
    cut = replace(
        full,
        mvrv=_cut(full.mvrv, t),
        mcap=_cut(full.mcap, t),
        btc_price=_cut(full.btc_price, t),
        kospi_per=_cut(full.kospi_per, t),
        kospi_index=_cut(full.kospi_index, t),
    )
    a, b = run(full, as_of), run(cut, as_of)
    assert all(r.stats.n > 0 and r.reading is not None for r in a)  # 빈 시험이 아니다
    assert a == b
