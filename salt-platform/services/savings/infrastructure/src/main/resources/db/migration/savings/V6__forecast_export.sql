-- 도달 구간 채점용 export 뷰(`DB-REQ-037` FR-3 짝 · 예측 `FC-REQ-024` FR-1 · 2, 루트 `MONEY-O4-personal-projection-scoring-slice.md` 2026-11-18).
-- 예측(Python)은 이 뷰만 읽는다(`msa-services.md` §5 "예측이 읽는다 = export 뷰"). 이벤트를 구독하지 않는다 — 배치라 상시 소비자가 없다.
-- 나가는 것: 발행 id · 사람 해시 · 목표 해시 · 날짜 · 방법 · 이유 · 도달 달 · 보관 달. **금액 0 · 원 사용자 id 0 · 목표 이름 0.**
-- 사람 해시 = sha256(user_id) — identity 계측(`V5__usage_day.sql`)과 같은 식. 같은 DB 에 사용자 표가 있어 비밀 값이 막는 것이 없다(S3d 판단 3).
-- 계정을 지우면 발행 행이 지워져(V4 예외) 뷰에서 사라진다 — 예측은 뷰에 없는 사본을 지운다.
-- 달은 KST 달력(적립 `deposited_on` 과 같은 기준). 롤백: DROP VIEW v_projection_outcome_export;
-- [jooq ignore start] 코드 생성(H2 흉내)이 뷰 · sha256 · LATERAL 을 못 읽는다 — 뷰는 생성 코드에 필요 없다(예측만 읽는다)
CREATE VIEW v_projection_outcome_export AS
SELECT p.id                                                         AS projection_id,
       encode(sha256(convert_to(g.user_id, 'UTF8')), 'hex')         AS subject_hash,
       encode(sha256(convert_to(g.id::text, 'UTF8')), 'hex')        AS goal_key,
       p.issued_at,
       p.method,
       p.p_low_date                                                 AS early_month,
       p.p_high_date                                                AS late_month,
       p.reason,
       p.months_of_history,
       g.include_interest,
       date_trunc('month', g.completed_at AT TIME ZONE 'Asia/Seoul')::date AS reached_month,
       date_trunc('month', g.archived_at AT TIME ZONE 'Asia/Seoul')::date  AS archived_month
FROM projection_issued p
JOIN goal g ON g.id = p.goal_id;

-- 예측 계정(`db/roles.sql` 의 svc_forecast — 지금 예측 배치는 DB 소유자로 붙지만 계정 분리 때 이 권한이 쓰인다)
GRANT USAGE ON SCHEMA savings TO svc_forecast;
GRANT SELECT ON v_projection_outcome_export TO svc_forecast;
-- [jooq ignore stop]
