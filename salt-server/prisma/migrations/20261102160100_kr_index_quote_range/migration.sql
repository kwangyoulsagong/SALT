-- SRV-REQ-042 FR-2 (2026-11-02, F011 국내 탭 요약) — 대표 칸 아래 줄(고가 · 저가 · 거래대금)을 지수에도.
-- KIS 지수 조회(FHPUP02100000)가 이미 주던 값(bstp_nmix_hgpr · lwpr · acml_tr_pbmn)을 버리고 있었다. 2026-11-02 실측으로 확인.
-- 값이 없을 수 있어 nullable — 다음 지수 회차(정규장 매분)가 채운다.
--
-- 롤백: ALTER TABLE kr_index_quotes DROP COLUMN high, DROP COLUMN low, DROP COLUMN trade_value;
ALTER TABLE kr_index_quotes
  ADD COLUMN high        numeric(18,4),
  ADD COLUMN low         numeric(18,4),
  ADD COLUMN trade_value numeric(38,10);
