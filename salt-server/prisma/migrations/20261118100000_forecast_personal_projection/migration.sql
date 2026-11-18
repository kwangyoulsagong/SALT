-- DB-REQ-029 (2026-11-18, 예측 FC-REQ-024 FR-1 · 3 · 4 · 6, 루트 MONEY-O4-personal-projection-scoring-slice.md) — 개인 재무 구간 채점 · 소비자물가 뷰.
-- 추가만(표 둘 · 뷰 둘 · 권한). 쓰기는 salt-forecast 만(db-contract.md §1), 서비스(savings · household)는 뷰 SELECT 만.
-- 사람 칸은 해시뿐(원천 export 뷰의 sha256(user_id)) — 원 사용자 id · 금액 0(FC-REQ-024 FR-5 · 수용 기준 1).
-- 롤백: DROP VIEW forecast.v_price_index, forecast.v_personal_coverage; DROP TABLE forecast.personal_projection_score, forecast.personal_projection;

-- FR-1 — 발행 사본(원천: savings.v_projection_outcome_export · household.v_landing_outcome_export). 원천에서 사라지면(계정 삭제) 예측이 지운다
CREATE TABLE forecast.personal_projection (
  issuance_id      uuid        PRIMARY KEY,
  kind             text        NOT NULL CHECK (kind IN ('savings_reach', 'household_landing')),
  subject_hash     text        NOT NULL,
  series_key       text        NOT NULL,                 -- 같은 말을 여러 번 한 묶음: 저축 = 목표 해시, 가계부 = 사람 해시 + 달
  issued_at        timestamptz NOT NULL,
  method           text        NOT NULL,
  reason           text,
  history_n        integer     NOT NULL,                 -- 표본(저축 다 찬 달 수 · 가계부 기록 일수)
  has_interval     boolean     NOT NULL,
  early_month      date,                                 -- 저축 빠른 끝(그 달 1일)
  late_month       date,                                 -- 저축 늦은 끝 — null = 열림
  include_interest boolean,                              -- 저축 — 이자 포함 계획(도달은 적립 합으로만 잡혀 늦게 판정될 수 있다)
  target_month     date,                                 -- 가계부 그 달 1일
  days_left        integer,                              -- 가계부 발행일 포함 남은 날
  first_seen_at    timestamptz NOT NULL
);
CREATE INDEX personal_projection_kind_idx ON forecast.personal_projection (kind, issued_at);

-- FR-3 — 판정(닫힌 것만 한 번). counted = 커버리지에 세나(저축은 목표 · 달마다 마지막 발행만, 보관된 목표는 excluded)
CREATE TABLE forecast.personal_projection_score (
  issuance_id uuid        PRIMARY KEY REFERENCES forecast.personal_projection (issuance_id) ON DELETE CASCADE,
  outcome     text        NOT NULL CHECK (outcome IN ('hit', 'miss_early', 'miss_late', 'miss_below', 'miss_above', 'excluded')),
  decided_on  date        NOT NULL,                      -- 판정이 닫힌 KST 날 — 커버리지 기간의 기준
  counted     boolean     NOT NULL,
  scored_at   timestamptz NOT NULL
);
CREATE INDEX personal_projection_score_decided_idx ON forecast.personal_projection_score (decided_on);

-- FR-4 — 종류 · 기간(3 · 6개월)별 커버리지. 서비스가 화면 문장("90% 구간"이 아니라 10~90% 분위 = 명목 80%)을 만든다. 사람별 행 0
CREATE VIEW forecast.v_personal_coverage AS
SELECT p.kind,
       w.months                                                    AS window_months,
       count(*)                                                    AS intervals,
       count(*) FILTER (WHERE s.outcome = 'hit')                   AS hits,
       count(DISTINCT p.subject_hash)                              AS people,
       0.8::double precision                                       AS nominal,
       max(s.scored_at)                                            AS scored_at
FROM forecast.personal_projection_score s
JOIN forecast.personal_projection p USING (issuance_id)
CROSS JOIN (VALUES (3), (6)) AS w(months)
WHERE s.counted
  AND s.decided_on > ((now() AT TIME ZONE 'Asia/Seoul')::date - make_interval(months => w.months))::date
GROUP BY p.kind, w.months;

-- FR-6 — 소비자물가지수(ECOS 901Y009 총지수, 월). available_at = 그 달을 발표한 시각. 기준 연도가 바뀌면 시리즈를 통째로 바꾼다(한 기준만 있다)
CREATE VIEW forecast.v_price_index AS
SELECT DISTINCT ON (observed_at)
       'kr_cpi'::text                                              AS series,
       (observed_at AT TIME ZONE 'Asia/Seoul')::date               AS month,
       value,
       unit                                                        AS base,
       available_at
FROM forecast.series_point
WHERE source = 'ecos' AND series_id = 'kr_cpi_total'
ORDER BY observed_at, available_at DESC;

-- 서비스 계정 — 뷰 SELECT 만. 역할이 없는 DB(Prisma 섀도 · 서버 시험 DB)에선 건너뛴다
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'svc_savings') THEN
    GRANT USAGE ON SCHEMA forecast TO svc_savings;
    GRANT SELECT ON forecast.v_personal_coverage, forecast.v_price_index TO svc_savings;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'svc_household') THEN
    GRANT USAGE ON SCHEMA forecast TO svc_household;
    GRANT SELECT ON forecast.v_personal_coverage TO svc_household;
  END IF;
END $$;
