-- F017 v4 순서 5b-2 (2026-11-16) — f_neighbors 다시 씀. FC-REQ-022 수용 기준 3홉 p95 200ms.
-- 원천을 넓히자(관계 4.3만) 시장 엔티티(코스피 2,979 · 코스닥 2,235 소속)를 지나는 3홉이 거의 전부를 돌고, 경로 배열 · UNION ALL 이
-- 같은 점을 경로마다 다시 펼쳐 한 번에 수 초가 걸렸다. 규칙 둘: ① 시장 전체(asset:market:*)는 이웃으로 돌려주되 **지나가지 않는다**
-- (같은 시장 = 관계가 아니라 분류) ② 홉마다 점 집합(UNION — 같은 점을 두 번 펼치지 않음) · as_of 거르기는 관계 표 인덱스로.
-- 되돌리기 = 앞 마이그레이션(20261116200100)의 함수 본문으로 CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION forecast.f_neighbors(start_id text, depth integer, as_of timestamptz)
RETURNS TABLE (entity text, hop integer, via_predicate text, via_entity text) LANGUAGE sql STABLE AS $$
  WITH RECURSIVE walk(entity, hop) AS (
    SELECT start_id, 0
    UNION
    SELECT nxt.e, w.hop + 1
    FROM walk w
    CROSS JOIN LATERAL (
      SELECT r.object AS e FROM forecast.relation r
      WHERE r.subject = w.entity AND r.available_at <= as_of AND r.valid_from <= as_of AND (r.valid_to IS NULL OR r.valid_to > as_of)
      UNION
      SELECT r.subject FROM forecast.relation r
      WHERE r.object = w.entity AND r.available_at <= as_of AND r.valid_from <= as_of AND (r.valid_to IS NULL OR r.valid_to > as_of)
    ) nxt
    WHERE w.hop < LEAST(depth, 3) AND (w.hop = 0 OR w.entity NOT LIKE 'asset:market:%')
  ), first AS (
    SELECT DISTINCT ON (entity) entity, hop FROM walk ORDER BY entity, hop
  ), rel AS (
    SELECT r.subject, r.predicate, r.object FROM forecast.relation r
    WHERE r.available_at <= as_of AND r.valid_from <= as_of AND (r.valid_to IS NULL OR r.valid_to > as_of)
  ), via AS (
    -- 어디서 왔나(관계 하나) — 바로 앞 홉의 점과 잇는 관계. 집합 조인(점마다 LATERAL 은 3홉에서 0.4초)
    SELECT f.entity, f.hop, r.predicate, p.entity AS prev
    FROM first f JOIN rel r ON r.subject = f.entity JOIN first p ON p.entity = r.object AND p.hop = f.hop - 1
      AND (p.hop = 0 OR p.entity NOT LIKE 'asset:market:%')
    UNION ALL
    SELECT f.entity, f.hop, r.predicate, p.entity
    FROM first f JOIN rel r ON r.object = f.entity JOIN first p ON p.entity = r.subject AND p.hop = f.hop - 1
      AND (p.hop = 0 OR p.entity NOT LIKE 'asset:market:%')
  )
  SELECT DISTINCT ON (entity) entity, hop, predicate, prev FROM via ORDER BY entity, predicate, prev
$$;

-- f_fact_asof 에 엔티티 인자(선택) — 전체 사실(9.5만)을 매번 정렬하지 않고 PK(entity, …) 로 한 엔티티만. 인자 없으면 전부(기존 호출 그대로)
DROP FUNCTION forecast.f_fact_asof(timestamptz);
CREATE FUNCTION forecast.f_fact_asof(as_of timestamptz, entity_id text DEFAULT NULL)
RETURNS SETOF forecast.fact LANGUAGE sql STABLE AS $$
  SELECT DISTINCT ON (entity, attribute, valid_from) *
  FROM forecast.fact
  WHERE available_at <= as_of AND (entity_id IS NULL OR entity = entity_id)
  ORDER BY entity, attribute, valid_from, available_at DESC
$$;
