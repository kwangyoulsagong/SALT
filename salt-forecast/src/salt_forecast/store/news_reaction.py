"""소식 측정 태그 읽기 · 쓰기(FC-REQ-028 FR-3 · DB-REQ-043 FR-4).

원천 제목은 export 뷰로만 읽는다(`public.v_kr_news_title_export` · `public.v_news_article_export`)
— DB-REQ-036 FR-3 직접 읽기 목록을 늘리지 않는다.
"""

from __future__ import annotations

import json
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import Engine, text

from salt_forecast.domain.news_reaction import PreMove, ReactionStat
from salt_forecast.store.bulk import bulk_upsert
from salt_forecast.store.tables import news_kind_dict, news_pre_move, news_reaction_stat


@dataclass(frozen=True, slots=True)
class RawTitle:
    origin: str  # disclosure | news
    title: str
    codes: tuple[str, ...]
    published_at: datetime  # UTC


def _utc(v: datetime) -> datetime:
    # public 표는 timestamp(3) — Prisma 가 UTC 로 쓴다
    return v.replace(tzinfo=UTC) if v.tzinfo is None else v.astimezone(UTC)


def load_kr_titles(engine: Engine, *, as_of: datetime) -> list[RawTitle]:
    """게시 시각 <= as_of · 광고성 제외."""
    sql = text(
        """
        SELECT origin, title, codes, published_at FROM public.v_kr_news_title_export
        WHERE NOT promo AND published_at <= :as_of
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(sql, {"as_of": as_of.astimezone(UTC).replace(tzinfo=None)}).all()
    return [RawTitle(str(r[0]), str(r[1]), tuple(str(c) for c in r[2]), _utc(r[3])) for r in rows]


def load_crypto_titles(engine: Engine, *, as_of: datetime) -> list[RawTitle]:
    """코인 뉴스 — 심볼은 원천 태깅 그대로(거르는 것은 scoring 이 가격 시계열로)."""
    sql = text("SELECT title, symbols, published_at FROM public.v_news_article_export WHERE published_at <= :as_of")
    with engine.connect() as conn:
        rows = conn.execute(sql, {"as_of": as_of.astimezone(UTC).replace(tzinfo=None)}).all()
    return [RawTitle("news", str(r[0]), tuple(str(s).upper() for s in r[1]), _utc(r[2])) for r in rows]


def save_dict(engine: Engine, key: str, registered: date, d: Mapping[str, object], at: datetime) -> int:
    """사전 한 행 — 같은 키면 덮는다(같은 등록 파일이면 같은 값)."""
    return bulk_upsert(
        engine,
        news_kind_dict,
        ("prereg_key", "registered", "dict", "written_at"),
        [(key, registered, json.dumps(d, ensure_ascii=False), at)],
        ("prereg_key",),
    )


_STAT_COLS = (
    "prereg_key", "market", "origin", "kind", "horizon", "as_of", "status", "sample", "sample_eff", "sample_days",
    "up_rate", "up_low", "up_high", "mean", "q10", "q50", "q90", "pre_move_median", "base_up_rate", "differs",
    "window_from", "window_to",
)  # fmt: skip
_STAT_PK = ("prereg_key", "market", "origin", "kind", "horizon", "as_of")


def save_stats(engine: Engine, key: str, as_of: datetime, stats: Sequence[ReactionStat]) -> int:
    rows: list[Sequence[Any]] = [
        (
            key,
            s.market,
            s.origin,
            s.kind,
            s.horizon,
            as_of,
            s.status,
            s.sample,
            s.sample_eff,
            s.sample_days,
            s.up_rate,
            s.up_low,
            s.up_high,
            s.mean,
            s.q10,
            s.q50,
            s.q90,
            s.pre_move_median,
            s.base_up_rate,
            s.differs,
            s.window_from,
            s.window_to,
        )
        for s in stats
    ]
    return bulk_upsert(engine, news_reaction_stat, _STAT_COLS, rows, _STAT_PK)


def save_pre_moves(engine: Engine, market: str, rows: Sequence[PreMove], at: datetime) -> int:
    """symbol 은 서버 키(국내 코드 · 코인 심볼)로 넘겨받는다."""
    return bulk_upsert(
        engine,
        news_pre_move,
        ("market", "symbol", "bar_at", "pre_move_5d", "written_at"),
        [(market, r.symbol, r.bar_at, r.pre_move_5d, at) for r in rows],
        ("market", "symbol", "bar_at"),
    )
