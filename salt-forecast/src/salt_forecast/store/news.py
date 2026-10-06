"""뉴스 원장 · 감성 점수 쓰기 · 읽기(FC-REQ-016 · news-sentiment@1). 둘 다 불변 — 같은 키는 건너뛴다."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import Engine, and_, exists, select
from sqlalchemy.dialects.postgresql import insert

from salt_forecast.store.tables import news_item, news_score


@dataclass(frozen=True, slots=True)
class NewsRow:
    item_id: str
    source: str
    lang: str
    title: str
    summary: str | None
    url: str
    title_key: str
    published_at: datetime
    fetched_at: datetime


@dataclass(frozen=True, slots=True)
class ScoreRow:
    item_id: str
    model_version: str
    symbols: tuple[str, ...]
    event_kinds: tuple[str, ...]
    negated: bool
    p_pos: float
    p_neu: float
    p_neg: float
    score: float
    scored_at: datetime


@dataclass(frozen=True, slots=True)
class Unscored:
    item_id: str
    lang: str
    title: str


def insert_items(engine: Engine, rows: Sequence[NewsRow]) -> int:
    """처음 받은 행만 남는다(fetched_at = 처음 받은 시각). 한 묶음 안의 같은 URL 도 하나로."""
    unique = {r.item_id: r for r in reversed(rows)}  # 같은 묶음에서 먼저 나온 것을 남긴다
    if not unique:
        return 0
    values = [
        {
            "item_id": r.item_id,
            "source": r.source,
            "lang": r.lang,
            "title": r.title,
            "summary": r.summary,
            "url": r.url,
            "title_key": r.title_key,
            "published_at": r.published_at,
            "fetched_at": r.fetched_at,
        }
        for r in unique.values()
    ]
    with engine.begin() as conn:
        stmt = insert(news_item).values(values).on_conflict_do_nothing()
        return len(conn.execute(stmt.returning(news_item.c.item_id)).all())


def unscored(engine: Engine, versions: Mapping[str, str], limit: int) -> list[Unscored]:
    """언어별 현재 모델 버전으로 아직 매기지 않은 기사. 오래된 것부터."""
    out: list[Unscored] = []
    with engine.connect() as conn:
        for lang, version in versions.items():
            missing = ~exists().where(
                and_(news_score.c.item_id == news_item.c.item_id, news_score.c.model_version == version)
            )
            q = (
                select(news_item.c.item_id, news_item.c.lang, news_item.c.title)
                .where(news_item.c.lang == lang, missing)
                .order_by(news_item.c.fetched_at)
                .limit(limit)
            )
            out.extend(Unscored(r.item_id, r.lang, r.title) for r in conn.execute(q))
    return out


def insert_scores(engine: Engine, rows: Sequence[ScoreRow]) -> int:
    if not rows:
        return 0
    values = [
        {
            "item_id": r.item_id,
            "model_version": r.model_version,
            "symbols": list(r.symbols),
            "event_kinds": list(r.event_kinds),
            "negated": r.negated,
            "p_pos": r.p_pos,
            "p_neu": r.p_neu,
            "p_neg": r.p_neg,
            "score": r.score,
            "scored_at": r.scored_at,
        }
        for r in rows
    ]
    with engine.begin() as conn:
        stmt = insert(news_score).values(values).on_conflict_do_nothing()
        return len(conn.execute(stmt.returning(news_score.c.item_id)).all())
