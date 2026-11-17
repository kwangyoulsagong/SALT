-- SRV-REQ-058 FR-9 (2026-11-17) — DART 원문 디코딩 결함 고침 뒤 다시 받기 표시.
-- DART 원문은 charset=euc-kr 이라 적고 UTF-8 을 보낸다 — 선언을 믿은 디코더가 2b(2026-11-14) 이후 공시 본문 전부의 한글을 깨뜨렸다.
-- 고친 디코더가 읽은 본문(새로 받을 때 · 다시 받을 때)만 이 열이 찬다 — 비어 있는 via = 'dart' 행이 다시 받을 대상(재기동 시각과 무관).
-- 다시 받은 본문은 fetched_at(사실의 알게 된 시각)을 지킨다. 추가만 · 롤백 = DROP COLUMN.
ALTER TABLE "news_ai_body" ADD COLUMN "refetched_at" TIMESTAMPTZ(3);
