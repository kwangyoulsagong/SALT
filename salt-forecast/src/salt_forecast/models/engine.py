"""워크포워드 엔진 — 백테스트와 매일 예측이 **같은 함수**를 쓴다(학습-서빙 불일치 방지).

as_of t 의 전망은
1. t 시점에 알 수 있던 것만으로 모델마다 raw 분위수를 만들고(Provider)
2. 주 격자 g 중 **라벨이 t 이전에 끝난** (g + h주 ≤ t) 최근 52주의 raw 예측 · 실현값으로 보정 조정량과
   방향 임계를 정한 뒤
3. 보정 · 방향 판정을 적용한다.

보정 조정량 · 임계는 종목과 무관해 (t, h, 모델)마다 한 번 계산한다(performance.md §2).

격자 · 라벨 기간 · 신선도는 `Schedule` 이 정한다 — 코인은 월요일 · 7일, 국내 주식은 주 첫 거래일 · 5거래일
(FC-REQ-009). 보정 풀은 엔진 인스턴스 하나에 넣은 종목끼리만 차므로 자산군마다 엔진을 따로 만든다.
"""

from __future__ import annotations

from collections.abc import Iterator, Mapping, Sequence
from dataclasses import dataclass, field
from typing import Protocol

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.baselines import RawForecast, empirical_quantiles, ensemble, random_walk_normal
from salt_forecast.domain.calendar import COIN, Schedule
from salt_forecast.domain.calibration import Adjustments, ResidualPool, apply, fit_adjustments
from salt_forecast.domain.quantiles import Direction, QuantileForecast
from salt_forecast.domain.scoring import choose_threshold, direction_for
from salt_forecast.domain.series import CloseSeries
from salt_forecast.features.as_of import closes_as_of

ENSEMBLE = "ens-baseline@0.1.0"
BASELINE = "rw-normal@0.1.0"
HORIZONS: tuple[int, ...] = (1, 2, 3, 4)
POOL_WEEKS = 52
CALIBRATION = {"calibration": "normalized-CQR-pooled", "pool_weeks": POOL_WEEKS}


class Provider(Protocol):
    """모델 하나. sliced 는 as_of 로 잘린 시계열 — 그 밖을 보면 누수다."""

    def raw(self, symbol: str, sliced: CloseSeries, h: int, as_of: int) -> RawForecast | None: ...


class RandomWalk:
    def __init__(self, schedule: Schedule = COIN) -> None:
        self.days, self.gap = schedule.days_per_week, schedule.max_gap

    def raw(self, symbol: str, sliced: CloseSeries, h: int, as_of: int) -> RawForecast | None:
        return random_walk_normal(sliced, h, self.days, self.gap)


class BaselineEnsemble:
    def __init__(self, schedule: Schedule = COIN) -> None:
        self.days, self.gap = schedule.days_per_week, schedule.max_gap

    def raw(self, symbol: str, sliced: CloseSeries, h: int, as_of: int) -> RawForecast | None:
        a = random_walk_normal(sliced, h, self.days, self.gap)
        b = empirical_quantiles(sliced, h, self.days, self.gap)
        return ensemble([a, b]) if a and b else None


def baseline_providers() -> dict[str, Provider]:
    return {BASELINE: RandomWalk(), ENSEMBLE: BaselineEnsemble()}


@dataclass(frozen=True, slots=True)
class Emitted:
    symbol: str
    horizon_weeks: int
    as_of: int
    model_version: str
    base_close: float
    forecast: QuantileForecast
    direction: Direction
    realized: float | None


@dataclass(slots=True)
class _GridEntry:
    raw_q: list[NDArray[np.float64]] = field(default_factory=lambda: [])
    scale: list[float] = field(default_factory=lambda: [])
    realized: list[float] = field(default_factory=lambda: [])
    p_up: list[float] = field(default_factory=lambda: [])


def grid_for(series: Mapping[str, CloseSeries], schedule: Schedule = COIN) -> list[int]:
    starts = [int(s.available_at[0]) for s in series.values() if s.available_at.size]
    ends = [int(s.available_at[-1]) for s in series.values() if s.available_at.size]
    return schedule.grid(min(starts), max(ends)) if starts else []


class WalkForward:
    """주 격자의 raw 예측을 한 번 계산해 두고, 어떤 as_of 든 그 위에서 보정한다."""

    def __init__(
        self,
        series: Mapping[str, CloseSeries],
        providers: Mapping[str, Provider] | None = None,
        horizons: Sequence[int] = HORIZONS,
        schedule: Schedule = COIN,
    ) -> None:
        self.series = dict(series)
        self.providers = dict(providers) if providers is not None else baseline_providers()
        self.horizons = tuple(horizons)
        self.schedule = schedule
        self.grid = grid_for(self.series, schedule)
        # 격자 g 의 h주 라벨을 알게 되는 시각 — 보정 풀 엠바고 기준. 달력이 모르면 무한대(풀에 못 들어간다)
        self._label_end = {
            h: np.asarray(
                [e if (e := schedule.label_end(g, h)) is not None else np.iinfo(np.int64).max for g in self.grid],
                dtype=np.int64,
            )
            for h in self.horizons
        }
        self._entries: dict[tuple[int, str], list[_GridEntry]] = {}
        self._build()

    @property
    def models(self) -> list[str]:
        return list(self.providers)

    def _build(self) -> None:
        for h in self.horizons:
            for m in self.providers:
                self._entries[(h, m)] = [_GridEntry() for _ in self.grid]
        for gi, g in enumerate(self.grid):
            sliced = closes_as_of(self.series, g)
            for sym, s in sliced.items():
                if not self.schedule.fresh(s, g):
                    continue
                for h in self.horizons:
                    realized = self.schedule.realized(self.series[sym], g, h)
                    if realized is None:
                        continue
                    for m, provider in self.providers.items():
                        raw = provider.raw(sym, s, h, g)
                        if raw is None:
                            continue
                        e = self._entries[(h, m)][gi]
                        e.raw_q.append(raw.forecast.array)
                        e.scale.append(raw.scale)
                        e.realized.append(realized)
                        e.p_up.append(raw.forecast.p_up)

    def _pool_indices(self, as_of: int, h: int) -> range:
        """라벨이 as_of 이전에 끝난 최근 POOL_WEEKS 개 격자(엠바고). 라벨 끝은 격자를 따라 늘어난다."""
        last = int(np.searchsorted(self._label_end[h], as_of, side="right"))
        return range(max(0, last - POOL_WEEKS), last)

    def _pool(self, as_of: int, h: int, m: str) -> tuple[ResidualPool | None, NDArray[np.float64]]:
        entries = [self._entries[(h, m)][i] for i in self._pool_indices(as_of, h)]
        rq = [q for e in entries for q in e.raw_q]
        if not rq:
            return None, np.empty(0, dtype=np.float64)
        pool = ResidualPool(
            raw_q=np.stack(rq),
            scale=np.asarray([s for e in entries for s in e.scale], dtype=np.float64),
            realized=np.asarray([r for e in entries for r in e.realized], dtype=np.float64),
        )
        p_up = np.asarray([p for e in entries for p in e.p_up], dtype=np.float64)
        return pool, p_up

    def emit(self, as_of: int, *, with_realized: bool) -> Iterator[Emitted]:
        sliced = closes_as_of(self.series, as_of)
        for h in self.horizons:
            fitted: dict[str, tuple[Adjustments | None, float | None]] = {}
            for m in self.providers:
                pool, p_up = self._pool(as_of, h, m)
                adj = fit_adjustments(pool) if pool is not None else None
                threshold = choose_threshold(p_up, pool.realized) if pool is not None and m != BASELINE else None
                fitted[m] = (adj, threshold)
            for sym, s in sliced.items():
                base = s.last_close()
                if base is None or not self.schedule.fresh(s, as_of):
                    continue
                realized = self.schedule.realized(self.series[sym], as_of, h) if with_realized else None
                if with_realized and realized is None:
                    continue
                for m, provider in self.providers.items():
                    adj, threshold = fitted[m]
                    raw = provider.raw(sym, s, h, as_of)
                    if raw is None or adj is None:
                        continue
                    fc = apply(raw.forecast, raw.scale, adj)
                    yield Emitted(sym, h, as_of, m, base, fc, direction_for(fc.p_up, threshold), realized)

    def backtest_as_ofs(self) -> list[int]:
        """보정 풀이 차기 시작한 뒤의 격자 전부. 라벨이 없는 것은 emit 이 거른다."""
        return self.grid[POOL_WEEKS // 2 :]
