-- 개인 데이터 등급(`SRV-REQ-048` FR-6 · `DB-REQ-040` FR-6, 서버 S3d 2026-11-13) — 투자 쪽(Express) 내보내는 사람 표마다 주석 하나 "<등급>: <설명>".
-- 등급 셋: record(기록) · financial(금액 — 매입 · 보유 · 손익) · sensitive(감정 · 급여 · 사람 이름, FEATURE-015 FR-5 — 투자 쪽엔 없다).
-- 설명은 설정 화면 "저장하는 것" 에 그대로 나온다. Prisma 는 표 주석을 모른다 — 새 사람 표에 주석이 없으면 `userRows.test.ts` 가 이 폴더의 SQL 을 읽어 깬다.
COMMENT ON TABLE portfolio_holdings IS 'financial: 보유 종목 · 수량 · 매입가';
COMMENT ON TABLE portfolio_transactions IS 'financial: 적은 거래';
COMMENT ON TABLE trade_plans IS 'financial: 거래 계획';
COMMENT ON TABLE decision_outcomes IS 'financial: 판단 결과와 손익';
COMMENT ON TABLE monthly_reviews IS 'record: 월간 돌아보기';
COMMENT ON TABLE coach_recommendation_snapshots IS 'record: 코치 추천 기록';
COMMENT ON TABLE investment_insights IS 'record: 투자 인사이트';
COMMENT ON TABLE user_investment_profiles IS 'record: 투자 성향 설정';
COMMENT ON TABLE investment_watchlist IS 'record: 관심 종목';
COMMENT ON TABLE news_bookmarks IS 'record: 저장한 뉴스';
COMMENT ON TABLE user_mission_progress IS 'record: 옛 미션 진행(쓰지 않음)';
COMMENT ON TABLE user_achievements IS 'record: 옛 업적(쓰지 않음)';
COMMENT ON TABLE point_transactions IS 'record: 옛 포인트(쓰지 않음)';
COMMENT ON TABLE sentiment_alerts IS 'record: 옛 심리 알림(쓰지 않음)';
COMMENT ON TABLE smart_money_alerts IS 'record: 옛 큰손 알림(쓰지 않음)';
COMMENT ON TABLE execution_logs IS 'record: 옛 실행 기록(쓰지 않음)';
