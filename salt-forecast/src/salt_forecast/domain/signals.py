"""시장 신호 — 펀딩비 쏠림 · 김치 프리미엄 0 교차 (FC-REQ-007). 순수 계산, I/O 없음.

## 시각 규칙 (time-and-leakage.md §1)

격자는 업비트 일봉 마감(00:00 UTC = 09:00 KST)이다. 봉 i 의 값은 **그 봉 마감에 알 수 있던 것만** 쓴다.

- 펀딩비: 마감 전 24시간 안의 정산(`t ∈ (마감 − 1일, 마감]`) 평균. 정산 시각이 곧 공개 시각이다
- 백분위: 봉 i **앞** 365일 일평균 중 봉 i 값보다 낮은 비율(중간 순위 — 같은 값은 절반만 센다). 기본 금리
  0.01% 에 오래 머문 종목이 "낮다"나 "높다"로 읽히지 않게
- 김치 프리미엄: 업비트 원화 종가 ÷ (바이낸스 USDT 종가 × 원/달러) − 1. 환율은 마감에 공개돼 있던 가장 최근 값,
  관측이 `FX_MAX_AGE` 보다 오래됐으면 계산하지 않는다(연휴에 낡은 환율로 0 을 가로지른 것처럼 보이지 않게)

## 사건

- 쏠림 진입: 상태가 `long_crowded`(백분위 ≥ 0.9) · `short_crowded`(≤ 0.1)가 된 날. 앞 14일 안에 같은 상태가 있었으면
  같은 국면으로 보고 새 사건으로 세지 않는다 — 겹친 표본이 분포를 부풀리지 않게
- 0 교차: 부호가 **3일 연속** 바뀌어야 확정. 확정된 날이 사건 시각이다(첫날로 거슬러 올리면 미래를 본 것이 된다)
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.asof_series import VintagedSeries
from salt_forecast.domain.series import DAY, CloseSeries, OhlcvSeries

KINDS = ("funding_long_crowded", "funding_short_crowded", "kimchi_cross_up", "kimchi_cross_down")
FUNDING_WINDOW_DAYS = 365
FUNDING_MIN_SAMPLE = 180
FUNDING_HOT = 0.9
FUNDING_COLD = 0.1
FUNDING_GAP_DAYS = 14
KIMCHI_CONFIRM_DAYS = 3
FX_MAX_AGE = 5 * DAY
OI_LOOKBACK = 7 * DAY
OI_TOLERANCE = 2 * 3_600
# 펀딩비는 소수 8자리로 공표된다. 세 번 평균의 반복 소수를 12자리에서 끊는다
ROUND_DIGITS = 12


@dataclass(frozen=True, slots=True)
class Points:
    """시각(공개 시각, epoch 초) 오름차순 점 — 펀딩비 · 미결제약정."""

    at: NDArray[np.int64]
    value: NDArray[np.float64]

    @staticmethod
    def build(at: Sequence[int], value: Sequence[float]) -> Points:
        t = np.asarray(at, dtype=np.int64)
        v = np.asarray(value, dtype=np.float64)
        order = np.argsort(t, kind="stable")
        return Points(t[order], v[order])


@dataclass(frozen=True, slots=True)
class FxOnGrid:
    """격자 시각마다 알 수 있던 환율과 그 관측 시각. 종목마다 다시 계산하지 않게 한 번만 만든다."""

    at: NDArray[np.int64]
    value: NDArray[np.float64]
    observed: NDArray[np.int64]


def fx_on_grid(fx: VintagedSeries, times: Sequence[int]) -> FxOnGrid:
    grid = np.unique(np.asarray(times, dtype=np.int64))
    value = np.full(len(grid), np.nan)
    observed = np.zeros(len(grid), dtype=np.int64)
    for i, t in enumerate(grid):
        known = fx.available <= t
        if not known.any():
            continue
        obs = int(fx.observed[known].max())
        v = fx.value_as_of(int(t))
        if v is not None:
            value[i], observed[i] = v, obs
    return FxOnGrid(grid, value, observed)


@dataclass(frozen=True, slots=True)
class DailySignals:
    """봉 격자 위의 값. 모를 때는 NaN."""

    at: NDArray[np.int64]
    funding: NDArray[np.float64]
    funding_pct: NDArray[np.float64]
    funding_sample: NDArray[np.int64]
    kimchi: NDArray[np.float64]
    fx: NDArray[np.float64]
    fx_observed: NDArray[np.int64]


def daily_signals(
    bars: OhlcvSeries, usdt: CloseSeries | None, funding: Points | None, fx: FxOnGrid | None
) -> DailySignals:
    at = bars.available_at
    n = len(at)
    f_daily = np.full(n, np.nan)
    if funding is not None and len(funding.at):
        lo = np.searchsorted(funding.at, at - DAY, side="right")
        hi = np.searchsorted(funding.at, at, side="right")
        csum = np.concatenate(([0.0], np.cumsum(funding.value)))
        count = hi - lo
        ok = count > 0
        # 누적합 차의 부동소수 오차가 같은 값(기본 금리 0.01% × 3)을 서로 다른 값으로 만든다 — 백분위가 동률을 못 본다
        f_daily[ok] = np.round((csum[hi[ok]] - csum[lo[ok]]) / count[ok], ROUND_DIGITS)

    pct = np.full(n, np.nan)
    sample = np.zeros(n, dtype=np.int64)
    for i in range(n):
        if np.isnan(f_daily[i]):
            continue
        window = f_daily[max(0, i - FUNDING_WINDOW_DAYS) : i]
        window = window[~np.isnan(window)]
        sample[i] = len(window)
        if len(window) >= FUNDING_MIN_SAMPLE:
            v = float(f_daily[i])
            lower, same = int(np.count_nonzero(window < v)), int(np.count_nonzero(window == v))
            pct[i] = (lower + 0.5 * same) / len(window)

    kimchi = np.full(n, np.nan)
    fx_v = np.full(n, np.nan)
    fx_o = np.zeros(n, dtype=np.int64)
    if usdt is not None and len(usdt.available_at) and fx is not None and len(fx.at):
        j = np.searchsorted(usdt.available_at, at)
        same = (j < len(usdt.available_at)) & (usdt.available_at[np.minimum(j, len(usdt.available_at) - 1)] == at)
        k = np.searchsorted(fx.at, at)
        on_grid = (k < len(fx.at)) & (fx.at[np.minimum(k, len(fx.at) - 1)] == at)
        for i in np.flatnonzero(same & on_grid):
            rate, obs = fx.value[k[i]], int(fx.observed[k[i]])
            if np.isnan(rate) or at[i] - obs > FX_MAX_AGE:
                continue
            fx_v[i], fx_o[i] = rate, obs
            kimchi[i] = bars.close[i] / (usdt.close[j[i]] * rate) - 1.0
    return DailySignals(at, f_daily, pct, sample, kimchi, fx_v, fx_o)


@dataclass(frozen=True, slots=True)
class SignalEvent:
    kind: str
    event_at: int
    value: float


def funding_state(pct: float) -> str | None:
    if np.isnan(pct):
        return None
    if pct >= FUNDING_HOT:
        return "long_crowded"
    if pct <= FUNDING_COLD:
        return "short_crowded"
    return "neutral"


def funding_events(d: DailySignals) -> list[SignalEvent]:
    out: list[SignalEvent] = []
    states = [funding_state(float(p)) for p in d.funding_pct]
    last_seen: dict[str, int] = {}
    for i, s in enumerate(states):
        if s is None or s == "neutral":
            continue
        prev = last_seen.get(s)
        if prev is None or d.at[i] - prev > FUNDING_GAP_DAYS * DAY:
            out.append(SignalEvent(f"funding_{s}", int(d.at[i]), float(d.funding_pct[i])))
        last_seen[s] = int(d.at[i])
    return out


@dataclass(frozen=True, slots=True)
class KimchiRegime:
    events: list[SignalEvent]
    state: int | None
    since: int | None


def kimchi_regime(d: DailySignals) -> KimchiRegime:
    """확정 부호의 흐름. 결측(NaN)은 연속을 끊는다 — 3일 연속은 실제로 계산된 3일이다."""
    events: list[SignalEvent] = []
    state: int | None = None
    since: int | None = None
    run = 0
    for i, v in enumerate(d.kimchi):
        if np.isnan(v) or v == 0.0:
            run = 0
            continue
        sign = 1 if v > 0 else -1
        if state is None:
            state = sign
            continue
        run = run + 1 if sign != state else 0
        if run >= KIMCHI_CONFIRM_DAYS:
            state, since, run = sign, int(d.at[i]), 0
            kind = "kimchi_cross_up" if sign > 0 else "kimchi_cross_down"
            events.append(SignalEvent(kind, int(d.at[i]), float(v)))
    return KimchiRegime(events, state, since)


@dataclass(frozen=True, slots=True)
class OpenInterest:
    usd: float
    at: int
    change_7d: float | None


def open_interest(oi: Points | None, as_of: int) -> OpenInterest | None:
    """as_of 에 알던 마지막 스냅샷과 7일 전(±2시간) 대비 변화. 이력이 30일뿐이라 백분위는 내지 않는다."""
    if oi is None:
        return None
    end = int(np.searchsorted(oi.at, as_of, side="right")) - 1
    if end < 0:
        return None
    last_at, last = int(oi.at[end]), float(oi.value[end])
    target = last_at - OI_LOOKBACK
    k = int(np.searchsorted(oi.at, target, side="right")) - 1
    change: float | None = None
    if k >= 0 and target - int(oi.at[k]) <= OI_TOLERANCE and oi.value[k] > 0:
        change = last / float(oi.value[k]) - 1.0
    return OpenInterest(last, last_at, change)
