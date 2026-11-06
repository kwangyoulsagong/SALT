-- DB-REQ-041 FR-6 (2026-11-06, F016 단계 A) — 국내 현재가 상태 칸 넓히기. 열 추가만(2단계 아님 · 기존 행은 기본값).
-- 2026-11-06 코스피 서킷브레이커 날 화면이 정지를 몰라 "10분 전 시세"로 보였다 — VI · 투자유의 · 관리 · 정리매매 · 단기과열과
-- 마지막 체결 시각을 숫자 옆에 보이려는 칸. KIS 현재가(FHKST01010100) 응답에 이미 있는 필드다(같은 날 실측).
-- last_trade_at 은 UTC 벽시계(timestamp without time zone — price_updated_at 과 같은 규칙).
--
-- 롤백: ALTER TABLE kr_stock_quotes DROP COLUMN vi_code, DROP COLUMN caution_flag, DROP COLUMN managed_flag,
--       DROP COLUMN liquidation_flag, DROP COLUMN short_overheat_flag, DROP COLUMN last_trade_at;
ALTER TABLE kr_stock_quotes
  ADD COLUMN vi_code             text,
  ADD COLUMN caution_flag        boolean NOT NULL DEFAULT false,
  ADD COLUMN managed_flag        boolean NOT NULL DEFAULT false,
  ADD COLUMN liquidation_flag    boolean NOT NULL DEFAULT false,
  ADD COLUMN short_overheat_flag boolean NOT NULL DEFAULT false,
  ADD COLUMN last_trade_at       timestamp(3);
