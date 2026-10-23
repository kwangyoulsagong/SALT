"""국내 종목 상태 억제(FC-REQ-020 FR-9) — 가격만 보는 모델이 모르는 위험이 있는 종목은 범위 대신 상태를 보인다.

정리매매는 가격제한 없이 바닥으로 무너지기 쉽고, 거래정지는 재개 첫 수익률이 점프이며, 관리종목 · 투자경고/위험은
상장폐지 · 정지 위험을 품고 있다(리서치 보고서 권고 10). 이 상태들에서 과거 변동성으로 만든 범위는 근거가 없다.

- 원천은 서버 종목 마스터(매일 07:30 KST, 전날 기준). 상태 **이력이 없어서** 오늘 게이트에만 걸고 백테스트 ·
  채점은 그대로 둔다 — 채점에서 빼면 아래 꼬리 커버리지가 좋아 보인다(보고서 "하지 말 것")
- 마스터의 동기화 시각을 `available_at` 으로 본다(`status_known_at`). 과거 as_of 로 다시 돌리면 그때 상태를
  모르므로 걸지 않는다 — 지금 상태를 과거에 쓰면 미래 정보다(time-and-leakage §1 · architecture §3 재현)
- 상장 60거래일 미만은 따로 보지 않는다 — 유니버스 `kr-universe@1` 이 250봉을 요구해 그 종목은 예측이 없다
- 투자주의(01)는 거르지 않는다 — 보고서 권고는 경고 · 위험부터다
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Literal

StatusReason = Literal["delisting_liquidation", "trading_halted", "administrative_issue", "investment_warning"]

# 시장경고 코드 — 00 없음 · 01 주의 · 02 경고 · 03 위험
_WARN_SUPPRESS = frozenset({"02", "03"})
# 마스터는 매일 동기화한다 — 사흘(주말 + 하루) 넘게 묵은 상태는 지금 상태로 보지 않는다
STATUS_MAX_AGE = timedelta(days=3)


@dataclass(frozen=True, slots=True)
class KrStatusFlags:
    liquidation: bool  # 정리매매
    halted: bool
    administrative: bool
    warn_code: str


def status_reason(f: KrStatusFlags) -> StatusReason | None:
    """여러 상태가 겹치면 가장 무거운 것 하나 — 정리매매 > 거래정지 > 관리종목 > 투자경고/위험."""
    if f.liquidation:
        return "delisting_liquidation"
    if f.halted:
        return "trading_halted"
    if f.administrative:
        return "administrative_issue"
    if f.warn_code in _WARN_SUPPRESS:
        return "investment_warning"
    return None


def status_known_at(synced_at: datetime | None, as_of: datetime) -> bool:
    """마스터 상태를 as_of 시점의 사실로 쓸 수 있나 — 그 전에 받았고(미래 정보 아님) 너무 묵지 않았다."""
    return synced_at is not None and synced_at <= as_of and as_of - synced_at <= STATUS_MAX_AGE
