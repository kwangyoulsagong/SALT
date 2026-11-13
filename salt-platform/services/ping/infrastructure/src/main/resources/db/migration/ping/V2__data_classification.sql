-- 개인 데이터 등급(`SRV-REQ-048` FR-6 · `DB-REQ-040` FR-6, 서버 S3d 2026-11-13) — 내보내는 사람 표마다 주석 하나 "<등급>: <설명>".
-- 등급 셋: record(기록) · financial(금액 — 수입 · 지출 · 목표) · sensitive(감정 · 급여 · 사람 이름, FEATURE-015 FR-5).
-- 설명은 설정 화면 "저장하는 것" 에 그대로 나온다(`UserRows.classification`). 사람 표에 등급이 없으면 `MyDataEndToEndTest` 가 깬다.
COMMENT ON TABLE ping_check IS 'record: 종단 확인 요청';
COMMENT ON TABLE ping_echo IS 'record: 종단 확인 응답';
