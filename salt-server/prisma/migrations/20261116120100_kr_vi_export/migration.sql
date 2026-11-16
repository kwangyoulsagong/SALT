-- F017 v4 순서 3 (2026-11-16) — 예측이 VI 사건을 읽는 export 뷰. FC-REQ-028 FR-7 · 사전등록 base-rate@3 K5.
-- 추가만. 롤백 = DROP VIEW public.v_kr_vi_export.
-- forecast 는 public 을 export 뷰로만 읽는다(ADR-007 · db-contract.md §2). 주인은 서버 market(kr_vi_event — 보관 400일).
-- 정적 VI 만 쓰지만 종류는 뷰가 거르지 않는다 — 거르는 규칙은 사전등록 한 곳(salt-forecast).

CREATE VIEW public.v_kr_vi_export AS
SELECT code, triggered_at, released_at, kind
FROM public.kr_vi_event;
