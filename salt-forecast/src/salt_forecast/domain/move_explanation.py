"""오늘 등락 한 줄(③) 운영 측정 — FC-REQ-027 FR-4~6 · F016 단계 D.

켜기 문턱이 아니다(2026-11-06 사용자 결정). 쓰면서 재고, **나빠짐 기준**에 닿으면
끄기(서버 `MOVE_SUMMARY=off`)를 검토한다.
기준은 이 파일 상수 하나 — 리포트에 그대로 적는다(숫자를 보고 기준을 바꾸지 않게, 바꾸면 커밋 본문에 이유).

자동으로 잴 수 있는 것만 여기서 센다: 게이트 분포 · 걸린 사유 · 인용 수 · 인용 덮기(인용 / 넣은 사실).
충실도(문장이 사실과 맞나) · 인과 단정 · 지어냄은 사람이 표시한다(`label_sample` 양식).
"소식 없음" 정직률은 조용한 날 문장을 저장하지 않아(요청 때 같은 규칙으로
정한다 — 서버 `moveQuietReason`) 이 뷰로는 못 잰다 — 규칙이 결정적이라 서버 경계 표 테스트가 그 몫이다.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime

# 나빠짐 기준(FR-6) — 한 주 시도가 이만큼 이상일 때만 판정(적으면 몇 건 실패가 비율을 흔든다)
WORSE_MIN_ATTEMPTS = 10
# 검사가 막은 비율(no_citation + guard_blocked)이 이보다 크면 "나빠짐"
# — 모델이 규칙을 못 따르거나 사실이 인용하기 어려운 모양이다
WORSE_BLOCKED_SHARE = 0.30
# 사람 표시 양식에 싣는 성공 문장 수
LABEL_SAMPLE = 10


@dataclass(frozen=True)
class Attempt:
    asset: str
    symbol: str
    trade_date: str
    gate: str
    text: str | None
    citations: tuple[str, ...]
    fact_count: int
    rejections: tuple[str, ...]
    provider: str
    generated_at: datetime


@dataclass(frozen=True)
class AssetSummary:
    asset: str
    attempts: int
    ok: int
    no_citation: int
    guard_blocked: int
    mean_citations: float | None
    """성공 문장의 평균 인용 수"""
    coverage: float | None
    """성공 문장의 인용 / 넣은 사실 평균 — 낮으면 사실 대부분을 뺀 문장"""
    rejections: tuple[tuple[str, int], ...]
    providers: tuple[tuple[str, int], ...]

    @property
    def blocked_share(self) -> float | None:
        return None if self.attempts == 0 else (self.no_citation + self.guard_blocked) / self.attempts

    @property
    def worsened(self) -> bool | None:
        """`None` = 시도가 적어 판정 안 함"""
        share = self.blocked_share
        if self.attempts < WORSE_MIN_ATTEMPTS or share is None:
            return None
        return share > WORSE_BLOCKED_SHARE


def _mean(xs: Sequence[float]) -> float | None:
    return None if not xs else sum(xs) / len(xs)


def summarize(attempts: Sequence[Attempt]) -> list[AssetSummary]:
    out: list[AssetSummary] = []
    for asset in sorted({a.asset for a in attempts}):
        mine = [a for a in attempts if a.asset == asset]
        ok = [a for a in mine if a.gate == "ok"]
        out.append(
            AssetSummary(
                asset=asset,
                attempts=len(mine),
                ok=len(ok),
                no_citation=sum(a.gate == "no_citation" for a in mine),
                guard_blocked=sum(a.gate == "guard_blocked" for a in mine),
                mean_citations=_mean([float(len(a.citations)) for a in ok]),
                coverage=_mean([len(a.citations) / a.fact_count for a in ok if a.fact_count > 0]),
                rejections=tuple(Counter(r for a in mine for r in a.rejections).most_common()),
                providers=tuple(Counter(a.provider for a in mine).most_common()),
            )
        )
    return out


def label_sample(attempts: Sequence[Attempt], k: int = LABEL_SAMPLE) -> list[Attempt]:
    """사람 표시용 성공 문장 — 시각순에서 고르게 k 개(난수 0 — 같은 주면 같은 표본)."""
    ok = sorted((a for a in attempts if a.gate == "ok"), key=lambda a: (a.generated_at, a.symbol))
    if len(ok) <= k:
        return ok
    step = len(ok) / k
    return [ok[int(i * step)] for i in range(k)]
