-- FC-REQ-023 FR-1 · 2 · 6 · DB-REQ-045 (2026-11-18) — 에이전트 도구가 읽는 계약(O3). 추가만.
-- 롤백 = DROP VIEW forecast.v_agent_event_reactions;
--        DROP FUNCTION forecast.f_agent_recent_events(text, timestamptz, timestamptz), forecast.f_agent_documents(text, timestamptz, timestamptz, integer), forecast.f_agent_neighbors(text, integer, timestamptz),
--                      forecast.f_agent_mentions_ok(text, timestamptz);
--        DROP TABLE forecast.ontology_quality_gate.
-- 쓰기는 salt-forecast 만(ontology_quality 잡 — 관문 행). 읽기는 서버 coach(에이전트 도구 · SRV-REQ-059).
-- 사용자 열 0 — 종목 · 업종 · 문서 · 통계 단위. as-of 는 available_at 만(ontology.md §3).
-- 도구 결과 행마다 출처(source_kind · 원문 주소가 있는 원천은 source_url) + 시각(available_at). 원문 주소를 만들 수 있는 원천은 여기서 만든다(DART 접수번호).

-- ① O2 관문(FC-REQ-022 FR-11) — 잡 회차마다 시장별 한 행. 지금까지는 로그 · 리포트에만 있어 도구가 읽을 수 없었다
CREATE TABLE forecast.ontology_quality_gate (
  checked_at timestamptz      NOT NULL,
  market     text             NOT NULL CHECK (market IN ('kr', 'crypto')),
  precision  double precision NOT NULL,
  recall     double precision NOT NULL,
  ok         boolean          NOT NULL,
  labels     text             NOT NULL,   -- 라벨 파일 이름(경로 아님)
  PRIMARY KEY (checked_at, market)
);

-- 그 시장의 mentions 간선을 도구가 써도 되나 — as_of 이전 마지막 관문. 관문 기록이 없으면 false(모르면 안 쓴다)
CREATE FUNCTION forecast.f_agent_mentions_ok(market text, as_of timestamptz)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT coalesce((
    SELECT g.ok FROM forecast.ontology_quality_gate g
    WHERE g.market = f_agent_mentions_ok.market AND g.checked_at <= as_of
    ORDER BY g.checked_at DESC LIMIT 1
  ), false)
$$;

-- ② get_neighbors — f_neighbors 와 같은 걸음(허브 안 지남 · 3홉 상한 · 점 집합)에 간선 거르기 둘:
--    mentions 는 관문 통과 시장에서만 · 확신 ≥ 0.5(해소된 연결) · 최근 30일 문서만(옛 기사로 3홉이 그래프 전부가 되지 않게).
--    돌려주는 것은 이름 있는 점(종목 · 회사 · 업종 · 기관 · 정책) — 문서 · 사건은 지나가는 점이다(문서는 get_documents).
--    shared_documents = 시작 종목과 같이 언급된 문서 수(같이 언급 이웃의 근거 숫자).
CREATE FUNCTION forecast.f_agent_neighbors(start_id text, depth integer, as_of timestamptz)
RETURNS TABLE (entity text, kind text, name text, hop integer, via_predicate text, via_entity text,
               source_kind text, available_at timestamptz, shared_documents integer)
LANGUAGE sql STABLE AS $$
  -- 간선 거르기는 관계 표를 바로 읽는 자리마다 같은 조건(CTE 로 모으면 인덱스를 못 타 3홉이 3.6초 — 2026-11-18 실측)
  WITH RECURSIVE gate AS (
    SELECT forecast.f_agent_mentions_ok(split_part(start_id, ':', 2), as_of) AS ok
  ), walk(entity, hop) AS (
    SELECT start_id, 0
    UNION
    SELECT nxt.e, w.hop + 1
    FROM walk w
    CROSS JOIN gate g
    CROSS JOIN LATERAL (
      SELECT r.object AS e FROM forecast.relation r
      WHERE r.subject = w.entity AND r.available_at <= as_of AND r.valid_from <= as_of AND (r.valid_to IS NULL OR r.valid_to > as_of)
        AND (r.predicate <> 'mentions' OR (g.ok AND r.confidence >= 0.5 AND r.available_at > as_of - interval '30 days'))
      UNION
      SELECT r.subject FROM forecast.relation r
      WHERE r.object = w.entity AND r.available_at <= as_of AND r.valid_from <= as_of AND (r.valid_to IS NULL OR r.valid_to > as_of)
        AND (r.predicate <> 'mentions' OR (g.ok AND r.confidence >= 0.5 AND r.available_at > as_of - interval '30 days'))
    ) nxt
    WHERE w.hop < LEAST(depth, 3) AND (w.hop = 0 OR w.entity NOT LIKE 'asset:market:%')
  ), first AS (
    SELECT DISTINCT ON (entity) entity, hop FROM walk ORDER BY entity, hop
  ), via AS (
    -- 어디서 왔나(관계 하나) — **앞 홉 점에서** 펼친다. 뒤 홉 점에서 펼치면 언급 수만 건인 종목(SK하이닉스 3만)마다 관계 전부를
    -- 훑어 허브 종목 2홉이 0.9초였다(2026-11-18 실측). 앞 홉 점은 문서 · 업종 · 회사라 관계가 적다
    SELECT DISTINCT ON (c.entity) c.entity, f.hop, c.predicate, p.entity AS prev, c.source_kind, c.available_at
    FROM first p
    CROSS JOIN gate g
    CROSS JOIN LATERAL (
      SELECT x.object AS entity, x.predicate, x.source_kind, x.available_at FROM forecast.relation x
      WHERE x.subject = p.entity AND x.available_at <= as_of AND x.valid_from <= as_of AND (x.valid_to IS NULL OR x.valid_to > as_of)
        AND (x.predicate <> 'mentions' OR (g.ok AND x.confidence >= 0.5 AND x.available_at > as_of - interval '30 days'))
      UNION ALL
      SELECT x.subject, x.predicate, x.source_kind, x.available_at FROM forecast.relation x
      WHERE x.object = p.entity AND x.available_at <= as_of AND x.valid_from <= as_of AND (x.valid_to IS NULL OR x.valid_to > as_of)
        AND (x.predicate <> 'mentions' OR (g.ok AND x.confidence >= 0.5 AND x.available_at > as_of - interval '30 days'))
    ) c
    JOIN first f ON f.entity = c.entity AND f.hop = p.hop + 1
    WHERE p.hop < LEAST(depth, 3) AND (p.hop = 0 OR p.entity NOT LIKE 'asset:market:%')
    ORDER BY c.entity, c.predicate, p.entity
  ), shared AS (
    -- 같이 언급 — 시작 종목을 언급한 문서가 언급한 다른 종목(문서 수). 관문 미달이면 0
    SELECT b.object AS entity, count(DISTINCT a.subject)::int AS n
    FROM gate g
    JOIN forecast.relation a ON g.ok AND a.object = start_id AND a.predicate = 'mentions' AND a.confidence >= 0.5
      AND a.available_at <= as_of AND a.available_at > as_of - interval '30 days'
    JOIN forecast.relation b ON b.subject = a.subject AND b.predicate = 'mentions' AND b.object <> start_id
      AND b.confidence >= 0.5 AND b.available_at <= as_of
    GROUP BY b.object
  )
  SELECT v.entity, e.kind, e.canonical_name, v.hop, v.predicate, v.prev, v.source_kind, v.available_at, coalesce(s.n, 0)
  FROM via v
  JOIN forecast.entity e ON e.id = v.entity
  LEFT JOIN shared s ON s.entity = v.entity
  WHERE e.kind NOT IN ('document', 'event') AND e.merged_into IS NULL
$$;

-- ③ get_documents — 엔티티(종목)에 닿는 문서: 언급(관문 · 확신 ≥ 0.5) · 회사가 낸 공시(회사 listed_as 종목 → issued).
--    "최근"은 일어난 시각(observed_at > since)으로, 누수 거르기는 알게 된 시각(available_at <= as_of)으로 — 2016~ 공시를 백필해
--    알게 된 시각이 전부 백필한 날이라 available_at 으로 "최근"을 고르면 1년 전 공시가 이번 주 공시로 나온다(2026-11-18 실측).
--    공시 먼저 그다음 최신순 · lim 상한(≤ 20).
--    source_url — 관계 행에 있으면 그것, DART 접수번호가 있으면 공시 뷰어 주소. 둘 다 없으면 NULL(원천에 원문 주소가 없다 — 시황 제목)
CREATE FUNCTION forecast.f_agent_documents(entity_id text, since timestamptz, as_of timestamptz, lim integer)
RETURNS TABLE (document text, title text, predicate text, source_kind text, confidence double precision,
               observed_at timestamptz, available_at timestamptz, source_url text)
LANGUAGE sql STABLE AS $$
  WITH gate AS (
    SELECT forecast.f_agent_mentions_ok(split_part(entity_id, ':', 2), as_of) AS mentions_ok
  ), hit AS (
    SELECT r.subject AS document, r.predicate, r.source_kind, r.confidence, r.observed_at, r.available_at, r.source_url
    FROM forecast.relation r, gate
    WHERE r.predicate = 'mentions' AND r.object = entity_id AND gate.mentions_ok AND r.confidence >= 0.5
      AND r.observed_at > since AND r.available_at <= as_of
    UNION ALL
    SELECT r.object, r.predicate, r.source_kind, r.confidence, r.observed_at, r.available_at, r.source_url
    FROM forecast.relation l
    JOIN forecast.relation r ON r.subject = l.subject AND r.predicate = 'issued'
    WHERE l.predicate = 'listed_as' AND l.object = entity_id AND l.available_at <= as_of
      AND r.observed_at > since AND r.available_at <= as_of
  ), one AS (
    SELECT DISTINCT ON (document) * FROM hit ORDER BY document, (predicate = 'issued') DESC, available_at
  )
  SELECT o.document, btrim(regexp_replace(e.canonical_name, '\s+', ' ', 'g')), o.predicate, o.source_kind, o.confidence,
         o.observed_at, o.available_at,
         coalesce(o.source_url,
                  CASE WHEN e.external_ids ? 'dart_rcept_no'
                       THEN 'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=' || (e.external_ids ->> 'dart_rcept_no') END)
  FROM one o JOIN forecast.entity e ON e.id = o.document
  -- 공시 먼저(드물고 회사가 직접 낸 것) · 그다음 최신 — 최신순만이면 시황 제목 수십 건이 공시를 밀어낸다(2026-11-18 시험)
  ORDER BY (o.predicate = 'issued') DESC, o.observed_at DESC
  LIMIT LEAST(greatest(lim, 1), 20)
$$;

-- ④ get_event_reactions — 채점 통과한 반응 통계만 한 모양으로(사건 종류 × 범위 × 지평).
--    범위: market(시장 전체 사건 종류 — 사건 창 · 소식 반응) · symbol(그 종목의 신호 · 실적 공시 반응).
--    업종 범위 통계는 아직 없다(채점된 업종 반응 0) — 업종으로 지어내지 않는다.
--    통과 기준은 각 원천 뷰의 것 그대로: 사건 창 · 소식 반응 status = 'ok', 신호 · 실적 renderable.
CREATE VIEW forecast.v_agent_event_reactions AS
SELECT 'event_window'::text AS family, s.kind AS event_kind, s.origin, 'market'::text AS scope, s.market AS scope_key,
       s.tercile AS variant, s.horizon, s.sample, s.up_rate, s.base_up_rate, s.q10 AS low, s.q50 AS mid, s.q90 AS high,
       s.prereg_key AS source_key, s.as_of, s.window_from, s.window_to
FROM forecast.v_event_window_stat s WHERE s.status = 'ok'
UNION ALL
SELECT 'news_reaction', n.kind, n.origin, 'market', n.market, NULL, n.horizon, n.sample, n.up_rate, n.base_up_rate,
       n.q10, n.q50, n.q90, n.prereg_key, n.as_of, n.window_from, n.window_to
FROM forecast.v_news_reaction n WHERE n.status = 'ok'
UNION ALL
SELECT 'signal', g.kind, 'signal', 'symbol', g.symbol, NULL, g.horizon_days, g.sample, g.up_rate, NULL,
       g.q05, g.q50, g.q95, 'signal-reaction', g.as_of, g.window_from, g.window_to
FROM forecast.v_signal_reaction g WHERE g.renderable
UNION ALL
SELECT 'earnings', k.kind, 'dart', 'symbol', k.symbol, NULL, k.horizon_days, k.sample, k.up_rate, NULL,
       k.q05, k.q50, k.q95, 'kr-earnings-reaction', k.as_of, k.window_from, k.window_to
FROM forecast.v_kr_earnings_reaction k WHERE k.renderable;

-- ⑤ 그 종목에 최근 실제로 닿은 사건(일정 · 신호) — get_event_reactions 메뉴의 문턱. 일어난 시각이 since 뒤 · 알게 된 시각이 as_of 전.
--    반응 통계는 "오늘 그 사건이 있었을 때"만 판단을 설명한다 — 메뉴에 늘 올리면 사건 없는 날에 과거 통계를 끼워 넣는다
--    (2026-11-18 블라인드 A/B ② 평가자 셋이 같은 이유로 지금 운영 해설을 골랐다, 3 : 17)
CREATE FUNCTION forecast.f_agent_recent_events(entity_id text, since timestamptz, as_of timestamptz)
RETURNS TABLE (event_kind text, observed_at timestamptz, available_at timestamptz)
LANGUAGE sql STABLE AS $$
  SELECT DISTINCT ON (e.external_ids ->> 'kind') e.external_ids ->> 'kind', r.observed_at, r.available_at
  FROM forecast.relation r JOIN forecast.entity e ON e.id = r.subject
  WHERE r.object = entity_id AND r.predicate = 'affects' AND e.kind = 'event'
    AND r.observed_at > since AND r.observed_at <= as_of AND r.available_at <= as_of
    AND e.external_ids ? 'kind'
  ORDER BY e.external_ids ->> 'kind', r.observed_at DESC
$$;
