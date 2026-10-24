"""국내 주식 원천 이력 끊김 — FC-REQ-020 FR-10.

국내 가격제한폭은 ±30%(2015-06-15~)라 직전 봉 대비 1.30 배를 넘게 오를 수 없다. 넘었다면 가격이 아니라 **기준**이
바뀐 것이다 — KIS 수정주가가 병합(감자 · 액면병합)을 반영하지 않아 거래정지 뒤 재개일에 ×5 · ×10 · ×20 이
그대로 찍힌다(2026-10-23 실측 011000 534 → 2670 · 101140 585 → 11700, KIS 원천 그대로). 비율을 역산해 과거를
고치지 않는다 — 2.117 · 16.77 처럼 떨어지지 않는 경우가 있고, 확인 안 된 계수를 만드는 것이다. 대신 그 봉 앞과
뒤를 다른 기준으로 보고 둘을 잇는 수익률을 쓰지 않는다.

**하락은 끊김으로 보지 않는다** — 정리매매는 가격제한이 없어 하루 −90% 도 실제 손실이다(067770 · 312610 · 005110).
채점에서 빼면 아래 꼬리가 좋아 보인다(time-and-leakage.md §5). 하락 쪽 미수정 분할은 지금 데이터에 없다.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.series import CloseSeries

# 끊김 기준 — 가격제한 상한 1.30 에 여유를 둔다. 수정주가는 반올림돼 진짜 상한가가 1.3000~1.3008 로 찍힌다(2026-10-23
# 실측 129건 — 1.30 으로 자르면 실제 +30% 를 채점에서 빼 위 꼬리가 좋아 보인다).
# 그 위 첫 값은 1.3424(끊김)라 사이가 비었다
KRX_UP_BREAK_RATIO = 1.31


def up_limit_breaks(close: NDArray[np.float64]) -> NDArray[np.bool_]:
    """봉마다 직전 봉 대비 끊김 기준을 넘었는가(첫 봉은 False). close 는 한 종목의 이어진 봉(결측 없음)."""
    out = np.zeros(close.shape, dtype=np.bool_)
    if close.size > 1:
        with np.errstate(divide="ignore", invalid="ignore"):
            out[1:] = close[1:] / close[:-1] > KRX_UP_BREAK_RATIO
    return out


def with_breaks(series: CloseSeries) -> CloseSeries:
    """끊김 시각을 붙인 같은 시계열 — `CloseSeries.as_of` 가 그 시점까지의 마지막 끊김부터 자른다."""
    breaks = series.available_at[up_limit_breaks(series.close)]
    return CloseSeries(series.symbol, series.available_at, series.close, breaks.astype(np.int64))
