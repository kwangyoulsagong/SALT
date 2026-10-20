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

from collections.abc import Callable, Iterator, Mapping, Sequence
from dataclasses import dataclass, field
from typing import Protocol

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.baselines import (
    RawForecast,
    daily_sigma,
    empirical_quantiles_on,
    ensemble,
    random_walk_from_sigma,
)
from salt_forecast.domain.calendar import COIN, Schedule
from salt_forecast.domain.calibration import (
    NOMINAL_ALPHA,
    Adjustments,
    ResidualPool,
    aci_step,
    apply,
    fit_adjustments,
    miss_rates,
)
from salt_forecast.domain.quantiles import LEVELS, Direction, QuantileForecast
from salt_forecast.domain.scoring import choose_threshold, direction_for
from salt_forecast.domain.series import WEEK, CloseSeries
from salt_forecast.features.as_of import closes_as_of

ENSEMBLE = "ens-baseline@0.1.0"
BASELINE = "rw-normal@0.1.0"
HORIZONS: tuple[int, ...] = (1, 2, 3, 4)
POOL_WEEKS = 52
CALIBRATION = {"calibration": "normalized-CQR-pooled", "pool_weeks": POOL_WEEKS}


class Provider(Protocol):
    """모델 하나. sliced 는 as_of 로 잘린 시계열 — 그 밖을 보면 누수다."""

    def raw(self, symbol: str, sliced: CloseSeries, h: int, as_of: int) -> RawForecast | None: ...


class SharedRandomWalk:
    """기준 A 를 (종목, 기간)마다 한 번 — 기준 · 앙상블 · 경험 형태가 모두 같은 기준 A 를 쓴다(performance.md §2).

    엔진은 한 as_of 의 종목 · 기간 · 모델을 다 돈 뒤 다음 as_of 로 가므로 **지금 as_of 하나만** 들고 있는다.
    as_of 가 바뀌면 비운다 — 메모리는 종목 수 × 기간 수로 묶인다. 같은 (종목, as_of) 의 잘린 시계열은 하나라
    캐시가 결과를 바꾸지 않는다.
    """

    def __init__(self, schedule: Schedule = COIN) -> None:
        self.days, self.gap = schedule.days_per_week, schedule.max_gap
        self._as_of: int | None = None
        self._sigma: dict[str, float | None] = {}
        self._rw: dict[tuple[str, int], RawForecast | None] = {}

    def get(self, symbol: str, sliced: CloseSeries, h: int, as_of: int) -> RawForecast | None:
        if as_of != self._as_of:
            self._as_of, self._sigma, self._rw = as_of, {}, {}
        key = (symbol, h)
        if key not in self._rw:
            if symbol not in self._sigma:
                self._sigma[symbol] = daily_sigma(sliced, self.gap)
            self._rw[key] = random_walk_from_sigma(self._sigma[symbol], h, self.days)
        return self._rw[key]


class RandomWalk:
    def __init__(self, schedule: Schedule = COIN, shared: SharedRandomWalk | None = None) -> None:
        self.rw = shared or SharedRandomWalk(schedule)

    def raw(self, symbol: str, sliced: CloseSeries, h: int, as_of: int) -> RawForecast | None:
        return self.rw.get(symbol, sliced, h, as_of)


class BaselineEnsemble:
    def __init__(self, schedule: Schedule = COIN, shared: SharedRandomWalk | None = None) -> None:
        self.rw = shared or SharedRandomWalk(schedule)

    def raw(self, symbol: str, sliced: CloseSeries, h: int, as_of: int) -> RawForecast | None:
        a = self.rw.get(symbol, sliced, h, as_of)
        b = empirical_quantiles_on(a, sliced, h, self.rw.days)
        return ensemble([a, b]) if a and b else None


def baseline_providers() -> dict[str, Provider]:
    shared = SharedRandomWalk()
    return {BASELINE: RandomWalk(shared=shared), ENSEMBLE: BaselineEnsemble(shared=shared)}


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
    scale: float = 0.0  # 보정 전 척도(일 변동성 × √n) — 척도 QLIKE 채점용(FC-REQ-020 FR-11)


@dataclass(slots=True)
class _GridEntry:
    """격자 하나 × 기간 × 모델의 raw 예측. `_build` 가 리스트로 쌓고 `freeze` 로 배열이 된다 — 보정 풀은 매 as_of
    52개를 이어 붙이므로 행 단위 리스트를 매번 다시 쌓지 않는다. `index` 는 같은 격자에서 emit 할 때 provider 를
    다시 부르지 않으려고 둔다(백테스트는 격자 시점에서만 emit 한다).

    freeze 뒤에는 **배열만** 남긴다 — 국내 전 종목 백테스트에서 raw 분위수 객체 수백만 개가 GB 단위였다
    (FC-REQ-020 P4). `raw()` 는 배열 행에서 같은 값의 객체를 다시 만든다(float64 → float 는 값이 그대로다)."""

    symbols: list[str] = field(default_factory=lambda: [])
    forecast: list[QuantileForecast] = field(default_factory=lambda: [])
    scale: list[float] = field(default_factory=lambda: [])
    realized: list[float] = field(default_factory=lambda: [])
    bucket: list[int] = field(default_factory=lambda: [])
    index: dict[str, int] = field(default_factory=lambda: {})
    raw_q: NDArray[np.float64] = field(default_factory=lambda: np.empty((0, len(LEVELS))))
    scale_arr: NDArray[np.float64] = field(default_factory=lambda: np.empty(0))
    realized_arr: NDArray[np.float64] = field(default_factory=lambda: np.empty(0))
    p_up: NDArray[np.float64] = field(default_factory=lambda: np.empty(0))
    bucket_arr: NDArray[np.int64] = field(default_factory=lambda: np.empty(0, dtype=np.int64))

    def freeze(self, shared: dict[tuple[str, ...], dict[str, int]] | None = None) -> None:
        """`shared` — 같은 격자에서 종목 목록이 같은 칸끼리 `index` 사전 하나를 나눠 쓴다(모델 9개가 대개 같은 목록)."""
        if self.forecast:
            self.raw_q = np.asarray([f.q for f in self.forecast], dtype=np.float64)
            self.p_up = np.asarray([f.p_up for f in self.forecast], dtype=np.float64)
        self.scale_arr = np.asarray(self.scale, dtype=np.float64)
        self.realized_arr = np.asarray(self.realized, dtype=np.float64)
        self.bucket_arr = np.asarray(self.bucket, dtype=np.int64)
        key = tuple(self.symbols)
        index = None if shared is None else shared.get(key)
        if index is None:
            index = {s: i for i, s in enumerate(self.symbols)}
            if shared is not None:
                shared[key] = index
        self.index = index
        self.symbols, self.forecast, self.scale, self.realized, self.bucket = [], [], [], [], []

    @property
    def size(self) -> int:
        return int(self.realized_arr.size)

    def raw(self, symbol: str) -> RawForecast | None:
        i = self.index.get(symbol)
        if i is None:
            return None
        fc = QuantileForecast(tuple(self.raw_q[i].tolist()), float(self.p_up[i]))
        return RawForecast(fc, float(self.scale_arr[i]), int(self.bucket_arr[i]))


def mondrian(pool: ResidualPool, bucket: NDArray[np.int64]) -> dict[int, Adjustments]:
    """버킷(1~)별 조정량(FC-REQ-020 FR-13). 버킷 풀이 작으면 빠진다 — 그 버킷은 풀 전체 조정량을 쓴다.
    버킷 0(코인 · 버킷 없는 모델)은 여기 없다 → 지금 동작 그대로."""
    out: dict[int, Adjustments] = {}
    for b in np.unique(bucket[bucket > 0]).tolist():
        sel = bucket == b
        sub = ResidualPool(pool.raw_q[sel], pool.scale[sel], pool.realized[sel])
        adj = fit_adjustments(sub)
        if adj is not None:
            out[int(b)] = adj
    return out


def pool_start(as_of: int, horizons: Sequence[int] = HORIZONS) -> int:
    """as_of 의 보정 풀이 닿을 수 있는 가장 이른 격자 — 풀 주 수 + 최장 기간 + 휴장 여유 2주."""
    return as_of - (POOL_WEEKS + max(horizons) + 2) * WEEK


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
        eligible: Callable[[int], frozenset[str]] | None = None,
        since: int | None = None,
        aci: Mapping[str, float] | None = None,
    ) -> None:
        """`eligible(t)` — t 에 대상인 종목(국내 주식 시점 고정 유니버스, FC-REQ-020 FR-7). None 이면 전부(코인).

        `since` — 이 시각 이전 격자는 raw 를 만들지 않는다. 매일 작업은 보정 풀(라벨 끝난 최근 POOL_WEEKS 주)만
        필요해 `pool_start(as_of)` 를 넘긴다 — 결과는 전체 격자와 같다(tests/models/test_engine_since.py).

        `aci` — 모델 → γ. 그 모델은 명목 대신 적응 α 로 보정한다(사전등록 `kr-scale@2`). α 는 라벨 끝난 주의 단면
        이탈률로 격자 순서대로 갱신된다 — 그래서 `since` 로 자른 엔진은 α 경로가 달라진다(백테스트 절제 전용).
        """
        self.series = dict(series)
        self._eligible = eligible
        self._eligible_cache: dict[int, frozenset[str]] = {}
        self.providers = dict(providers) if providers is not None else baseline_providers()
        self.horizons = tuple(horizons)
        self.schedule = schedule
        self.grid = [g for g in grid_for(self.series, schedule) if since is None or g >= since]
        # 격자 g 의 h주 라벨을 알게 되는 시각 — 보정 풀 엠바고 기준. 달력이 모르면 무한대(풀에 못 들어간다)
        self._label_end = {
            h: np.asarray(
                [e if (e := schedule.label_end(g, h)) is not None else np.iinfo(np.int64).max for g in self.grid],
                dtype=np.int64,
            )
            for h in self.horizons
        }
        self._entries: dict[tuple[int, str], list[_GridEntry]] = {}
        self._grid_pos = {g: i for i, g in enumerate(self.grid)}
        self._aci = dict(aci or {})
        self._alpha_after: dict[tuple[int, str], list[tuple[float, ...]]] = {}
        self._build()

    def eligible_at(self, t: int) -> frozenset[str]:
        """t 에 대상인 종목(필터가 없으면 전부)."""
        if self._eligible is None:
            return frozenset(self.series)
        if t not in self._eligible_cache:
            self._eligible_cache[t] = self._eligible(t)
        return self._eligible_cache[t]

    def _allowed(self, t: int, sym: str) -> bool:
        return self._eligible is None or sym in self.eligible_at(t)

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
                if not self._allowed(g, sym) or not self.schedule.fresh(s, g):
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
                        e.symbols.append(sym)
                        e.forecast.append(raw.forecast)
                        e.scale.append(raw.scale)
                        e.realized.append(realized)
                        e.bucket.append(raw.bucket)
            # 격자 하나가 끝날 때마다 굳힌다 — 끝에 한꺼번에 굳히면 raw 객체 전부가 한때 메모리에 있다(FC-REQ-020 P4)
            shared: dict[tuple[str, ...], dict[str, int]] = {}
            for entries in self._entries.values():
                entries[gi].freeze(shared)

    def _pool_indices(self, as_of: int, h: int) -> range:
        """라벨이 as_of 이전에 끝난 최근 POOL_WEEKS 개 격자(엠바고). 라벨 끝은 격자를 따라 늘어난다."""
        last = int(np.searchsorted(self._label_end[h], as_of, side="right"))
        return range(max(0, last - POOL_WEEKS), last)

    def _pool(self, as_of: int, h: int, m: str) -> tuple[ResidualPool | None, NDArray[np.float64], NDArray[np.int64]]:
        entries = [e for i in self._pool_indices(as_of, h) if (e := self._entries[(h, m)][i]).size]
        if not entries:
            return None, np.empty(0, dtype=np.float64), np.empty(0, dtype=np.int64)
        pool = ResidualPool(
            raw_q=np.concatenate([e.raw_q for e in entries]),
            scale=np.concatenate([e.scale_arr for e in entries]),
            realized=np.concatenate([e.realized_arr for e in entries]),
        )
        p_up = np.concatenate([e.p_up for e in entries])
        bucket = np.concatenate([e.bucket_arr for e in entries])
        return pool, p_up, bucket

    def _adjust(self, as_of: int, h: int, m: str, pool: ResidualPool) -> Adjustments | None:
        if m not in self._aci:
            return fit_adjustments(pool)
        return fit_adjustments(pool, tuple(1.0 - a for a in self.aci_alpha(as_of, h, m)))

    def aci_alpha(self, as_of: int, h: int, m: str) -> tuple[float, ...]:
        """as_of 에 쓰는 α — 라벨이 as_of 이전에 끝난 주를 격자 순서대로 전부 넣은 상태. 없으면 명목."""
        after = self._alpha_path(h, m)
        k = int(np.searchsorted(self._label_end[h], as_of, side="right"))
        return after[k - 1] if k > 0 else NOMINAL_ALPHA

    def _alpha_path(self, h: int, m: str) -> list[tuple[float, ...]]:
        """after[j] = 주 j 까지 넣은 뒤의 α. 주 j 의 이탈률은 그 주에 **실제로 낸**(그때 α 로 보정한) 구간으로 잰다.
        라벨 끝 ≤ 격자 j 인 주는 전부 j 보다 앞이라 순서대로 한 번에 채울 수 있다."""
        key = (h, m)
        if key in self._alpha_after:
            return self._alpha_after[key]
        gamma, ends = self._aci[m], self._label_end[h]
        after: list[tuple[float, ...]] = []
        alpha = NOMINAL_ALPHA
        for j, g in enumerate(self.grid):
            k = int(np.searchsorted(ends, g, side="right"))
            a_j = after[k - 1] if k > 0 else NOMINAL_ALPHA
            e = self._entries[(h, m)][j]
            pool, _, _ = self._pool(g, h, m)
            adj = fit_adjustments(pool, tuple(1.0 - a for a in a_j)) if pool is not None and e.size else None
            if adj is not None:
                alpha = aci_step(alpha, miss_rates(e.raw_q, e.scale_arr, e.realized_arr, adj), gamma)
            after.append(alpha)
        self._alpha_after[key] = after
        return after

    def emit(self, as_of: int, *, with_realized: bool) -> Iterator[Emitted]:
        sliced = closes_as_of(self.series, as_of)
        # 격자 시점 · 실현값 있는 emit 은 `_build` 가 같은 조건(대상 · 신선 · 실현값)으로 이미 raw 를 만들었다
        gi = self._grid_pos.get(as_of) if with_realized else None
        for h in self.horizons:
            fitted: dict[str, tuple[Adjustments | None, float | None, dict[int, Adjustments]]] = {}
            for m in self.providers:
                pool, p_up, bucket = self._pool(as_of, h, m)
                adj = self._adjust(as_of, h, m, pool) if pool is not None else None
                threshold = choose_threshold(p_up, pool.realized) if pool is not None and m != BASELINE else None
                by_bucket = mondrian(pool, bucket) if pool is not None and adj is not None else {}
                fitted[m] = (adj, threshold, by_bucket)
            for sym, s in sliced.items():
                base = s.last_close()
                if base is None or not self._allowed(as_of, sym) or not self.schedule.fresh(s, as_of):
                    continue
                realized = self.schedule.realized(self.series[sym], as_of, h) if with_realized else None
                if with_realized and realized is None:
                    continue
                for m, provider in self.providers.items():
                    adj, threshold, by_bucket = fitted[m]
                    raw = self._entries[(h, m)][gi].raw(sym) if gi is not None else provider.raw(sym, s, h, as_of)
                    if raw is None or adj is None:
                        continue
                    fc = apply(raw.forecast, raw.scale, by_bucket.get(raw.bucket, adj))
                    yield Emitted(sym, h, as_of, m, base, fc, direction_for(fc.p_up, threshold), realized, raw.scale)

    def backtest_as_ofs(self) -> list[int]:
        """보정 풀이 차기 시작한 뒤의 격자 전부. 라벨이 없는 것은 emit 이 거른다."""
        return self.grid[POOL_WEEKS // 2 :]
