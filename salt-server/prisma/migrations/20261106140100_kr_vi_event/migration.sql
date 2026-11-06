-- DB-REQ-041 FR-2 (2026-11-06, F016 단계 A) — VI 발동 사건. KIS VI 현황(FHPST01390000)을 장중 1분마다 시장 전체 한 번 받는다.
-- (종목 · 발동 시각) 한 행 — 다음 회차는 해제 시각 · 괴리율만 덮는다. 코드는 마스터 FK 를 걸지 않는다: 현황에 ETN(Q 접두) ·
-- 마스터 밖 종목이 섞여 온다(같은 날 실측). 시각은 UTC 벽시계. 화면은 추적 종목의 오늘 마지막 사건만 읽는다(code, triggered_at desc).
--
-- 롤백: DROP TABLE kr_vi_event; (다른 테이블이 참조하지 않는다)
CREATE TABLE kr_vi_event (
  code             text          NOT NULL,
  triggered_at     timestamp(3)  NOT NULL,
  released_at      timestamp(3),
  kind             text,                     -- static | dynamic | both (KIS vi_kind_code 1 · 2 · 3)
  trigger_price    numeric(38,10),           -- 발동가(원)
  static_gap_rate  numeric(18,8),            -- 정적 기준가 대비 괴리율(%)
  dynamic_gap_rate numeric(18,8),            -- 동적 기준가 대비 괴리율(%)
  trigger_count    integer,                  -- 그날 몇 번째
  collected_at     timestamp(3)  NOT NULL,
  CONSTRAINT kr_vi_event_pkey PRIMARY KEY (code, triggered_at)
);
