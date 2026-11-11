# F017 v2 단계 3 해설 늘 — 체크리스트

| 항목 | 상태 | 근거 |
|---|---|---|
| 서버 검증 | 충족 | prisma generate · migrate deploy · build · lint · test · layer-check · UPDATE 트리거 오류 확인 · `EXPLAIN` 인덱스 스캔 |
| BFF 검증 | 충족 | build · test 448 · 실호출 |
| FE 검증 | 충족 | check-types 13/13 · lint 13/13 · test(core 298 · ui 63) · 훅 사후(음성 대조 exit 2) |
| 실데이터 배치 | 충족 | 첫 회차 후보 106 · 생성 12 · 실패 0 · 인용 없는 문장 0 |
| 실화면 | 충족 | 임시 사용자 실로그인 1440 · 국내 000270 최신 AI · BTC 사실표 · 이전 · 없음 · 실패 · 느림 · 390 앱 웹뷰 · axe 0 |
| 미충족 | 기록 | 하루 LLM 시도 수 관찰 · 태그(단계 6) — 슬라이스 문서 표 |
