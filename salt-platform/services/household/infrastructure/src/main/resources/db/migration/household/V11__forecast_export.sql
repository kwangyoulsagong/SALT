-- 착지 구간 채점용 export 뷰(`DB-REQ-038` FR-8 짝 · 예측 `FC-REQ-024` FR-1 · 2, 루트 `MONEY-O4-personal-projection-scoring-slice.md` 2026-11-18).
-- 예측(Python)은 이 뷰만 읽는다(`msa-services.md` §5). 나가는 것: 발행 id · 사람 해시 · 달 · 발행일 · 방법 · 이유 · 남은 날 · 판정.
-- **금액 0** — 실제 값(월 지출 합)은 뷰 안에서 구간과 비교해 below · inside · above 만 낸다(FR-2 "금액이 아니라 구간 안/밖").
-- 비교식은 `LandingEngine.track` 과 같다: 그 달 지출 합(`monthSummary` 와 같은 식 — spent_on 이 그 달인 금액 합), 양끝 포함.
-- 판정은 그 달 말일 + 7일(늦게 적는 지출)이 지난 KST 날부터 — 그 전엔 null. 구간 없는 발행(history_short)도 null.
-- 사람 해시 = sha256(user_id) — identity 계측 · savings 뷰와 같은 식. 롤백: DROP VIEW v_landing_outcome_export;
-- [jooq ignore start] 코드 생성(H2 흉내)이 뷰 · sha256 · LATERAL 을 못 읽는다 — 뷰는 생성 코드에 필요 없다(예측만 읽는다)
CREATE VIEW v_landing_outcome_export AS
WITH l AS (
    SELECT li.*,
           (li.month + interval '1 month' - interval '1 day')::date AS month_end,
           (li.month + interval '1 month' + interval '7 day')::date AS final_on
    FROM landing_issued li
)
SELECT l.id                                                  AS landing_id,
       encode(sha256(convert_to(l.user_id, 'UTF8')), 'hex')  AS subject_hash,
       l.month                                               AS target_month,
       l.issued_on,
       l.issued_at,
       l.method,
       l.reason,
       l.days_of_history,
       (l.month_end - l.issued_on + 1)                       AS days_left,
       l.final_on,
       CASE
           WHEN l.p_low IS NULL OR (now() AT TIME ZONE 'Asia/Seoul')::date < l.final_on THEN NULL
           WHEN t.total < l.p_low THEN 'below'
           WHEN t.total > l.p_high THEN 'above'
           ELSE 'inside'
       END                                                   AS outcome
FROM l
LEFT JOIN LATERAL (
    SELECT coalesce(sum(e.amount), 0) AS total
    FROM expense e
    WHERE e.user_id = l.user_id AND e.spent_on BETWEEN l.month AND l.month_end
) t ON true;

-- 예측 계정(`db/roles.sql` 의 svc_forecast)
GRANT USAGE ON SCHEMA household TO svc_forecast;
GRANT SELECT ON v_landing_outcome_export TO svc_forecast;
-- [jooq ignore stop]
