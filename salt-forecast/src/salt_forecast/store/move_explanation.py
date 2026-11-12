"""오늘 등락 한 줄 시도 읽기(export 뷰) — FC-REQ-027 FR-5. 쓰기 0(주인은 서버 coach)."""

from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import Engine, text

from salt_forecast.domain.move_explanation import Attempt


def _texts(v: Sequence[Any] | None) -> tuple[str, ...]:
    """Postgres text[] → 문자열 튜플(NULL 은 빈 튜플)"""
    return tuple(str(c) for c in v) if v else ()


def attempts_between(engine: Engine, since: datetime, until: datetime) -> list[Attempt]:
    """[since, until) 에 만든 시도. 서버 표는 export 뷰로만 읽는다(public 직접 읽기 목록을 늘리지 않는다)."""
    sql = text(
        """
        SELECT asset_class, symbol, trade_date, gate, text, citations, fact_count, rejections, provider, generated_at
        FROM public.v_move_explanation_export
        WHERE generated_at >= :since AND generated_at < :until
        ORDER BY generated_at
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(sql, {"since": since, "until": until}).all()
    out: list[Attempt] = []
    for r in rows:
        at: datetime = r[9]
        if at.tzinfo is None:
            at = at.replace(tzinfo=UTC)
        out.append(
            Attempt(
                asset=str(r[0]),
                symbol=str(r[1]),
                trade_date=r[2].isoformat(),
                gate=str(r[3]),
                text=None if r[4] is None else str(r[4]),
                citations=_texts(r[5]),
                fact_count=int(r[6]),
                rejections=_texts(r[7]),
                provider=str(r[8]),
                generated_at=at,
            )
        )
    return out
