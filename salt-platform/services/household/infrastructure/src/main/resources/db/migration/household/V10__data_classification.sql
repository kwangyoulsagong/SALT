-- 개인 데이터 등급(`SRV-REQ-048` FR-6 · `DB-REQ-040` FR-6, 서버 S3d 2026-11-13) — 내보내는 사람 표마다 주석 하나 "<등급>: <설명>".
-- 등급 셋: record(기록) · financial(금액 — 수입 · 지출 · 목표) · sensitive(감정 · 급여 · 사람 이름, FEATURE-015 FR-5).
-- 설명은 설정 화면 "저장하는 것" 에 그대로 나온다(`UserRows.classification`). 사람 표에 등급이 없으면 `MyDataEndToEndTest` 가 깬다.
COMMENT ON TABLE expense IS 'financial: 적은 지출';
COMMENT ON TABLE expense_tag IS 'sensitive: 지출에 단 감정 · 다음 날 만족';
COMMENT ON TABLE household_setting IS 'sensitive: 시급(노동시간 환산)';
COMMENT ON TABLE person_entry IS 'sensitive: 사람 장부 — 이름과 주고받은 금액';
COMMENT ON TABLE revolving_plan IS 'financial: 리볼빙 명세서';
COMMENT ON TABLE recurring_template IS 'financial: 반복 지출';
COMMENT ON TABLE recurring_occurrence IS 'financial: 반복 지출 예정 회차';
COMMENT ON TABLE fixed_cost_increase IS 'financial: 고정비 오름';
COMMENT ON TABLE fixed_cost_hidden IS 'record: 숨긴 고정비 후보';
COMMENT ON TABLE challenge IS 'record: 챌린지';
COMMENT ON TABLE challenge_day IS 'record: 챌린지 지킨 날';
COMMENT ON TABLE challenge_saving IS 'financial: 챌린지로 아낀 돈';
COMMENT ON TABLE month_close IS 'financial: 월 마감 답';
COMMENT ON TABLE month_close_envelope IS 'financial: 월 마감 봉투';
COMMENT ON TABLE budget IS 'financial: 수입 · 예산';
COMMENT ON TABLE budget_envelope IS 'financial: 예산 봉투';
COMMENT ON TABLE landing_issued IS 'financial: 이번 달 착지 예상';
COMMENT ON TABLE calendar_sticker IS 'record: 무지출 달력';
COMMENT ON TABLE custom_category IS 'record: 내 분류';
COMMENT ON TABLE occasion_envelope IS 'financial: 해 경조사 봉투';
