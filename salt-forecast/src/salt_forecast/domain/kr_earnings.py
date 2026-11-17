"""종목 실적 공시 사건 · 다음 실적 공시 예상 창 — FC-REQ-021 FR-11~15 (F008 슬라이스 24 2단계). 순수 계산, I/O 없음.

## 사건

- `kr_earnings` = 결산 기간 하나에 **실적 숫자가 처음 공개된 공시**
  (잠정실적 · 손익구조 변경 · 분기 · 반기 · 사업보고서 중 가장 이른 것).
  공시 목록은 접수 **날짜**만 준다. 반응 기준은 사건 연구 관례대로 **공시일 전 거래일 종가**
  (`event_at` = 접수일 00:00 KST) — 장 전 잠정실적(삼성전자)의 반응이 하루 밀리지 않게.
  기준 봉이 공시보다 앞이라 미래 정보가 섞이지 않는다. 알게 된 시각(`announced_at`)은 게시 시각 규칙
  (`store.event_window.dart_published` — 처음 본 시각 · 접수일 끝 중 이른 쪽)
- `kr_ir` = **확정 실적 발표 일정** — 실적 IR(본문 목적이 실적 발표) · 결산실적공시 예고.
  일정만 쓴다(반응은 `kr_earnings` 가 잰다)

## 예상 창 (FR-14)

- 다음에 공시될 결산 = as_of 날짜 이전 마지막 분기 끝, 그 결산 공시가 이미 있으면 그다음 분기 끝
- 같은 유형(연간 = 결산 월이 사업연도 끝 월 · 나머지 분기)의 과거 '결산일 → 첫 공시' 일수의 최소 · 중앙 · 최대 → 창
- **채점** — 과거 결산마다 그 전에 알려진 같은 유형 일수만으로 만든 창에 실제 일수가 들었나(워크포워드).
  표본 < `MIN_SAMPLE` 이면 판정하지 않는다
- 기준 = 법정 제출 기한(분기 · 반기 +45 · 사업연도 +90일). 한 날짜로 찍지 않는다 — 확정 일정이 있으면 창 대신 그 날
"""

from __future__ import annotations

import re
import statistics
from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from salt_forecast.domain.events import ScheduledEvent

KST = ZoneInfo("Asia/Seoul")
# 창 · 판정에 쓰는 최소 표본 — 2016~ 이력이면 연간 10 · 분기 30 안팎.
# 연간도 판정할 수 있는 값(SRV-REQ-041 FR-4 의 8 → 5 정정)
MIN_SAMPLE = 5
# 렌더하려면 판정된 결산이 이만큼 — 적중률이 '0/0' 이면 3종 중 채점 이력이 비어 있다
MIN_JUDGED = 3
MISSES_KEPT = 3
# 반응을 재는 종목 사건 — `kr_ir` 은 일정만(같은 결산의 반응은 `kr_earnings` 가 잰다, FR-11 정정)
SYMBOL_KINDS = ("kr_earnings",)
INTERIM_DEADLINE = 45
ANNUAL_DEADLINE = 90
# 확정 일정으로 볼 범위 — 결산 끝 뒤 이 안의 실적 일정만 그 결산의 것
CONFIRM_SPAN = timedelta(days=120)

# 같은 이름 공시가 1년(365일) 안에 **서로 다른 달** 이만큼에 나오면 월간 공시다.
# 현대차는 월 판매를 분기 실적과 같은 이름 "영업(잠정)실적(공정공시)" 으로 매달 낸다(2026 실측 12개 달).
# 건수로 세면 안 된다 — 삼성전자 · POSCO 는 분기마다 잠정 · 확정 두 번(연 8건)이지만 네 달뿐(2026-11-17 첫 판 결함)
MONTHLY_PER_YEAR = 8
_ANNUAL_REPORT = re.compile(r"사업보고서\s*\((\d{4})\.(\d{2})\)")
_PROFIT_CHANGE = re.compile(r"매출액\s*또는\s*손익구조")


@dataclass(frozen=True, slots=True)
class EarningsFiling:
    """export 뷰 한 행(`public.v_dart_earnings_export`) — 게시 시각은 store 가 계산해 넣는다."""

    rcept_no: str
    symbol: str
    kind: str  # earnings | ir | preview
    report_name: str
    rcept_date: date
    published_at: datetime
    period_end: date | None
    scheduled_at: datetime | None
    time_known: bool | None
    about_earnings: bool | None
    doc_ok: bool


@dataclass(frozen=True, slots=True)
class EarningsEvent:
    symbol: str
    period_end: date
    annual: bool
    rcept_date: date
    published_at: datetime
    rcept_no: str

    @property
    def lag_days(self) -> int:
        return (self.rcept_date - self.period_end).days


@dataclass(frozen=True, slots=True)
class ConfirmedSchedule:
    symbol: str
    at: datetime
    time_known: bool
    source: str  # ir | preview
    announced_at: datetime
    period_end: date | None
    rcept_no: str


@dataclass(frozen=True, slots=True)
class EarningsWindow:
    symbol: str
    as_of: datetime
    period_end: date
    annual: bool
    lag_min: int | None
    lag_median: int | None
    lag_max: int | None
    sample: int
    window_from: date | None
    window_to: date | None
    deadline: date
    hits: int
    judged: int
    misses: list[dict[str, object]] = field(default_factory=list[dict[str, object]])
    confirmed: ConfirmedSchedule | None = None
    renderable: bool = False
    blocked_reason: str | None = None


def quarter_ends_before(d: date) -> date:
    """d 보다 이른 마지막 분기 끝(3 · 6 · 9 · 12월 말)."""
    return max(e for y in (d.year - 1, d.year) for m in (3, 6, 9, 12) if (e := _month_end(y, m)) < d)


def next_quarter_end(d: date) -> date:
    m = d.month + 3
    y = d.year + (m - 1) // 12
    return _month_end(y, (m - 1) % 12 + 1)


def _month_end(y: int, m: int) -> date:
    return (date(y + (m // 12), m % 12 + 1, 1)) - timedelta(days=1)


def fiscal_end_month(filings: Sequence[EarningsFiling]) -> int:
    """사업연도 끝 월 — 가장 최근 사업보고서 이름의 결산 월. 없으면 12."""
    best: tuple[date, int] | None = None
    for f in filings:
        m = _ANNUAL_REPORT.search(f.report_name)
        if m and (best is None or f.rcept_date > best[0]):
            best = (f.rcept_date, int(m.group(2)))
    return best[1] if best else 12


def _period_of(f: EarningsFiling, fy_month: int) -> date:
    if f.period_end is not None:
        return f.period_end
    q = quarter_ends_before(f.rcept_date)
    if _PROFIT_CHANGE.search(f.report_name):
        # 손익구조 변경은 사업연도 실적 — 접수일 전 마지막 사업연도 끝
        while q.month != fy_month:
            q = quarter_ends_before(q)
    return q


def _norm(name: str) -> str:
    return re.sub(r"\s+", "", name)


def monthly_names(filings: Sequence[EarningsFiling]) -> set[str]:
    """월간으로 나오는 공시 이름(공백 없앤 것) — 받은 공시 안에서만 센다(as-of 안전)."""
    by_name: dict[str, list[date]] = {}
    for f in filings:
        if f.kind == "earnings" and f.period_end is None:
            by_name.setdefault(_norm(f.report_name), []).append(f.rcept_date)
    out: set[str] = set()
    for name, days in by_name.items():
        days.sort()
        for i, d in enumerate(days):
            months = {(x.year, x.month) for x in days[i:] if (x - d).days < 365}
            if len(months) >= MONTHLY_PER_YEAR:
                out.add(name)
                break
    return out


def earnings_events(filings: Sequence[EarningsFiling]) -> list[EarningsEvent]:
    """한 종목의 실적 공시 → 결산마다 가장 이른 공시 하나. 월간 공시(월 판매 등)는 뺀다. 결산 순."""
    fy = fiscal_end_month(filings)
    monthly = monthly_names(filings)
    first: dict[date, EarningsFiling] = {}
    for f in filings:
        if f.kind != "earnings" or _norm(f.report_name) in monthly:
            continue
        p = _period_of(f, fy)
        cur = first.get(p)
        if cur is None or (f.rcept_date, f.rcept_no) < (cur.rcept_date, cur.rcept_no):
            first[p] = f
    out = [
        EarningsEvent(f.symbol, p, p.month == fy, f.rcept_date, f.published_at, f.rcept_no)
        for p, f in first.items()
        if f.rcept_date > p
    ]
    return sorted(out, key=lambda e: e.period_end)


def confirmed_schedules(filings: Sequence[EarningsFiling]) -> list[ConfirmedSchedule]:
    """본문을 읽은 실적 IR · 예고 → 확정 일정. 같은 종목 · 같은 KST 날짜는 하나 —
    시각을 아는 것, 그다음 **먼저 알린 것**(그 날은 첫 공시부터 알려져 있었다).
    일정 뒤에 낸 공시(당일 정정 — SK하이닉스 2026-10-28)는 일정이 아니다."""
    out: dict[tuple[str, date], ConfirmedSchedule] = {}
    for f in filings:
        if f.kind not in ("ir", "preview") or not f.doc_ok or f.scheduled_at is None or not f.about_earnings:
            continue
        if f.published_at > f.scheduled_at:
            continue
        local = f.scheduled_at.astimezone(KST)
        c = ConfirmedSchedule(
            f.symbol, f.scheduled_at, bool(f.time_known), f.kind, f.published_at, f.period_end, f.rcept_no
        )
        key = (f.symbol, local.date())
        cur = out.get(key)
        if cur is None or (not c.time_known, c.announced_at) < (not cur.time_known, cur.announced_at):
            out[key] = c
    return sorted(out.values(), key=lambda c: (c.symbol, c.at))


def to_scheduled_events(
    events: Sequence[EarningsEvent], confirmed: Sequence[ConfirmedSchedule]
) -> list[ScheduledEvent]:
    """`forecast.scheduled_event` 행 — 종목 사건(`symbol` 이 채워진다, DB-REQ-034 FR-2)."""
    # event_at = announced_at = 게시 시각(scheduled_event CHECK announced_at <= event_at). 반응 기준은 `reaction_anchor`
    out = [ScheduledEvent("kr_earnings", e.published_at, e.published_at, "dart", e.rcept_no, e.symbol) for e in events]
    out += [ScheduledEvent("kr_ir", c.at, c.announced_at, f"dart_{c.source}", c.rcept_no, c.symbol) for c in confirmed]
    return out


def reaction_anchor(event: ScheduledEvent) -> datetime | None:
    """실적 공시 반응의 기준 시각 = 접수일 00:00 KST → 기준 봉은 공시일 전 거래일 종가(FR-12 정정).

    목록에 접수 시각이 없어 게시 시각(그날 끝)으로 기준을 잡으면 장 전 잠정실적의 반응이 하루 밀린다.
    다른 종류는 None(그대로)."""
    if event.kind != "kr_earnings":
        return None
    day = event.event_at.astimezone(KST).date()
    return datetime.combine(day, time(0, 0), tzinfo=KST).astimezone(UTC)


def _kst_date(at: datetime) -> date:
    return at.astimezone(KST).date()


def window(
    symbol: str,
    as_of: datetime,
    events: Sequence[EarningsEvent],
    confirmed: Sequence[ConfirmedSchedule],
    fy_month: int,
) -> EarningsWindow:
    """as_of 에 알 수 있던 공시만으로 다음 결산의 예상 창 · 채점 · 확정 일정."""
    today = _kst_date(as_of)
    known = [e for e in events if e.published_at <= as_of]
    reported = {e.period_end for e in known}
    target = quarter_ends_before(today + timedelta(days=1))
    if target in reported:
        target = next_quarter_end(target)
    annual = target.month == fy_month
    deadline = target + timedelta(days=ANNUAL_DEADLINE if annual else INTERIM_DEADLINE)

    same = sorted((e for e in known if e.annual == annual), key=lambda e: e.published_at)
    lags = [e.lag_days for e in same]
    hits = judged = 0
    misses: list[dict[str, object]] = []
    for i, e in enumerate(same):
        prior = [p.lag_days for p in same[:i] if p.published_at < e.published_at]
        if len(prior) < MIN_SAMPLE:
            continue
        judged += 1
        lo, hi = min(prior), max(prior)
        if lo <= e.lag_days <= hi:
            hits += 1
        else:
            misses.append(
                {
                    "periodEnd": e.period_end.isoformat(),
                    "actual": e.rcept_date.isoformat(),
                    "from": (e.period_end + timedelta(days=lo)).isoformat(),
                    "to": (e.period_end + timedelta(days=hi)).isoformat(),
                }
            )

    sure = [
        c
        for c in confirmed
        if c.announced_at <= as_of
        and c.at >= as_of
        and target <= _kst_date(c.at) <= target + CONFIRM_SPAN
        and (c.period_end is None or c.period_end == target)
    ]
    conf = min(sure, key=lambda c: c.at) if sure else None

    sample = len(lags)
    lo = min(lags) if lags else None
    hi = max(lags) if lags else None
    med = int(statistics.median_low(lags)) if lags else None
    w_from = target + timedelta(days=lo) if lo is not None else None
    w_to = target + timedelta(days=hi) if hi is not None else None
    blocked: str | None = None
    if sample < MIN_SAMPLE:
        blocked = "insufficient_sample"
    elif judged < MIN_JUDGED:
        blocked = "not_judged"
    elif w_to is not None and today > w_to:
        # 창이 지났는데 공시가 없다 — 늦어지는 중. 지난 창을 '예상'으로 보이지 않는다
        blocked = "window_passed"
    return EarningsWindow(
        symbol,
        as_of,
        target,
        annual,
        lo,
        med,
        hi,
        sample,
        w_from,
        w_to,
        deadline,
        hits,
        judged,
        misses[-MISSES_KEPT:],
        conf,
        blocked is None,
        blocked,
    )
