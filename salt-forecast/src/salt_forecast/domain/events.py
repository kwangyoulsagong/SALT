"""주요 사건(거시 일정) 반응 — FC-REQ-005. 순수 계산, I/O 없음.

## 시각 규칙 (time-and-leakage.md §1)

- 기준 봉 = 발표 **전에 닫힌** 마지막 일봉(`available_at <= event_at`).
  발표가 든 봉의 종가를 기준으로 쓰면 반응 일부가 기준에 섞인다.
- h 일 반응 = 기준 봉에서 h 봉 뒤 종가. 그 봉이 `as_of` 에 닫혀 있어야 한다 — 아니면 `None`.
- 통계는 `as_of` 에 창이 닫힌 사건만. 빗나간 때는 각 사건을 **그 사건 전까지** 창이 닫힌 사건들로 채점한다.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.series import OhlcvSeries

KINDS = ("fomc", "cpi", "jobs")
HORIZONS = (1, 5, 20)
MIN_SAMPLE = 10
PRE_DAYS = 5
MISSES_KEPT = 3
RECENT_KEPT = 5

_ET = ZoneInfo("America/New_York")
# 발표 시각(동부). FOMC 성명 14:00, CPI · 고용보고서 08:30
_RELEASE_TIME = {"fomc": time(14, 0), "cpi": time(8, 30), "jobs": time(8, 30)}
# 일정이 공개된 시각의 보수 추정 — 실제로는 1년 전에 공개되지만 원문 시각이 없다(FC-REQ-005 FR-2)
ANNOUNCE_LEAD = timedelta(days=7)
_DAY = 86_400


@dataclass(frozen=True, slots=True)
class ScheduledEvent:
    kind: str
    event_at: datetime
    announced_at: datetime
    source: str
    source_ref: str


def scheduled(kind: str, day: date, source: str, source_ref: str) -> ScheduledEvent:
    """발표일 → 발표 시각(UTC). 서머타임은 zoneinfo 가 맞춘다."""
    local = datetime.combine(day, _RELEASE_TIME[kind], tzinfo=_ET)
    at = local.astimezone(UTC)
    return ScheduledEvent(kind, at, at - ANNOUNCE_LEAD, source, source_ref)


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


def _epoch(dt: datetime) -> int:
    return int(dt.timestamp())


def reaction(bars: OhlcvSeries, event: ScheduledEvent, as_of: datetime) -> Reaction | None:
    """기준 봉이 없으면(데이터 시작 전 사건) None."""
    avail = bars.available_at
    ev = _epoch(event.event_at)
    ref = int(np.searchsorted(avail, ev, side="right")) - 1
    if ref < 0:
        return None
    limit = _epoch(as_of)
    close = bars.close

    def ret(h: int) -> float | None:
        j = ref + h
        if j >= len(avail) or avail[j] > limit:
            return None
        return float(close[j] / close[ref] - 1.0)

    pre = float(close[ref] / close[ref - PRE_DAYS] - 1.0) if ref >= PRE_DAYS else None
    vol = bars.volume
    pre_vol: float | None = None
    if ref >= 22:
        recent = float(np.nanmean(vol[ref - 2 : ref + 1]))
        before = float(np.nanmean(vol[ref - 22 : ref - 2]))
        pre_vol = recent / before if before > 0 else None
    return Reaction(
        event.kind,
        event.event_at,
        bars.symbol,
        datetime.fromtimestamp(int(avail[ref]) - _DAY, UTC),
        ref,
        pre,
        pre_vol,
        {h: ret(h) for h in HORIZONS},
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


_QS = np.array([0.05, 0.25, 0.5, 0.75, 0.95])


def _closed_by(bars: OhlcvSeries, r: Reaction, h: int, at: int) -> bool:
    j = r.ref_index + h
    return j < len(bars.available_at) and int(bars.available_at[j]) <= at


def _baseline(bars: OhlcvSeries, start: int, h: int, at: int) -> NDArray[np.float64]:
    """평소 날의 h 일 수익률 — 같은 기간(첫 사건 기준 봉 ~ as_of), 창이 닫힌 것만. 겹치는 창을 그대로 쓴다."""
    avail, close = bars.available_at, bars.close
    end = int(np.searchsorted(avail, at, side="right")) - 1 - h
    if end < start:
        return np.empty(0)
    return close[start + h : end + h + 1] / close[start : end + 1] - 1.0


def stats(bars: OhlcvSeries, kind: str, reactions: Sequence[Reaction], h: int, as_of: datetime) -> ReactionStats:
    at = _epoch(as_of)
    done = sorted(
        (r for r in reactions if r.kind == kind and r.event_at <= as_of and _closed_by(bars, r, h, at)),
        key=lambda r: r.event_at,
    )
    realized = np.array([r.returns[h] for r in done], dtype=np.float64)

    misses: list[dict[str, object]] = []
    for i, r in enumerate(done):
        ev = _epoch(r.event_at)
        prior = np.array([p.returns[h] for p in done[:i] if _closed_by(bars, p, h, ev)], dtype=np.float64)
        if len(prior) < MIN_SAMPLE:
            continue
        lo, hi = (float(v) for v in np.quantile(prior, [0.05, 0.95]))
        value = float(realized[i])
        if value < lo or value > hi:
            misses.append({"eventAt": r.event_at.isoformat(), "realized": value, "low": lo, "high": hi})

    recent: list[dict[str, object]] = [
        {"eventAt": r.event_at.isoformat(), "realized": float(r.returns[h] or 0.0), "preReturn5d": r.pre_return_5d}
        for r in done[-RECENT_KEPT:]
    ]
    sample = len(done)
    blocked = "insufficient_sample" if sample < MIN_SAMPLE else ("failure_cases_missing" if not misses else None)
    if blocked is not None:
        return ReactionStats(
            kind, bars.symbol, h, as_of, sample, None, None, None, None, None, [], recent, False, blocked
        )

    base = _baseline(bars, min(r.ref_index for r in done), h, at)
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
    )
