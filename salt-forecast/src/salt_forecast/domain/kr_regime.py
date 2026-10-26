"""국내 주식 국면 구간 — 커버리지 점검용 날짜 라벨(FC-REQ-020 FR-14).

경계는 **결과를 보기 전에** 공개 일정으로만 정했다(2026-10-26). 모델 · 게이트 입력이 아니라 리포트 표를 자르는
데만 쓴다 — 지금 아는 사건으로 과거를 고르는 것이라 피처로 쓰면 누수다(time-and-leakage.md §2).

- 공매도 전면 금지: 2023-11-06(월) ~ 2025-03-30. 2025-03-31 전 종목 재개
- 2026 고변동: 2026-01-01 ~. KOSPI 사이드카 37회 · 서킷브레이커 7~8회(7월 말 기준, 리서치 보고서 §국면) —
  발동일만 고르면 표본이 수십 주라 연 단위로 둔다
- 평시: 나머지(2025-03-31 ~ 2025-12-31 과 2023-11-05 이전)

as_of 는 그 주 첫 거래일 09:00 KST 다. 라벨(h주)이 경계를 넘어도 as_of 날짜로 가른다.
"""

from __future__ import annotations

from datetime import UTC, date, datetime

SHORT_BAN = "공매도 금지"
HIGH_VOL_2026 = "2026 고변동"
NORMAL = "평시"
REGIMES: tuple[str, ...] = (NORMAL, SHORT_BAN, HIGH_VOL_2026)

SHORT_BAN_START = date(2023, 11, 6)
SHORT_BAN_END = date(2025, 3, 30)
HIGH_VOL_START = date(2026, 1, 1)


def kr_regime(as_of: int) -> str:
    """as_of(UTC 초)가 속한 국면."""
    d = datetime.fromtimestamp(as_of, tz=UTC).date()
    if d >= HIGH_VOL_START:
        return HIGH_VOL_2026
    if SHORT_BAN_START <= d <= SHORT_BAN_END:
        return SHORT_BAN
    return NORMAL
