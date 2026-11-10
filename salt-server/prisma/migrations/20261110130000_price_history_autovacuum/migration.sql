-- price_history 자동 청소 문턱 — 기본(죽은 행 20%)이면 365만 행 표가 73만 죽은 행이 쌓여야 청소한다(`DB-REQ-017` 2026-11-10).
-- 오늘 국내 5분봉처럼 분마다 고쳐 쓰는 행은 죽은 버전이 쌓여 인덱스 스캔이 71행에 페이지 4,843개를 읽었다(판단 상세 3.5초 · BFF 504).
-- 2% 로 낮춘다(`performance-database.md` §7 "갱신이 잦은 테이블은 임계값을 낮춘다"). 표 설정만 — 행 · 인덱스 변경 0, 되돌리기는 RESET
ALTER TABLE "price_history" SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_analyze_scale_factor = 0.02);
