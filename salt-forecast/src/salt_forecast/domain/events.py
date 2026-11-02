"""주요 사건(거시 일정) 반응 — FC-REQ-005 · 국내 일정 FC-REQ-021. 순수 계산, I/O 없음.

## 시각 규칙 (time-and-leakage.md §1)

- 기준 봉 = 발표 **전에 닫힌** 마지막 일봉(`available_at <= event_at`).
  발표가 든 봉의 종가를 기준으로 쓰면 반응 일부가 기준에 섞인다.
- h 일 반응 = 기준 봉에서 h 봉 뒤 종가. 그 봉이 `as_of` 에 닫혀 있어야 한다 — 아니면 `None`.
- 통계는 `as_of` 에 창이 닫힌 사건만. 빗나간 때는 각 사건을 **그 사건 전까지** 창이 닫힌 사건들로 채점한다.
- 국내 일봉은 16:00 KST 에 닫힌다(`KRX_CLOSE_AVAILABLE`) — 장중 발표(금통위 10:00)든 장 전 발표(물가 08:00)든
  기준은 전 거래일 종가, 첫 반응 봉은 발표가 든 거래일. 미국 발표(국내 새벽)는 다음 국내 거래일이
  첫 반응 봉이다(FC-REQ-021 FR-5 · 8).
- 국내 원천 끊김(`domain/kr_breaks`) 을 걸친 수익률은 쓰지 않는다 — `break_cum` 을 넘기면 그 창은 None,
  평소 분포에서도 빠진다.
"""

from __future__ import annotations

import calendar
from collections.abc import Collection, Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.series import OhlcvSeries

KINDS = ("fomc", "cpi", "jobs")
# 국내 시장 일정 4종(FC-REQ-021 FR-1). 종목 사건(kr_earnings · kr_ir)은 2단계
KR_KINDS = ("kr_bok_rate", "kr_cpi", "kr_trade", "kr_quad_expiry")
HORIZONS = (1, 5, 20)
MIN_SAMPLE = 10
PRE_DAYS = 5
MISSES_KEPT = 3
RECENT_KEPT = 5

_ET = ZoneInfo("America/New_York")
KST = ZoneInfo("Asia/Seoul")
# 발표 시각. FOMC 성명 14:00 · CPI · 고용보고서 08:30(동부).
# 국내(FC-REQ-021 FR-3): 금통위 결정 10:00(원문 시각이 없어 늦은 쪽) · 소비자물가동향 08:00(보도계획 원문) ·
# 수출입동향 09:00(매월 1일 보도 관례) · 동시만기는 그날 장 전체가 사건이라 장 시작 09:00 — 기준이 전 거래일 종가가 된다
_RELEASE_AT: dict[str, tuple[ZoneInfo, time]] = {
    "fomc": (_ET, time(14, 0)),
    "cpi": (_ET, time(8, 30)),
    "jobs": (_ET, time(8, 30)),
    "kr_bok_rate": (KST, time(10, 0)),
    "kr_cpi": (KST, time(8, 0)),
    "kr_trade": (KST, time(9, 0)),
    "kr_quad_expiry": (KST, time(9, 0)),
}
# 일정이 공개된 시각의 보수 추정 — 실제로는 1년 전에 공개되지만 원문 시각이 없다(FC-REQ-005 FR-2)
ANNOUNCE_LEAD = timedelta(days=7)
# 규칙으로 정해지는 일정(수출입 매월 1일 · 동시만기 둘째 목요일)은 30일 전(FC-REQ-021 FR-4)
RULE_ANNOUNCE_LEAD = timedelta(days=30)
_RULE_KINDS = frozenset({"kr_trade", "kr_quad_expiry"})
_DAY = 86_400


@dataclass(frozen=True, slots=True)
class ScheduledEvent:
    kind: str
    event_at: datetime
    announced_at: datetime
    source: str
    source_ref: str
    # 시장 일정 = '' · 종목 사건(2단계) = 종목 코드(DB-REQ-034 FR-2)
    symbol: str = ""


def region(kind: str) -> str:
    return "kr" if kind.startswith("kr_") else "us"


def scheduled(kind: str, day: date, source: str, source_ref: str) -> ScheduledEvent:
    """발표일 → 발표 시각(UTC). 서머타임은 zoneinfo 가 맞춘다."""
    tz, at_time = _RELEASE_AT[kind]
    at = datetime.combine(day, at_time, tzinfo=tz).astimezone(UTC)
    lead = RULE_ANNOUNCE_LEAD if kind in _RULE_KINDS else ANNOUNCE_LEAD
    return ScheduledEvent(kind, at, at - lead, source, source_ref)


def first_of_months(start: date, end: date) -> list[date]:
    """[start, end] 안의 매월 1일 — 수출입동향 보도일(2018-02 ~ 2026-11 보도자료 등록일 전수가 1일, FC-REQ-021 Q2)."""
    out: list[date] = []
    y, m = start.year, start.month
    while True:
        d = date(y, m, 1)
        if d > end:
            return out
        if d >= start:
            out.append(d)
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)


def quad_expiry_days(start: date, end: date, closed: Collection[date]) -> list[date]:
    """3 · 6 · 9 · 12월 둘째 목요일, 휴장이면 직전 거래일(주말 · `closed` 를 건너뛴다)."""
    out: list[date] = []
    for y in range(start.year, end.year + 1):
        for m in (3, 6, 9, 12):
            first_weekday = calendar.weekday(y, m, 1)
            d = date(y, m, 1 + (3 - first_weekday) % 7 + 7)
            while d.weekday() >= 5 or d in closed:
                d -= timedelta(days=1)
            if start <= d <= end:
                out.append(d)
    return out


@dataclass(frozen=True, slots=True)
class Reaction:
    kind: str
    event_at: datetime
    symbol: str
    ref_bar_open: datetime
    ref_index: int
    pre_return_5d: float | None
    pre_volume_ratio: float | None
    returns: dict[int, float | None]
    # 사건의 종목(시장 일정 '') — 반응 종목(`symbol`)과 다르다(DB-REQ-034 FR-2)
    event_symbol: str = ""


def _epoch(dt: datetime) -> int:
    return int(dt.timestamp())


def _crosses(break_cum: NDArray[np.int64] | None, a: int, b: int) -> bool:
    """봉 (a, b] 사이에 원천 끊김이 있나. break_cum[i] = 봉 0..i 의 끊김 수(`kr_breaks.up_limit_breaks` 의 누적합)."""
    return break_cum is not None and int(break_cum[b]) > int(break_cum[a])


def reaction(
    bars: OhlcvSeries, event: ScheduledEvent, as_of: datetime, break_cum: NDArray[np.int64] | None = None
) -> Reaction | None:
    """기준 봉이 없으면(데이터 시작 전 사건) None. 끊김을 걸친 수익률은 None(국내 — FC-REQ-020 FR-10)."""
    avail = bars.available_at
    ev = _epoch(event.event_at)
    ref = int(np.searchsorted(avail, ev, side="right")) - 1
    if ref < 0:
        return None
    limit = _epoch(as_of)
    close = bars.close

    def ret(h: int) -> float | None:
        j = ref + h
        if j >= len(avail) or avail[j] > limit or _crosses(break_cum, ref, j):
            return None
        return float(close[j] / close[ref] - 1.0)

    pre = (
        float(close[ref] / close[ref - PRE_DAYS] - 1.0)
        if ref >= PRE_DAYS and not _crosses(break_cum, ref - PRE_DAYS, ref)
        else None
    )
    vol = bars.volume
    pre_vol: float | None = None
    # 거래량이 없는 시계열(국내 시장 대용 KR-EW)은 비를 내지 않는다
    if ref >= 22 and not np.isnan(vol[ref - 22 : ref + 1]).all():
        recent = float(np.nanmean(vol[ref - 2 : ref + 1])) if not np.isnan(vol[ref - 2 : ref + 1]).all() else 0.0
        before = float(np.nanmean(vol[ref - 22 : ref - 2])) if not np.isnan(vol[ref - 22 : ref - 2]).all() else 0.0
        pre_vol = recent / before if before > 0 else None
    return Reaction(
        event.kind,
        event.event_at,
        bars.symbol,
        # 봉 시작(UTC 날짜) — 업비트는 다음 날 00:00, 국내는 그날 07:00 에 닫힌다. 마감 1초 전의 날짜가 둘 다 맞다
        datetime.fromtimestamp((int(avail[ref]) - 1) // _DAY * _DAY, UTC),
        ref,
        pre,
        pre_vol,
        {h: ret(h) for h in HORIZONS},
        event.symbol,
    )


@dataclass(frozen=True, slots=True)
class ReactionStats:
    kind: str
    symbol: str
    horizon_days: int
    as_of: datetime
    sample: int
    quantiles: tuple[float, float, float, float, float] | None
    up_rate: float | None
    baseline: tuple[float, float, float] | None
    move_ratio: float | None
    pre_return_5d_median: float | None
    recent_misses: list[dict[str, object]]
    recent_events: list[dict[str, object]]
    renderable: bool
    blocked_reason: str | None
    # 성적 문구 4요소(F009 FR-33) — 표본 사건의 첫 · 마지막 시각, 빗나간 수 전체
    # (`recent_misses` 는 최근 MISSES_KEPT 개뿐)와 그 판정 대상 수(앞 사건이 MIN_SAMPLE 개 이상일 때만 판정한다)
    window_from: datetime | None = None
    window_to: datetime | None = None
    miss_count: int | None = None
    miss_judged: int | None = None


_QS = np.array([0.05, 0.25, 0.5, 0.75, 0.95])


def _closed_by(bars: OhlcvSeries, r: Reaction, h: int, at: int) -> bool:
    j = r.ref_index + h
    return j < len(bars.available_at) and int(bars.available_at[j]) <= at and r.returns[h] is not None


def _baseline(
    bars: OhlcvSeries, start: int, h: int, at: int, break_cum: NDArray[np.int64] | None = None
) -> NDArray[np.float64]:
    """평소 날의 h 일 수익률 — 같은 기간(첫 사건 기준 봉 ~ as_of), 창이 닫힌 것만. 겹치는 창을 그대로 쓴다.
    끊김을 걸친 창은 뺀다 — ×5 · ×10 병합이 평소 분포 꼬리가 되면 사건이 조용해 보인다."""
    avail, close = bars.available_at, bars.close
    end = int(np.searchsorted(avail, at, side="right")) - 1 - h
    if end < start:
        return np.empty(0)
    out = close[start + h : end + h + 1] / close[start : end + 1] - 1.0
    if break_cum is None:
        return out
    clean = break_cum[start + h : end + h + 1] == break_cum[start : end + 1]
    return out[clean]


def stats(
    bars: OhlcvSeries,
    kind: str,
    reactions: Sequence[Reaction],
    h: int,
    as_of: datetime,
    break_cum: NDArray[np.int64] | None = None,
) -> ReactionStats:
    at = _epoch(as_of)
    done = sorted(
        (r for r in reactions if r.kind == kind and r.event_at <= as_of and _closed_by(bars, r, h, at)),
        key=lambda r: r.event_at,
    )
    realized = np.array([r.returns[h] for r in done], dtype=np.float64)

    misses: list[dict[str, object]] = []
    judged = 0
    for i, r in enumerate(done):
        ev = _epoch(r.event_at)
        prior = np.array([p.returns[h] for p in done[:i] if _closed_by(bars, p, h, ev)], dtype=np.float64)
        if len(prior) < MIN_SAMPLE:
            continue
        judged += 1
        lo, hi = (float(v) for v in np.quantile(prior, [0.05, 0.95]))
        value = float(realized[i])
        if value < lo or value > hi:
            misses.append({"eventAt": r.event_at.isoformat(), "realized": value, "low": lo, "high": hi})

    recent: list[dict[str, object]] = [
        {"eventAt": r.event_at.isoformat(), "realized": float(r.returns[h] or 0.0), "preReturn5d": r.pre_return_5d}
        for r in done[-RECENT_KEPT:]
    ]
    sample = len(done)
    claim = (
        done[0].event_at if done else None,
        done[-1].event_at if done else None,
        len(misses),
        judged,
    )
    blocked = "insufficient_sample" if sample < MIN_SAMPLE else ("failure_cases_missing" if not misses else None)
    if blocked is not None:
        return ReactionStats(
            kind, bars.symbol, h, as_of, sample, None, None, None, None, None, [], recent, False, blocked, *claim
        )

    base = _baseline(bars, min(r.ref_index for r in done), h, at, break_cum)
    q = np.quantile(realized, _QS)
    base_q: tuple[float, float, float] | None = None
    if len(base):
        b05, b50, b95 = (float(v) for v in np.quantile(base, [0.05, 0.5, 0.95]))
        base_q = (b05, b50, b95)
    base_abs = float(np.median(np.abs(base))) if len(base) else 0.0
    pres = [r.pre_return_5d for r in done if r.pre_return_5d is not None]
    return ReactionStats(
        kind,
        bars.symbol,
        h,
        as_of,
        sample,
        (float(q[0]), float(q[1]), float(q[2]), float(q[3]), float(q[4])),
        float(np.mean(realized > 0)),
        base_q,
        float(np.median(np.abs(realized)) / base_abs) if base_abs > 0 else None,
        float(np.median(pres)) if pres else None,
        misses[-MISSES_KEPT:],
        recent,
        True,
        None,
        *claim,
    )
