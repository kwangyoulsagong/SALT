"""소식 반응 — as_of 뒤 제목 · 봉을 더해도 같은 as_of 결과가 같다(time-and-leakage.md §6 미래 오염)."""

from __future__ import annotations

import tomllib
from datetime import UTC, datetime, timedelta
from pathlib import Path

import numpy as np

from salt_forecast.domain.news_kind import from_prereg
from salt_forecast.domain.series import OhlcvSeries
from salt_forecast.scoring.news_reaction import run_market
from salt_forecast.store.news_reaction import RawTitle

PREREG = Path(__file__).resolve().parents[2] / "preregistration" / "2026-11-12-news-reaction.toml"
DICT = from_prereg(tomllib.loads(PREREG.read_text()))
DAY = 86_400
T0 = datetime(2025, 1, 1, 7, tzinfo=UTC)


def _bars(n: int, seed: int) -> dict[str, OhlcvSeries]:
    rng = np.random.default_rng(seed)
    out: dict[str, OhlcvSeries] = {}
    t = int(T0.timestamp()) + DAY * np.arange(n, dtype=np.int64)
    for s in range(60):
        c = 1000 * np.exp(np.cumsum(rng.normal(0, 0.02, n)))
        v = np.full(n, 1e7)
        out[f"{s:06d}"] = OhlcvSeries(f"{s:06d}", t, c, c, c, c, v)
    return out


def _titles(n_days: int, seed: int) -> list[RawTitle]:
    rng = np.random.default_rng(seed)
    out: list[RawTitle] = []
    for d in range(n_days):
        for _ in range(3):
            code = f"{int(rng.integers(0, 60)):06d}"
            title = str(rng.choice(["(주)가 단일판매ㆍ공급계약체결", "(주)가 유상증자결정", "(주)가 영업(잠정)실적"]))
            out.append(RawTitle("disclosure", title, (code,), T0 + timedelta(days=d, hours=2)))
    return out


def test_as_of_뒤를_더해도_같은_결과() -> None:
    as_of = T0 + timedelta(days=300, hours=1)
    full = _bars(400, 2)
    cut = {
        s: OhlcvSeries(s, b.available_at[:301], *(x[:301] for x in (b.open, b.high, b.low, b.close, b.volume)))
        for s, b in full.items()
    }
    short = run_market("kr", [t for t in _titles(400, 1) if t.published_at <= as_of], cut, DICT, as_of)
    longer = run_market("kr", _titles(400, 1), full, DICT, as_of)
    assert short.events > 0
    assert short.stats == longer.stats
    assert short.pre_moves == longer.pre_moves
    assert short.events == longer.events
