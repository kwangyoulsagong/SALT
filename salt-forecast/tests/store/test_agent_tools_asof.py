"""에이전트 도구 계약 — as-of 누수 · O2 관문 · 출처 · 성능(FC-REQ-023 FR-1 · 2 · 6, DB-REQ-045).

실제 Postgres. 시험 id(`asset:kr:test-*` · `document:test:*`)와 2000년 시각으로 쓰고 끝에 지운다.
관문 행은 2000년 시각이라 실제 관문(2026~)과 겹치지 않는다 — as_of 가 2000년일 때만 보인다.
"""

from __future__ import annotations

import os
import time
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import numpy as np
import pytest
from sqlalchemy import Connection, Engine, create_engine, text

from salt_forecast.config import Settings

pytestmark = pytest.mark.db
T0 = datetime(2000, 1, 3, tzinfo=UTC)
A, B, SECTOR, COMPANY = "asset:kr:test-a", "asset:kr:test-b", "sector:kr:test-s", "company:kr:test-a"


def _cleanup(e: Engine) -> None:
    with e.begin() as conn:
        conn.execute(text("DELETE FROM forecast.ontology_quality_gate WHERE labels = 'test'"))
        for col in ("subject", "object"):
            conn.execute(
                text(
                    f"DELETE FROM forecast.relation WHERE {col} LIKE 'asset:kr:test-%' OR {col} LIKE '%:test:%'"
                    f" OR {col} LIKE '%:kr:test-%'"
                )
            )
        conn.execute(
            text(
                "DELETE FROM forecast.entity WHERE id LIKE '%:kr:test-%' OR id LIKE 'document:test:%'"
                " OR id LIKE 'event:test:%'"
            )
        )


@pytest.fixture
def eng() -> Iterator[Engine]:
    if not os.environ.get("FORECAST_DATABASE_URL"):
        pytest.skip("FORECAST_DATABASE_URL 없음")
    e = create_engine(Settings().sqlalchemy_url())  # pyright: ignore[reportCallIssue]
    _cleanup(e)
    yield e
    _cleanup(e)


def _entity(conn: Connection, id_: str, kind: str, name: str, ext: str = "{}") -> None:
    conn.execute(
        text(
            "INSERT INTO forecast.entity (id, kind, canonical_name, external_ids) "
            "VALUES (:i, :k, :n, CAST(:x AS jsonb))"
        ),
        {"i": id_, "k": kind, "n": name, "x": ext},
    )


def _rel(
    conn: Connection,
    s: str,
    p: str,
    o: str,
    at: datetime,
    conf: float = 1.0,
    url: str | None = None,
    observed: datetime | None = None,
) -> None:
    conn.execute(
        text(
            "INSERT INTO forecast.relation (subject, predicate, object, valid_from, observed_at, available_at, "
            "source_kind, source_url, confidence) VALUES (:s, :p, :o, :ob, :ob, :t, 'test', :u, :c)"
        ),
        {"s": s, "p": p, "o": o, "t": at, "ob": observed or at, "c": conf, "u": url},
    )


def _gate(conn: Connection, at: datetime, ok: bool) -> None:
    conn.execute(
        text("INSERT INTO forecast.ontology_quality_gate VALUES (:t, 'kr', 0.95, 0.8, :ok, 'test')"),
        {"t": at, "ok": ok},
    )


def _seed(eng: Engine, rng: np.random.Generator) -> list[datetime]:
    """종목 a · b(같은 업종) · 회사 a(공시 하나) · 문서 60(a 언급, 절반은 b 도 언급, 확신 섞음) · 관문 미달 → 통과."""
    avail: list[datetime] = []
    with eng.begin() as conn:
        named = (
            (A, "asset", "시험A"),
            (B, "asset", "시험B"),
            (SECTOR, "sector", "시험 업종"),
            (COMPANY, "company", "시험A"),
        )
        for i, k, n in named:
            _entity(conn, i, k, n)
        _rel(conn, A, "belongs_to", SECTOR, T0)
        _rel(conn, B, "belongs_to", SECTOR, T0)
        _rel(conn, COMPANY, "listed_as", A, T0)
        _entity(conn, "document:test:dart", "document", "주요사항보고서", '{"dart_rcept_no": "20000110000001"}')
        _rel(conn, COMPANY, "issued", "document:test:dart", T0 + timedelta(days=7))
        # 백필한 옛 공시 — 일어난 것은 1년 전, 알게 된 것은 8일째(2026-11-18 실측: "이번 주 공시"로 나왔다)
        _entity(conn, "document:test:old", "document", "옛 공시", '{"dart_rcept_no": "19990101000001"}')
        _rel(conn, COMPANY, "issued", "document:test:old", T0 + timedelta(days=8), observed=T0 - timedelta(days=365))
        for i in range(60):
            at = T0 + timedelta(hours=int(rng.integers(0, 24 * 40)))
            avail.append(at)
            doc = f"document:test:{i}"
            _entity(conn, doc, "document", f"시험 기사 {i}")
            _rel(conn, doc, "mentions", A, at, conf=1.0 if i % 3 else 0.3, url=f"https://example.test/{i}")
            if i % 2 == 0:
                _rel(conn, doc, "mentions", B, at)
        _gate(conn, T0, ok=False)  # 처음엔 미달
        _gate(conn, T0 + timedelta(days=20), ok=True)  # 20일째 통과
    return avail


def test_documents_never_return_future_and_follow_gate(eng: Engine) -> None:
    rng = np.random.default_rng(20261118)
    _seed(eng, rng)
    span = 50 * 86_400
    q = text(
        "SELECT available_at, predicate, confidence, source_url, observed_at, document "
        "FROM forecast.f_agent_documents(:e, :since, :t, 20)"
    )
    with eng.connect() as conn:
        for _ in range(1000):
            as_of = T0 + timedelta(seconds=int(rng.integers(0, span)))
            rows = conn.execute(q, {"e": A, "since": as_of - timedelta(days=30), "t": as_of}).all()
            assert all(r[0] <= as_of for r in rows)  # 미래 0
            assert all(r[1] == "issued" or r[2] >= 0.5 for r in rows)  # 해소 안 된 언급(0.3) 0
            if as_of < T0 + timedelta(days=20):  # 관문 미달 동안 언급 0 — 공시만
                assert all(r[1] == "issued" for r in rows)
            assert len(rows) <= 20
            # "최근"은 일어난 시각 — 백필한 1년 전 공시는 since 안에 들지 않는다
            assert all(r[4] > as_of - timedelta(days=30) for r in rows)
            assert all(str(r[5]) != "document:test:old" for r in rows)
        # 공시는 DART 뷰어 주소로 · 언급은 관계 행의 주소
        late = conn.execute(q, {"e": A, "since": T0, "t": T0 + timedelta(days=45)}).all()
        urls = {str(r[3]) for r in late}
        assert "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20000110000001" in urls
        assert any(u.startswith("https://example.test/") for u in urls)


def test_neighbors_gate_and_co_mentions(eng: Engine) -> None:
    _seed(eng, np.random.default_rng(1))
    q = text("SELECT entity, hop, via_predicate, shared_documents FROM forecast.f_agent_neighbors(:e, 2, :t)")
    with eng.connect() as conn:
        before = {str(r[0]): r for r in conn.execute(q, {"e": A, "t": T0 + timedelta(days=10)}).all()}
        after = {str(r[0]): r for r in conn.execute(q, {"e": A, "t": T0 + timedelta(days=45)}).all()}
    # 문서 · 사건은 돌려주지 않는다(지나가는 점)
    assert not any(k.startswith("document:") for k in (*before, *after))
    # 관문 미달 — 같은 업종으로만 b 에 닿고 같이 언급 수 0
    assert before[B][1] == 2 and before[B][2] == "belongs_to" and before[B][3] == 0
    # 관문 통과 — 같이 언급 문서 수가 생긴다(확신 1.0 이고 30일 안 문서만)
    assert after[B][3] > 0
    assert {SECTOR, COMPANY} <= set(after)


def test_reaction_view_holds_only_scored_rows(eng: Engine) -> None:
    with eng.connect() as conn:
        rows = conn.execute(text("SELECT family, count(*) FROM forecast.v_agent_event_reactions GROUP BY 1")).all()
        got: dict[str, int] = {str(r[0]): int(r[1]) for r in rows}
        want = {
            "event_window": "SELECT count(*) FROM forecast.v_event_window_stat WHERE status = 'ok'",
            "news_reaction": "SELECT count(*) FROM forecast.v_news_reaction WHERE status = 'ok'",
            "signal": "SELECT count(*) FROM forecast.v_signal_reaction WHERE renderable",
            "earnings": "SELECT count(*) FROM forecast.v_kr_earnings_reaction WHERE renderable",
        }
        for family, sql in want.items():
            assert got.get(family, 0) == int(conn.execute(text(sql)).scalar_one()), family
        # 표본 · 비율 없는 행 0(채점 통과 행만)
        bad = conn.execute(
            text("SELECT count(*) FROM forecast.v_agent_event_reactions WHERE sample IS NULL OR up_rate IS NULL")
        ).scalar_one()
        assert bad == 0


def test_neighbors_p95_on_real_assets(eng: Engine) -> None:
    """도구가 쓰는 2홉 p95 200ms(실데이터 종목 200). 3홉은 허브 종목에서 1초대라 도구가 쓰지 않는다 — 값만 남긴다."""
    with eng.connect() as conn:
        starts = [
            str(r[0])
            for r in conn.execute(
                text("SELECT id FROM forecast.entity WHERE kind='asset' AND id NOT LIKE 'asset:market:%' LIMIT 200")
            ).all()
        ]
        if not starts:
            pytest.skip("엔티티 비어 있음")
        now = datetime.now(UTC)
        took: dict[int, list[float]] = {2: [], 3: []}
        for depth in (2, 3):
            for s in starts:
                t = time.perf_counter()
                conn.execute(
                    text("SELECT count(*) FROM forecast.f_agent_neighbors(:s, :d, :t)"), {"s": s, "d": depth, "t": now}
                ).scalar_one()
                took[depth].append((time.perf_counter() - t) * 1000)
    p95 = {d: float(np.percentile(v, 95)) for d, v in took.items()}
    print(f"f_agent_neighbors p95 ms — 2홉 {p95[2]:.0f} · 3홉 {p95[3]:.0f}")
    assert p95[2] < 200, p95


def test_recent_events_window_and_asof(eng: Engine) -> None:
    """반응 도구 메뉴의 문턱 — since 뒤에 일어났고 as_of 전에 알게 된 사건만, 종류마다 가장 최근 하나."""
    with eng.begin() as conn:
        _entity(conn, A, "asset", "시험A")
        for i, (kind, days, known) in enumerate((("kr_earnings", 5, 5), ("kr_earnings", 9, 9), ("kr_ir", 30, 30))):
            ev = f"event:test:{i}"
            _entity(conn, ev, "event", kind, f'{{"kind": "{kind}"}}')
            _rel(conn, ev, "affects", A, T0 + timedelta(days=known), observed=T0 + timedelta(days=days))
    q = text("SELECT event_kind, observed_at FROM forecast.f_agent_recent_events(:e, :since, :t)")
    with eng.connect() as conn:
        got = {str(k): o for k, o in conn.execute(q, {"e": A, "since": T0, "t": T0 + timedelta(days=10)}).all()}
        assert set(got) == {"kr_earnings"}  # kr_ir 은 아직 일어나지 않았다
        assert got["kr_earnings"] == T0 + timedelta(days=9)  # 가장 최근 하나
        late = conn.execute(q, {"e": A, "since": T0 + timedelta(days=20), "t": T0 + timedelta(days=40)}).all()
        assert [str(r[0]) for r in late] == ["kr_ir"]  # 창 밖(since 전) 실적은 빠진다


def test_neighbors_on_hub_assets_stay_fast(eng: Engine) -> None:
    """언급이 가장 많은 종목 다섯(허브)의 2홉도 200ms 안.

    "어디서 왔나"를 뒤 홉 점에서 펼쳐 삼성전자가 0.9초였다(2026-11-18).
    """
    with eng.connect() as conn:
        hubs = [
            str(r[0])
            for r in conn.execute(
                text(
                    "SELECT object FROM forecast.relation WHERE predicate = 'mentions' AND object LIKE 'asset:%' "
                    "AND object NOT LIKE 'asset:market:%' GROUP BY object ORDER BY count(*) DESC LIMIT 5"
                )
            ).all()
        ]
        if not hubs:
            pytest.skip("언급 비어 있음")
        now = datetime.now(UTC)
        q = text("SELECT count(*) FROM forecast.f_agent_neighbors(:s, 2, :t)")
        conn.execute(q, {"s": hubs[0], "t": now}).scalar_one()  # 첫 실행 계획 캐시 제외
        for s in hubs:
            t = time.perf_counter()
            conn.execute(q, {"s": s, "t": now}).scalar_one()
            took = (time.perf_counter() - t) * 1000
            assert took < 200, (s, took)
