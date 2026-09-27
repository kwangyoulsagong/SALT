"""일봉 패널 — 종목 × 날짜 행렬(FC-REQ-008).

행 t = available_at 이 `dates[t]` 인 봉(그날 00:00 UTC 마감). as_of = `dates[t]` 의 판단은 행 ≤ t 만 쓴다.
라벨(미래 수익률)만 t 이후 행을 읽는다 — 이 모듈의 `forward_*` 이름이 붙은 함수만 그렇다.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.series import DAY, OhlcvSeries

Mat = NDArray[np.float64]


@dataclass(frozen=True, slots=True)
class Panel:
    dates: NDArray[np.int64]  # epoch 초, 하루 간격
    symbols: tuple[str, ...]
    high: Mat
    low: Mat
    close: Mat
    volume: Mat
    listed_at: NDArray[np.int64]  # 종목별 첫 봉 행 번호

    @property
    def shape(self) -> tuple[int, int]:
        return (self.dates.size, len(self.symbols))

    def column(self, symbol: str) -> int:
        return self.symbols.index(symbol)


def build_panel(series: Mapping[str, OhlcvSeries], start: int, end: int) -> Panel:
    """[start, end] 날짜 격자(하루)에 봉을 맞춘다. 봉이 없는 칸은 NaN — 앞 값으로 채우지 않는다.

    `listed_at` 은 격자 **이전** 이력까지 본 첫 봉이라, 격자 시작 전에 상장한 종목을 새 상장으로 오인하지 않는다.
    """
    dates = np.arange(start - start % DAY, end + 1, DAY, dtype=np.int64)
    syms = tuple(sorted(series))
    shape = (dates.size, len(syms))
    high, low, close, volume = (np.full(shape, np.nan) for _ in range(4))
    listed = np.zeros(len(syms), dtype=np.int64)
    for j, s in enumerate(syms):
        o = series[s]
        if o.available_at.size == 0:
            listed[j] = dates.size
            continue
        idx = (o.available_at - dates[0]) // DAY
        ok = (idx >= 0) & (idx < dates.size) & (o.available_at % DAY == dates[0] % DAY)
        rows = idx[ok]
        high[rows, j] = o.high[ok]
        low[rows, j] = o.low[ok]
        close[rows, j] = o.close[ok]
        volume[rows, j] = o.volume[ok]
        listed[j] = int((o.available_at[0] - dates[0]) // DAY)  # 음수 = 격자 전 상장
    return Panel(dates, syms, high, low, close, volume, listed)


def lag(m: Mat, k: int) -> Mat:
    """k 행 전 값(과거). k ≥ 1."""
    out = np.full_like(m, np.nan)
    out[k:] = m[:-k]
    return out


def forward_log_return(p: Panel, h: int) -> Mat:
    """**라벨** — ln(C[t+h] / C[t]). 어느 쪽이 없으면 NaN."""
    out = np.full_like(p.close, np.nan)
    with np.errstate(divide="ignore", invalid="ignore"):
        out[:-h] = np.log(p.close[h:] / p.close[:-h])
    return out


def age_days(p: Panel) -> NDArray[np.int64]:
    """행 × 종목 상장 경과일. 상장 전은 음수."""
    return np.arange(p.dates.size, dtype=np.int64)[:, None] - p.listed_at[None, :]


def rolling_sum(m: Mat, w: int) -> Mat:
    """행 t 까지(포함) w 행 합. 창 안에 결측이 하나라도 있으면 NaN — 0 으로 채워 더하지 않는다."""
    if m.shape[0] < w:
        return np.full_like(m, np.nan)
    filled = np.cumsum(np.nan_to_num(m), axis=0)
    holes = np.cumsum(np.isnan(m), axis=0).astype(np.float64)
    prev = np.vstack([np.zeros((1, m.shape[1])), filled[:-1]])
    prev_holes = np.vstack([np.zeros((1, m.shape[1])), holes[:-1]])
    out = np.full_like(m, np.nan)
    out[w - 1 :] = filled[w - 1 :] - prev[: m.shape[0] - w + 1]
    bad = np.full_like(m, np.nan)
    bad[w - 1 :] = holes[w - 1 :] - prev_holes[: m.shape[0] - w + 1]
    out[~(bad == 0)] = np.nan
    return out


def align_points(
    available: NDArray[np.int64], value: NDArray[np.float64], dates: NDArray[np.int64], max_age: int
) -> NDArray[np.float64]:
    """날짜 격자마다 available ≤ t 인 가장 최근 값. 그 값이 max_age 초보다 오래됐으면 NaN(앞 값을 무한히 끌지 않는다).
    빈티지 수정이 없는 시리즈(체결 합 · 지수 · 비율)용 — 수정되는 거시 시리즈는 `VintagedSeries` 를 쓴다."""
    order = np.argsort(available, kind="stable")
    a, v = available[order], value[order]
    idx = np.searchsorted(a, dates, side="right") - 1
    out = np.full(dates.size, np.nan)
    ok = idx >= 0
    out[ok] = v[idx[ok]]
    out[ok & (dates - a[np.maximum(idx, 0)] > max_age)] = np.nan
    return out


def window_mean(
    available: NDArray[np.int64], value: NDArray[np.float64], dates: NDArray[np.int64], window: int
) -> NDArray[np.float64]:
    """날짜 격자마다 (t − window, t] 에 공개된 점들의 평균. 점이 없으면 NaN."""
    order = np.argsort(available, kind="stable")
    a, v = available[order], value[order]
    csum = np.concatenate(([0.0], np.cumsum(v)))
    hi = np.searchsorted(a, dates, side="right")
    lo = np.searchsorted(a, dates - window, side="right")
    n = hi - lo
    out = np.full(dates.size, np.nan)
    ok = n > 0
    out[ok] = (csum[hi[ok]] - csum[lo[ok]]) / n[ok]
    return out
