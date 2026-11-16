-- F017 v4 순서 5b-2 (2026-11-16) — 온톨로지 ① 사실의 수급 원천. FC-REQ-022 FR-16 · DB-REQ-043 FR-15.
-- 추가만. 롤백 = DROP VIEW public.v_kr_investor_flow_export, public.v_kr_program_flow_export.
-- 주인 서버 market — 예측은 export 뷰로만(DB-REQ-036 FR-3 목록 무증가). 사용자 열 0. 시각 열은 Prisma 기본(tz 없음 · UTC 값).

CREATE VIEW public.v_kr_investor_flow_export AS
SELECT code, trade_date, individual_value, foreign_value, institution_value, collected_at
FROM public.kr_stock_investor_flows;

CREATE VIEW public.v_kr_program_flow_export AS
SELECT code, at, program_net_value, collected_at
FROM public.kr_flow_intraday;
