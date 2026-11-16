-- F017 v4 순서 3b (2026-11-16) — DART export 뷰에 접수일. 사전등록 event-window@2(게시 시각 = min(처음 본 시각, 접수일 23:59:59 KST)).
-- 1년 백필분은 처음 본 시각이 백필 날이라 그대로 쓰면 한 해 공시가 백필 하루에 몰린다. 끝 열만 더한다(CREATE OR REPLACE VIEW).
-- 롤백 = 20261116150000 의 뷰 정의로.
CREATE OR REPLACE VIEW public.v_dart_filing_export AS
SELECT rcept_no, stock_code, report_name, first_seen_at, rcept_date
FROM public.dart_filing;
