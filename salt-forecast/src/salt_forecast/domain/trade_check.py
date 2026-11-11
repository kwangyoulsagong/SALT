"""점검 채점 — 순수 계산(FC-REQ-028 FR-4 · F017 v2 단계 2). I/O 없음.

점검 문장과 같은 정의로 결과를 잰다:
- 국내: 점검한 날(KST) **뒤** h 번째 거래일 봉의 종가("다음 거래일 종가까지")
- 코인: 점검 시각 + h 일이 지난 뒤 첫 일봉 종가("하루 동안")
- 진입가 = 점검 때 가격. 사기 전은 왕복 비용 뒤, 팔기 전은 비용 전(파는 비용은 같다)
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.base_rate import CRYPTO_ROUND_TRIP, kr_round_trip

KST = timedelta(hours=9)


@dataclass(frozen=True, slots=True)
class CheckRow:
    ledger_id: str
    symbol: str  # 예측 키(KRW-XXX · 6자리)
    market: str
    side: str
    condition_id: str
    horizon: int
    shown_up_rate: float | None
    price_at_check: float
    checked_at: datetime


@dataclass(frozen=True, slots=True)
class Outcome:
    ledger_id: str
    market: str
    side: str
    condition_id: str
    horizon: int
    shown_up_rate: float | None
    end_at: datetime
    realized: float
    went_up: bool


def _kst_date(t: datetime) -> date:
    return (t.astimezone(UTC) + KST).date()


def end_bar(row: CheckRow, available_at: NDArray[np.int64], as_of: int) -> int | None:
    """결과 봉의 행 번호 — 아직 기간이 안 지났으면(as_of 까지 그 봉이 없으면) None."""
    if row.market == "kr":
        # 봉 available_at = 그 거래일 16:00 KST — 날짜로 센다. 점검한 날 봉은 넣지 않는다
        check_day = _kst_date(row.checked_at)
        days = [(datetime.fromtimestamp(int(t), tz=UTC) + KST).date() for t in available_at]
        after = [i for i, d in enumerate(days) if d > check_day]
        if len(after) < row.horizon:
            return None
        idx = after[row.horizon - 1]
    else:
        target = int((row.checked_at + timedelta(days=row.horizon)).timestamp())
        idx = int(np.searchsorted(available_at, target, side="left"))
        if idx >= available_at.size:
            return None
    return idx if int(available_at[idx]) <= as_of else None


def score(row: CheckRow, available_at: NDArray[np.int64], close: NDArray[np.float64], as_of: int) -> Outcome | None:
    idx = end_bar(row, available_at, as_of)
    if idx is None or row.price_at_check <= 0 or not close[idx] > 0:
        return None
    end = datetime.fromtimestamp(int(available_at[idx]), tz=UTC)
    gross = math.log(float(close[idx]) / row.price_at_check)
    if row.side == "buy":
        cost = kr_round_trip(_kst_date(end), row.price_at_check) if row.market == "kr" else CRYPTO_ROUND_TRIP
        realized = gross - cost
    else:
        realized = gross
    return Outcome(
        row.ledger_id,
        row.market,
        row.side,
        row.condition_id,
        row.horizon,
        row.shown_up_rate,
        end,
        realized,
        realized > 0,
    )
