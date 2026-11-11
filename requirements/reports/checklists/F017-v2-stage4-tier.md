# F017 v2 단계 4 등급 — 체크리스트

| 항목 | 상태 | 근거 |
|---|---|---|
| 사전등록이 먼저 | 충족 | `996117c2`(등록) → `4bd03b63`(첫 계산) |
| 예측 검증 | 충족 | ruff · format · pyright 0 · lint-imports 3 유지 · pytest 전체(실 DB 포함) · leakage · dry-run 4행 0.7초 · 실행 4행 0.73초 |
| DB | 충족 | `20261111160000_judgment_tier` 적용 · 계약 대조 테스트 · CHECK · 사용자 열 0 |
| 서버 검증 | 충족 | build · lint · test 1219 · test:layer-check · 훅 사후 11파일(대조군 exit 2) · Swagger |
| BFF 검증 | 충족 | test 449 · build · 재시작 · 실호출 두 종목 두 모드 |
| FE 검증 | 충족 | check-types 13/13 · lint 13/13 · test · test:layer-check · 훅 사후 3파일(대조군 exit 2) · `web-investment` 운영 빌드(worktree) 153 kB |
| 실화면 | 충족 | 셸 3010(3000 = 회사 작업, 그대로 둠) · BTC · 005930 1280 · BTC 390 앱 UA · route 검증됨 · 주의 · 옛 BFF · pageerror 0 · 소유자 토큰 콘솔 오류 0 |
| 소비처 | 충족 | `attachJudgmentTrack` — 종목 판단 · 해설 재료(해설은 판단 · 관측 · 꼬리표만 골라 써 등급이 LLM 입력 · 지문에 안 들어감) |
| 미충족 | 기록 | 참고 아닌 등급의 실데이터 화면 · 검증됨 시점 · 강등 실발생 — 슬라이스 문서 표 |
