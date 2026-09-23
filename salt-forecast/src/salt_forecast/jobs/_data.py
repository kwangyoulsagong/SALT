"""작업이 쓰는 데이터 한 번에 읽기 — 루프 안에서 DB 를 부르지 않는다(performance.md §2)."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Engine

from salt_forecast.domain.series import CloseSeries
from salt_forecast.features.build import MarketContext
from salt_forecast.store.prices import load_close_series
from salt_forecast.store.series import load_vintaged


def load(engine: Engine, now: datetime, symbols: list[str] | None) -> tuple[dict[str, CloseSeries], MarketContext]:
    t = int(now.timestamp())
    series = {s: c.as_of(t) for s, c in load_close_series(engine, "upbit", "1d", symbols).items()}
    ctx = MarketContext(
        series=load_vintaged(engine),
        spot_usdt={s: c.as_of(t) for s, c in load_close_series(engine, "binance", "1d").items()},
    )
    return series, ctx
