-- 도메인 사용 계측 — 주간 활성 · 재개율 · 카드 클릭(FEATURE-015 FR-6 · `SRV-REQ-048` FR-7 · `OPS-002`, 서버 S3d 2026-11-13).
-- `ops/salt.sh usage` 가 부른다. 원천 identity.usage_day(사람 칸 = 해시 · 하루 · 도메인 · 종류 · 횟수, 금액 0).
--   활성   = 그 주(월요일 시작, KST 날짜) 그 도메인 문서를 연 사람 수(visit)
--   재개율 = 지난주 활성이었던 사람 중 이번 주에도 활성인 비율(지난주 0명이면 -)
--   클릭   = 홈 카드를 누른 횟수(card_click 합)
-- 최근 8주. 사람 id 를 읽지 않는다.
WITH weeks AS (
  SELECT date_trunc('week', d)::date AS week
    FROM generate_series((now() AT TIME ZONE 'Asia/Seoul')::date - 49, (now() AT TIME ZONE 'Asia/Seoul')::date, interval '7 day') AS d
),
domains(shell_domain) AS (VALUES ('savings'), ('household'), ('invest'), ('tips')),
active AS (
  SELECT DISTINCT date_trunc('week', on_day)::date AS week, shell_domain, user_hash
    FROM identity.usage_day
   WHERE kind = 'visit' AND on_day >= (now() AT TIME ZONE 'Asia/Seoul')::date - 63
),
clicks AS (
  SELECT date_trunc('week', on_day)::date AS week, shell_domain, sum(times) AS n
    FROM identity.usage_day
   WHERE kind = 'card_click' AND on_day >= (now() AT TIME ZONE 'Asia/Seoul')::date - 56
   GROUP BY 1, 2
)
SELECT to_char(w.week, 'MM-DD'),
       d.shell_domain,
       (SELECT count(*) FROM active a WHERE a.week = w.week AND a.shell_domain = d.shell_domain),
       CASE WHEN (SELECT count(*) FROM active p WHERE p.week = w.week - 7 AND p.shell_domain = d.shell_domain) = 0 THEN '-'
            ELSE round(100.0 * (SELECT count(*) FROM active p JOIN active a ON a.user_hash = p.user_hash AND a.shell_domain = p.shell_domain AND a.week = w.week
                                 WHERE p.week = w.week - 7 AND p.shell_domain = d.shell_domain)
                       / (SELECT count(*) FROM active p WHERE p.week = w.week - 7 AND p.shell_domain = d.shell_domain)) || '%'
       END,
       coalesce((SELECT n FROM clicks c WHERE c.week = w.week AND c.shell_domain = d.shell_domain), 0)
  FROM weeks w CROSS JOIN domains d
 ORDER BY w.week DESC, d.shell_domain;
