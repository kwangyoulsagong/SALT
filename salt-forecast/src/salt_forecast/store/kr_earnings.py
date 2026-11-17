"""종목 실적 공시 읽기 · 예상 창 쓰기 (FC-REQ-021 FR-11~15 · DB-REQ-034 FR-5).

원천은 서버 export 뷰 `public.v_dart_earnings_export`(주인 서버 news — 실적 공시 목록 · IR · 예고 본문에서 읽은 일정)
만 읽는다.
게시 시각은 사전등록 `event-window@2` 와 같은 규칙(`dart_published` — 처음 본 시각 · 접수일 끝 중 이른 쪽)."""

from __future__ import annotations

import json
from collections.abc import Sequence
from datetime import datetime
from typing import Any

from sqlalchemy import Engine, text

from salt_forecast.domain.kr_earnings import EarningsFiling, EarningsWindow
from salt_forecast.store.bulk import bulk_upsert
from salt_forecast.store.event_window import dart_published
from salt_forecast.store.tables import kr_earnings_window


def load_earnings_filings(engine: Engine, symbols: Sequence[str]) -> dict[str, list[EarningsFiling]]:
    """종목별 실적 공시 · 일정 — as_of 거르기는 도메인이 `published_at` 으로 한다(공시 수천 행 — 한 번 읽는다)."""
    if not symbols:
        return {}
    sql = text(
        "SELECT rcept_no, stock_code, kind, report_name, rcept_date, first_seen_at, period_end, scheduled_at, "
        "time_known, about_earnings, doc_status FROM public.v_dart_earnings_export WHERE stock_code = ANY(:s)"
    )
    out: dict[str, list[EarningsFiling]] = {}
    with engine.connect() as conn:
        for r in conn.execute(sql, {"s": list(symbols)}):
            f = EarningsFiling(
                str(r.rcept_no),
                str(r.stock_code),
                str(r.kind),
                str(r.report_name),
                r.rcept_date,
                dart_published(r.first_seen_at, r.rcept_date),
                r.period_end,
                r.scheduled_at,
                r.time_known,
                r.about_earnings,
                r.doc_status == "ok",
            )
            out.setdefault(f.symbol, []).append(f)
    return out


_COLS = (
    "symbol", "as_of", "period_end", "annual", "quarter_lag_min", "quarter_lag_median", "quarter_lag_max", "sample",
    "window_from", "window_to", "deadline", "hits", "judged", "misses", "confirmed_at", "confirmed_time_known",
    "confirmed_source", "renderable", "blocked_reason", "computed_at",
)  # fmt: skip


def save_windows(engine: Engine, windows: Sequence[EarningsWindow], computed_at: datetime) -> int:
    """(symbol, as_of) 한 행 — 같은 as_of 두 번 = 덮어쓰기(멱등)."""
    rows: list[Sequence[Any]] = [
        (
            w.symbol, w.as_of, w.period_end, w.annual, w.lag_min, w.lag_median, w.lag_max, w.sample, w.window_from,
            w.window_to, w.deadline, w.hits, w.judged, json.dumps(w.misses),
            w.confirmed.at if w.confirmed else None, w.confirmed.time_known if w.confirmed else None,
            w.confirmed.source if w.confirmed else None, w.renderable, w.blocked_reason, computed_at,
        )
        for w in windows
    ]  # fmt: skip
    return bulk_upsert(engine, kr_earnings_window, _COLS, rows, ("symbol", "as_of"))
