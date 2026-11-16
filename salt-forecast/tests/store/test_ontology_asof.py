"""온톨로지 as-of 함수 누수 · 3홉 성능(FC-REQ-022 수용 기준 — 무작위 as-of 1,000회 · p95 200ms).

실제 Postgres. 테스트 전용 id(`test:`)와 2000년 시각으로 쓰고 끝에 지운다.
"""

from __future__ import annotations

import os
import time
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import numpy as np
import pytest
from sqlalchemy import Engine, create_engine, text

from salt_forecast.config import Settings

pytestmark = pytest.mark.db
T0 = datetime(2000, 1, 3, tzinfo=UTC)


def _cleanup(e: Engine) -> None:
    with e.begin() as conn:
        conn.execute(text("DELETE FROM forecast.fact WHERE entity LIKE 'test:%'"))
        conn.execute(text("DELETE FROM forecast.relation WHERE subject LIKE 'test:%'"))
        conn.execute(text("DELETE FROM forecast.entity WHERE id LIKE 'test:%'"))


@pytest.fixture
def eng() -> Iterator[Engine]:
    if not os.environ.get("FORECAST_DATABASE_URL"):
        pytest.skip("FORECAST_DATABASE_URL 없음")
    e = create_engine(Settings().sqlalchemy_url())  # pyright: ignore[reportCallIssue]
    _cleanup(e)  # 끊긴 앞 실행이 남긴 시험 행
    yield e
    _cleanup(e)


def _seed(eng: Engine, rng: np.random.Generator) -> list[datetime]:
    """사실 200행 — 같은 (엔티티, 속성, valid_from) 에 버전 여럿(available_at 이 다름) · 관계 사슬 a→b→c→d."""
    avail: list[datetime] = []
    with eng.begin() as conn:
        for e in ("a", "b", "c", "d"):
            conn.execute(
                text(
                    "INSERT INTO forecast.entity (id, kind, canonical_name, external_ids) "
                    "VALUES (:i, 'asset', :i, '{}')"
                ),
                {"i": f"test:{e}"},
            )
        for k, (s, o) in enumerate((("a", "b"), ("b", "c"), ("c", "d"))):
            at = T0 + timedelta(days=10 * (k + 1))
            conn.execute(
                text(
                    "INSERT INTO forecast.relation (subject, predicate, object, valid_from, observed_at, available_at, "
                    "source_kind) VALUES (:s, 'affects', :o, :t, :t, :t, 'test')"
                ),
                {"s": f"test:{s}", "o": f"test:{o}", "t": at},
            )
        for i in range(200):
            vf = T0 + timedelta(days=int(i % 20))
            at = vf + timedelta(hours=int(rng.integers(0, 24 * 30)))
            avail.append(at)
            conn.execute(
                text(
                    "INSERT INTO forecast.fact (entity, attribute, value_num, valid_from, observed_at, available_at, "
                    "source_kind) VALUES ('test:a', 'x', :v, :vf, :vf, :at, 'test') ON CONFLICT DO NOTHING"
                ),
                {"v": float(i), "vf": vf, "at": at},
            )
    return avail


def test_fact_asof_never_returns_future(eng: Engine) -> None:
    rng = np.random.default_rng(20261116)
    _seed(eng, rng)
    span = 60 * 86_400
    with eng.connect() as conn:
        for _ in range(1000):
            as_of = T0 + timedelta(seconds=int(rng.integers(0, span)))
            rows = conn.execute(text("SELECT available_at FROM forecast.f_fact_asof(:t, 'test:a')"), {"t": as_of}).all()
            assert all(r[0] <= as_of for r in rows)
            # 그 시점 최신 버전 하나씩 — (속성, valid_from) 중복 0
        dup = conn.execute(
            text("SELECT count(*) - count(DISTINCT (attribute, valid_from)) FROM forecast.f_fact_asof(:t, 'test:a')"),
            {"t": T0 + timedelta(days=90)},
        ).scalar_one()
        assert dup == 0


def test_neighbors_asof_and_p95(eng: Engine) -> None:
    _seed(eng, np.random.default_rng(1))
    with eng.connect() as conn:

        def hops(t: datetime, depth: int = 3) -> dict[str, int]:
            q = text("SELECT entity, hop FROM forecast.f_neighbors('test:a', :d, :t)")
            return {str(e): int(h) for e, h in conn.execute(q, {"t": t, "d": depth}).all()}

        assert hops(T0 + timedelta(days=5)) == {}  # 관계를 알기 전
        assert hops(T0 + timedelta(days=15)) == {"test:b": 1}
        assert hops(T0 + timedelta(days=40)) == {"test:b": 1, "test:c": 2, "test:d": 3}
        assert hops(T0 + timedelta(days=40), depth=9) == {"test:b": 1, "test:c": 2, "test:d": 3}  # 3홉 상한
        # 실데이터 3홉 p95 — 원인 스냅샷이 있는 종목(없으면 업종 소속만)
        starts = [
            str(r[0]) for r in conn.execute(text("SELECT id FROM forecast.entity WHERE kind='asset' LIMIT 200")).all()
        ]
        took: list[float] = []
        now = datetime.now(UTC)
        for s in starts:
            t = time.perf_counter()
            conn.execute(text("SELECT count(*) FROM forecast.f_neighbors(:s, 3, :t)"), {"s": s, "t": now}).scalar_one()
            took.append((time.perf_counter() - t) * 1000)
        if took:
            assert float(np.percentile(took, 95)) < 200, np.percentile(took, 95)


def test_build_at_past_as_of_reads_nothing_from_the_future(eng: Engine) -> None:
    """과거 as_of 로 전체 적재(dry-run)를 돌리면 시각 있는 원천의 행은 전부 available_at ≤ as_of.

    as_of 뒤 시각을 갖는 것은 '지금 값'만 주는 정적 원천(종목 마스터 · 코인 이름)뿐 —
    그 행은 as-of 함수가 거른다(소급 0)."""
    from salt_forecast.domain.ontology import SOURCE_CRYPTO, SOURCE_MASTER
    from salt_forecast.domain.ontology_sources import SRC_STATUS
    from salt_forecast.ontology.build import build_ontology

    as_of = datetime(2026, 11, 1, tzinfo=UTC)
    _, g, outs = build_ontology(eng, as_of, dry_run=True)
    static = {SOURCE_MASTER, SOURCE_CRYPTO, SRC_STATUS}
    late_rel = [r for r in g.relations if r.available_at > as_of and r.source_kind not in static]
    late_fact = [f for f in g.facts if f.available_at > as_of and f.source_kind not in static]
    assert late_rel == [] and late_fact == []
    assert all(o.available_at <= as_of for o in outs)
    assert len(g.relations) > 1000 and len(g.facts) > 1000  # 과거에도 원천이 실제로 읽혔다(빈 통과 아님)
