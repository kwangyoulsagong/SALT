-- DB-REQ-035 FR-1 · FR-4 (2026-11-02, F011 국내 탭 요약) — 국내 지수 장중 분 기록. 요약 띠 스파크라인(SRV-REQ-042 FR-2).
-- kr_index_quotes 는 지수당 최신 한 행(덮어쓰기)이라 장중 선을 그릴 수 없다. 매분 지수 회차가 정규장에만 한 행씩 쌓는다.
-- at 은 분 단위로 내린 UTC 벽시계(timestamp without time zone — 다른 시세 테이블과 같은 규칙). 같은 분 두 번 = 1행(upsert).
-- 보존 10일(달력 — 긴 연휴에도 3거래일 이상). 정리는 장 마감 뒤 하루 한 번(kr-stock.worker).
--
-- 롤백: DROP TABLE kr_index_ticks; (원장 무관 · 다른 테이블이 참조하지 않는다)
CREATE TABLE kr_index_ticks (
  code  text          NOT NULL,
  at    timestamp(3)  NOT NULL,
  value numeric(18,4) NOT NULL,
  CONSTRAINT kr_index_ticks_pkey PRIMARY KEY (code, at)
);
