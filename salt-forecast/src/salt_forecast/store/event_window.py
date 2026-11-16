"""사건 반응 창 · 선반영 삼분위 읽기 · 쓰기(FC-REQ-028 FR-8 · DB-REQ-043 FR-13)."""

from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy import Engine, delete, text

from salt_forecast.domain.event_window import EventRow, WindowStat
from salt_forecast.store.bulk import bulk_upsert
from salt_forecast.store.news_reaction import RawTitle
from salt_forecast.store.tables import event_window, event_window_stat

_KST = timedelta(hours=9)


def dart_published(first_seen_at: datetime, rcept_date: date) -> datetime:
    """게시 시각 = min(서버가 처음 본 시각, 접수일 23:59:59 KST) — 사전등록 event-window@2 [sources] dart.

    1년 백필분은 처음 본 시각이 백필 날이라 그대로면 한 해가 하루에 몰린다(@1 첫 실행 3,458/3,461).
    접수일 끝은 그날 공시가 늦어도 공개된 시각 — 보수적(실제보다 이르게 잡지 않는다)."""
    day_end = datetime(rcept_date.year, rcept_date.month, rcept_date.day, 23, 59, 59, tzinfo=UTC) - _KST
    return min(first_seen_at.astimezone(UTC), day_end)


def load_dart_titles(engine: Engine, *, as_of: datetime) -> list[RawTitle]:
    """DART 공시 — export 뷰로만. 출처 `dart`. 게시 시각은 `dart_published`, as_of 뒤 게시는 뺀다."""
    sql = text("SELECT report_name, stock_code, first_seen_at, rcept_date FROM public.v_dart_filing_export")
    with engine.connect() as conn:
        rows = conn.execute(sql).all()
    out = [RawTitle("dart", str(r[0]), (str(r[1]),), dart_published(r[2], r[3])) for r in rows]
    return [t for t in out if t.published_at <= as_of]


def _ts(t: int) -> datetime:
    return datetime.fromtimestamp(t, UTC)


def _f(x: float) -> float | None:
    return None if x != x else x  # NaN → NULL


_WIN_COLS = (
    "prereg_key", "market", "origin", "kind", "symbol", "ref_at", "published_at", "pre20", "pre5", "pre1", "post30m",
    "post1", "post5", "tercile", "computed_at",
)  # fmt: skip
_WIN_PK = ("prereg_key", "market", "origin", "kind", "symbol", "ref_at")
_STAT_COLS = (
    "prereg_key", "market", "origin", "kind", "tercile", "horizon", "as_of", "status", "sample", "sample_eff",
    "sample_days", "up_rate", "up_low", "up_high", "mean", "q10", "q50", "q90", "pre5_median", "base_up_rate",
    "p_holm", "differs", "pre_low_max", "pre_high_min", "window_from", "window_to", "computed_at",
)  # fmt: skip
_STAT_PK = ("prereg_key", "market", "origin", "kind", "tercile", "horizon", "as_of")


def save_run(
    engine: Engine,
    key: str,
    market: str,
    as_of: datetime,
    computed_at: datetime,
    rows: Sequence[EventRow],
    stats: Sequence[WindowStat],
) -> int:
    """사건 행은 그 키 · 시장을 통째로 바꾸고, 통계는 쌓는다.

    창 값은 봉 마감 뒤 안 바뀌고 사전 · 거름도 같은 키 안에서 같다 — 통째로 바꿔도 이력이 사라지지 않는다."""
    win: list[Sequence[Any]] = [
        (
            key, market, r.origin, r.kind, r.symbol, _ts(r.ref_t), _ts(r.published), _f(r.pre20), _f(r.pre5),
            _f(r.pre1), _f(r.post30m), _f(r.post1), _f(r.post5), r.tercile, computed_at,
        )
        for r in rows
    ]  # fmt: skip
    st: list[Sequence[Any]] = [
        (
            key, s.market, s.origin, s.kind, s.tercile, s.horizon, as_of, s.status, s.sample, s.sample_eff,
            s.sample_days, s.up_rate, s.up_low, s.up_high, s.mean, s.q10, s.q50, s.q90, s.pre5_median, s.base_up_rate,
            s.p_holm, s.differs, s.pre_low_max, s.pre_high_min, s.window_from, s.window_to, computed_at,
        )
        for s in stats
    ]  # fmt: skip
    c = event_window.c
    with engine.begin() as conn:
        conn.execute(delete(event_window).where(c.prereg_key == key, c.market == market))
    n = bulk_upsert(engine, event_window, _WIN_COLS, win, _WIN_PK)
    return n + bulk_upsert(engine, event_window_stat, _STAT_COLS, st, _STAT_PK)
