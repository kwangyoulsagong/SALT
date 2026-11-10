## F017 v2 단계 1b — 3종 채움 · 국내 단타 원장 (2026-11-10, `feat/f017-s1b-triad-backfill`)

| 항목 | 상태 | 근거 |
|---|---|---|
| FR-6 출처 라벨 | 충족 | 마이그레이션 적용(`prisma migrate deploy`) · CHECK 6값 · 국내 장기 51,305 → `backtest_full` · 롤백 SQL 머리 · `npm test` 1133/1133 · lint · build · 레이어 훅 사후(음성 대조 exit 2) · 서버 150요청 · 300모드 실측: 3종 결함 160 → 6 · p95 40ms(재시작 직후 292) |
| FR-1~5 · FR-6 등급 표 · 뷰 | 미착수 | 단계 2~4 |
