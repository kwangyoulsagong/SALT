"""대형 체결 흐름 — 체결 목록 → 하루 매수 · 매도 합(FC-REQ-008 FR-3).

라이브 코치 규칙(`makeModeDecision`)은 업비트 최근 체결 중 5천만원 이상의 **테이커 방향**을 매수 · 매도로 센다.
과거 이력은 바이낸스 aggTrades 로 같은 정의를 따른다: `is_buyer_maker = false` 면 매수자가 테이커 → 매수 체결.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import numpy.typing as npt

# 5천만원 ÷ 1,430원/달러 — 사전등록 rule-ic@1 [whale_proxy]
WHALE_THRESHOLD_USD = 35_000.0
# 규칙의 문턱 — 한쪽이 다른 쪽의 1.2배를 넘으면 우세
DOMINANCE = 1.2


@dataclass(frozen=True, slots=True)
class DailyFlow:
    buy_usd: float
    sell_usd: float
    n_buy: int
    n_sell: int


def large_trade_flow(
    price: npt.NDArray[np.float64],
    qty: npt.NDArray[np.float64],
    buyer_is_maker: npt.NDArray[np.bool_],
    threshold_usd: float = WHALE_THRESHOLD_USD,
) -> DailyFlow:
    notional = price * qty
    large = notional >= threshold_usd
    buy = large & ~buyer_is_maker
    sell = large & buyer_is_maker
    return DailyFlow(
        buy_usd=float(notional[buy].sum()),
        sell_usd=float(notional[sell].sum()),
        n_buy=int(buy.sum()),
        n_sell=int(sell.sum()),
    )


def whale_contribution(buy: float, sell: float) -> float:
    """규칙과 같은 판정 — 매수 우세 +8, 매도 우세 −8, 그 외 0. 둘 다 0 이면 0(발동 안 함)."""
    if buy > sell * DOMINANCE:
        return 8.0
    if sell > buy * DOMINANCE:
        return -8.0
    return 0.0


def net_ratio(buy: float, sell: float) -> float:
    """(매수 − 매도) ÷ (매수 + 매도). 대형 체결이 없으면 NaN — 0(균형)과 다르다."""
    total = buy + sell
    return (buy - sell) / total if total > 0 else float("nan")
