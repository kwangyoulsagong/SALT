-- FC-REQ-022 FR-4 · DB-REQ-045 (2026-11-18) — f_neighbors 다시 씀(시그니처 · 결과 같음). 수용 기준 3홉 p95 200ms 가 데이터가 늘며 깨졌다
-- (관계 4.3만 → 5만: 삼성전자 0.6초 · 첫 종목 2.8초, `test_neighbors_asof_and_p95` 실패). 원인은 에이전트 이웃 함수(`f_agent_neighbors`)에서
-- 같은 날 찾은 것과 같다 — "어디서 왔나"를 ① 전체 관계 CTE(인덱스 없음)로 ② 뒤 홉 점(언급 3만 건 종목)에서 펼쳤다.
-- 앞 홉 점에서 관계 표를 바로 읽어 펼친다. 결과는 바꾸기 전과 바이트 대조(허브 아닌 시작점 diff 0 — 체크리스트).
-- 둘째: **허브(시장 전체 `asset:market:*`)에서 시작하면 1홉(소속)만** — 허브를 지나가지 않는 규칙의 연장. 코스피에서 3홉을 걸으면
-- 전 종목 → 그 문서 → 그래프 전부라 69초(옛 본문) · 246초(앞 홉 펼치기)였다. 부르는 곳은 시험뿐(서버 · 예측 코드 0)
-- 되돌리기 = 앞 마이그레이션(20261116210100)의 함수 본문으로 CREATE OR REPLACE.

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
    WHERE w.hop < LEAST(depth, CASE WHEN start_id LIKE 'asset:market:%' THEN 1 ELSE 3 END)
      AND (w.hop = 0 OR w.entity NOT LIKE 'asset:market:%')
  ), first AS (
    SELECT DISTINCT ON (entity) entity, hop FROM walk ORDER BY entity, hop
  )
  SELECT DISTINCT ON (c.entity) c.entity, f.hop, c.predicate, p.entity
  FROM first p
  CROSS JOIN LATERAL (
    SELECT x.object AS entity, x.predicate FROM forecast.relation x
    WHERE x.subject = p.entity AND x.available_at <= as_of AND x.valid_from <= as_of AND (x.valid_to IS NULL OR x.valid_to > as_of)
    UNION ALL
    SELECT x.subject, x.predicate FROM forecast.relation x
    WHERE x.object = p.entity AND x.available_at <= as_of AND x.valid_from <= as_of AND (x.valid_to IS NULL OR x.valid_to > as_of)
  ) c
  JOIN first f ON f.entity = c.entity AND f.hop = p.hop + 1
  WHERE p.hop < LEAST(depth, 3) AND (p.hop = 0 OR p.entity NOT LIKE 'asset:market:%')
  ORDER BY c.entity, c.predicate, p.entity
$$;
