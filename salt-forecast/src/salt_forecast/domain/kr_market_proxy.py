"""국내 시장 대용 — 유니버스 동일가중 일봉 지수 (FC-REQ-021 FR-6 · Q3).

코스피 지수 일봉 이력이 없다(`kr_index_quotes` 는 매분 최근값만). 그래서 시장 일정의 "시장 전체" 반응을
`kr-universe@1` 유동성 규칙을 **그날 전 거래일까지의 봉으로** 통과한 종목의 동일가중 수익률로 잇는다.

- 시점 고정: 거래일 t 의 구성은 t−1 까지 닫힌 봉만 본다(봉 수 · 최근 20거래일 거래대금). t 의 종가는 수익률에만
- 생존 편향 없음: 그때 있던 종목은 뒤에 상장폐지됐어도 들어간다(time-and-leakage.md §5)
- 원천 끊김(`kr_breaks`) 이 있는 날의 그 종목 수익률은 뺀다 — 병합 ×5 가 지수를 튀게 하지 않게
- 거래량은 없다(NaN) — 사건 반응의 거래량 비는 이 시계열에서 나오지 않는다
"""

from __future__ import annotations

from collections.abc import Mapping

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.kr_breaks import up_limit_breaks
from salt_forecast.domain.kr_universe import RULE, LiquidityRule
from salt_forecast.domain.series import OhlcvSeries

SYMBOL = "KR-EW"
BASE = 1000.0


def equal_weight_index(bars: Mapping[str, OhlcvSeries], rule: LiquidityRule = RULE) -> OhlcvSeries:
    """종목 봉들의 시각 합집합 위의 동일가중 지수. 구성 종목이 0인 날은 봉을 만들지 않는다."""
    times = np.unique(np.concatenate([b.available_at for b in bars.values()])) if bars else np.empty(0, np.int64)
    n = times.size
    ret_sum = np.zeros(n)
    ret_cnt = np.zeros(n, dtype=np.int64)
    w = rule.window_sessions
    for b in bars.values():
        k = b.available_at.size
        if k <= rule.min_bars:
            continue
        pos = np.searchsorted(times, b.available_at)
        close = b.close
        turnover = close * b.volume
        # 봉 i(i ≥ 1)의 구성 자격 = 봉 i−1 까지: 봉 수 ≥ min_bars · 직전 w 봉 전부 거래대금 있고 평균 ≥ 하한
        csum = np.concatenate([[0.0], np.cumsum(np.nan_to_num(turnover, nan=0.0))])
        nan_cum = np.concatenate([[0], np.cumsum(np.isnan(turnover))])
        i = np.arange(max(rule.min_bars, w), k)
        mean = (csum[i] - csum[i - w]) / w
        ok = (nan_cum[i] == nan_cum[i - w]) & (mean >= rule.min_turnover_krw)
        # 직전 봉이 바로 앞 거래일이어야 한다 — 거래정지 뒤 재개 첫 봉은 여러 날을 한 번에 담는다
        ok &= pos[i] - pos[i - 1] == 1
        ok &= ~up_limit_breaks(close)[i]
        sel = i[ok]
        r = close[sel] / close[sel - 1] - 1.0
        np.add.at(ret_sum, pos[sel], r)
        np.add.at(ret_cnt, pos[sel], 1)
    has = ret_cnt > 0
    daily: NDArray[np.float64] = np.divide(ret_sum, ret_cnt, out=np.zeros(n), where=has)
    # 첫 구성일의 전날을 기준 봉으로 둔다 — 첫 수익률의 기준 종가가 있어야 한다
    first = int(np.argmax(has)) if has.any() else n
    keep = np.zeros(n, dtype=bool)
    keep[first:] = has[first:]
    if first < n and first > 0:
        keep[first - 1] = True
    level = BASE * np.cumprod(1.0 + np.where(has, daily, 0.0))
    t = times[keep].astype(np.int64)
    c = level[keep]
    nan = np.full(c.size, np.nan)
    return OhlcvSeries(SYMBOL, t, c.copy(), c.copy(), c.copy(), c.copy(), nan)
