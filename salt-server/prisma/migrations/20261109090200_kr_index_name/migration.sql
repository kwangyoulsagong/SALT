-- F016 단계 C (2026-11-09) — 지수 · 업종 이름. DB-REQ-041 · SRV-REQ-051 FR-7.
-- 추가만. 롤백 = DROP TABLE kr_index_name.
-- 분해 카드가 "업종 몫" 대신 "전기전자 몫"으로 읽히게 — 이름은 원천(KIS 기간별 시세 output1.hts_kor_isnm) 값이다. 화면에 코드 → 이름 표를
-- 두지 않는다(틀린 이름을 지어낼 수 있다). 기간별 시세 회차가 지수마다 하루 한 번 덮는다
CREATE TABLE kr_index_name (
  code       text         PRIMARY KEY,
  name       text         NOT NULL,
  updated_at timestamp(3) NOT NULL
);
