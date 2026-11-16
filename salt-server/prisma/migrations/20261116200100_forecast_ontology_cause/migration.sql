-- F017 v4 순서 5b · 5c (2026-11-16) — 온톨로지 네 층 · 원인 설명 채점. FC-REQ-022 FR-1~4 · 13 · 14 · 15 · DB-REQ-043 FR-15(신규).
-- 추가만. 롤백 = DROP FUNCTION forecast.f_neighbors, forecast.f_fact_asof, forecast.f_relation_asof;
--         DROP TABLE forecast.cause_explain_test, forecast.outcome, forecast.evidence, forecast.cause_candidate, forecast.fact, forecast.relation, forecast.entity.
-- 쓰기는 salt-forecast 만(ontology_build · cause_explain). 서버는 아직 읽지 않는다 — 판정 통과 칸이 생기면(2027-01-15 ~) 뷰를 같은 PR 로.
-- 사용자 열 0 — 종목 · 업종 · 사건 단위. 시간 두 축(ontology.md §3): as-of 는 available_at 만, ingested_at 은 감사용.

-- ① 바닥(O1) — 엔티티 · 관계 · 사실. 닫힌 목록은 CHECK(ontology.md §2 — 코드가 새 문자열을 못 만든다)
CREATE TABLE forecast.entity (
  id             text        PRIMARY KEY,                       -- 'asset:kr:005930' · 'asset:crypto:BTC' · 'sector:kr:0013' · 'event:<원천 사실 id>'
  kind           text        NOT NULL CHECK (kind IN ('asset', 'company', 'person', 'institution', 'wallet', 'event', 'document', 'sector', 'policy')),
  canonical_name text        NOT NULL,
  external_ids   jsonb       NOT NULL,                          -- 원천 키(멱등 — FR-6)
  merged_into    text        REFERENCES forecast.entity (id),   -- 병합 표시(행 삭제 0)
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE forecast.relation (
  subject      text             NOT NULL REFERENCES forecast.entity (id),
  predicate    text             NOT NULL CHECK (predicate IN ('issued', 'listed_as', 'holds', 'traded', 'mentions', 'affects', 'belongs_to', 'regulates')),
  object       text             NOT NULL REFERENCES forecast.entity (id),
  valid_from   timestamptz      NOT NULL,
  valid_to     timestamptz,                                     -- 끝난 관계는 채운다(지우지 않는다)
  observed_at  timestamptz      NOT NULL,
  available_at timestamptz      NOT NULL,
  ingested_at  timestamptz      NOT NULL DEFAULT now(),
  source_kind  text             NOT NULL,
  source_url   text,
  confidence   double precision NOT NULL DEFAULT 1 CHECK (confidence >= 0 AND confidence <= 1),
  PRIMARY KEY (subject, predicate, object, valid_from)
);
CREATE INDEX relation_object_idx ON forecast.relation (object, predicate);
CREATE INDEX relation_available_idx ON forecast.relation (available_at);

CREATE TABLE forecast.fact (
  entity       text             NOT NULL REFERENCES forecast.entity (id),
  attribute    text             NOT NULL,
  value_num    double precision,
  value_text   text,
  unit         text,
  valid_from   timestamptz      NOT NULL,
  valid_to     timestamptz,
  observed_at  timestamptz      NOT NULL,
  available_at timestamptz      NOT NULL,                       -- 값이 바뀌면 새 available_at 행(버전) — 덮어쓰지 않는다
  ingested_at  timestamptz      NOT NULL DEFAULT now(),
  source_kind  text             NOT NULL,
  source_url   text,
  PRIMARY KEY (entity, attribute, valid_from, available_at),
  CHECK (value_num IS NOT NULL OR value_text IS NOT NULL)
);
CREATE INDEX fact_available_idx ON forecast.fact (available_at);

-- ③ 원인 후보 — 서버 조립 결과(cause_snapshot)의 사본(FR-13 — 주인 SRV-REQ-053 FR-11). 그날 지문 하나 = 후보 목록 하나
CREATE TABLE forecast.cause_candidate (
  entity       text        NOT NULL REFERENCES forecast.entity (id),
  trade_date   date        NOT NULL,
  fingerprint  text        NOT NULL,
  rank         integer     NOT NULL CHECK (rank >= 0),
  kind         text        NOT NULL,
  strength     text        NOT NULL CHECK (strength IN ('likely', 'possible', 'none')),
  headline     text        NOT NULL,
  event_entity text        REFERENCES forecast.entity (id),     -- 소식 · 공시 원인이면 사건 엔티티(affects 로 종목에)
  supports     integer     NOT NULL,                            -- 받치는 근거 수(단계의 근거)
  available_at timestamptz NOT NULL,                            -- = 서버가 찍은 시각
  ingested_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entity, trade_date, fingerprint, rank)
);
CREATE INDEX cause_candidate_day_idx ON forecast.cause_candidate (trade_date);

-- ② 근거 — 사실 + 비교(문구 그대로 · 숫자는 서버가 만든 것). 원인 후보 하나에 여럿
CREATE TABLE forecast.evidence (
  entity       text        NOT NULL,
  trade_date   date        NOT NULL,
  fingerprint  text        NOT NULL,
  rank         integer     NOT NULL,
  ord          integer     NOT NULL CHECK (ord >= 0),
  kind         text        NOT NULL,
  value_text   text        NOT NULL,
  compare_text text,
  supports     boolean     NOT NULL,
  source_name  text        NOT NULL,
  observed_at  timestamptz,
  available_at timestamptz NOT NULL,
  PRIMARY KEY (entity, trade_date, fingerprint, rank, ord),
  FOREIGN KEY (entity, trade_date, fingerprint, rank) REFERENCES forecast.cause_candidate (entity, trade_date, fingerprint, rank)
);

-- ④ 결과 — 실제 다음 등락(시장 대비). 라벨이 닫힌 뒤에만 쓴다(available_at = t+h 봉)
CREATE TABLE forecast.outcome (
  entity       text             NOT NULL REFERENCES forecast.entity (id),
  trade_date   date             NOT NULL,
  horizon      integer          NOT NULL CHECK (horizon > 0),
  r            double precision NOT NULL,                       -- ln(C_{t+h} / C_t)
  r_market     double precision NOT NULL,                       -- 같은 시장 · 같은 날 스냅샷 종목 동일가중
  excess       double precision NOT NULL,
  available_at timestamptz      NOT NULL,
  ingested_at  timestamptz      NOT NULL DEFAULT now(),
  PRIMARY KEY (entity, trade_date, horizon)
);

-- 원인 설명 채점(cause-explain@1) — 실행마다 칸(시장 × 지평)마다
CREATE TABLE forecast.cause_explain_test (
  prereg_key  text             NOT NULL,
  market      text             NOT NULL CHECK (market IN ('kr', 'crypto')),
  horizon     integer          NOT NULL CHECK (horizon > 0),
  run_as_of   timestamptz      NOT NULL,
  status      text             NOT NULL CHECK (status IN ('forward', 'pass', 'fail')),
  reason      text,
  rows_scored integer          NOT NULL,
  rows_cold   integer          NOT NULL,
  days        integer          NOT NULL,
  brier_kind  double precision,
  brier_base  double precision,
  skill       double precision,
  t           double precision,
  p           double precision,
  p_holm      double precision,
  detail      jsonb            NOT NULL,                        -- 종류별 표본 · 오른 비율(서술) · 늦은 기록 · 0 라벨 수
  looks_done  integer          NOT NULL DEFAULT 0,
  computed_at timestamptz      NOT NULL,
  PRIMARY KEY (prereg_key, market, horizon, run_as_of)
);

-- as-of 조회(FR-4 정정 — 뷰는 인자를 못 받아 함수로). 기준은 available_at 하나(ontology.md §3)
CREATE FUNCTION forecast.f_fact_asof(as_of timestamptz)
RETURNS SETOF forecast.fact LANGUAGE sql STABLE AS $$
  SELECT DISTINCT ON (entity, attribute, valid_from) *
  FROM forecast.fact
  WHERE available_at <= as_of
  ORDER BY entity, attribute, valid_from, available_at DESC
$$;

CREATE FUNCTION forecast.f_relation_asof(as_of timestamptz)
RETURNS SETOF forecast.relation LANGUAGE sql STABLE AS $$
  SELECT * FROM forecast.relation
  WHERE available_at <= as_of AND valid_from <= as_of AND (valid_to IS NULL OR valid_to > as_of)
$$;

-- 이웃(FR-4 v_neighbors) — 방향 없이 depth ≤ 3 홉. 출처 · 시각은 관계 행에 있다
CREATE FUNCTION forecast.f_neighbors(start_id text, depth integer, as_of timestamptz)
RETURNS TABLE (entity text, hop integer, via_predicate text, via_entity text) LANGUAGE sql STABLE AS $$
  WITH RECURSIVE rel AS (
    SELECT subject, predicate, object FROM forecast.f_relation_asof(as_of)
  ), walk(entity, hop, via_predicate, via_entity, path) AS (
    SELECT start_id, 0, NULL::text, NULL::text, ARRAY[start_id]
    UNION ALL
    SELECT nxt.e, w.hop + 1, nxt.p, w.entity, w.path || nxt.e
    FROM walk w
    CROSS JOIN LATERAL (
      SELECT r.object AS e, r.predicate AS p FROM rel r WHERE r.subject = w.entity
      UNION ALL
      SELECT r.subject, r.predicate FROM rel r WHERE r.object = w.entity
    ) nxt
    WHERE w.hop < LEAST(depth, 3) AND NOT nxt.e = ANY (w.path)
  )
  SELECT DISTINCT ON (entity) entity, hop, via_predicate, via_entity FROM walk WHERE hop > 0 ORDER BY entity, hop
$$;
