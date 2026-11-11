# F017 v2 단계 3 해설 늘 — 체크리스트

| 항목 | 상태 | 근거 |
|---|---|---|
| 서버 검증 | 충족 | prisma generate · migrate deploy · build · lint · test · layer-check · UPDATE 트리거 오류 확인 · `EXPLAIN` 인덱스 스캔 |
| BFF 검증 | 충족 | build · test 448 · 실호출 |
| FE 검증 | 충족 | check-types 13/13 · lint 13/13 · test(core 298 · ui 63) · 훅 사후(음성 대조 exit 2) |
| 실데이터 배치 | 충족 | 첫 회차 후보 106 · 생성 12 · 실패 0 · 인용 없는 문장 0 |
| 실화면 | 충족 | 임시 사용자 실로그인 1440 · 국내 000270 최신 AI · BTC 사실표 · 이전 · 없음 · 실패 · 느림 · 390 앱 웹뷰 · axe 0 |
| 미충족 | 기록 | 하루 LLM 시도 수 관찰 · 태그(단계 6) — 슬라이스 문서 표 |

## 확인 2회차 (2026-11-11, 사용자 "파이프라인 · 검증 · 버그 검증 다했는지" — 아니었다)

| 항목 | 상태 | 근거 |
|---|---|---|
| FE `pnpm test:layer-check` | 충족 | 차단 16 · 통과 10 |
| 서버 훅 사후(Bash 로 쓴 파일) | 충족 | 바뀐 21파일 exit 0 · 음성 대조(domain → @prisma/client) exit 2. BFF 는 훅 없음 |
| 공용 함수 소비처 | 충족 | `pickExplainProvider` · `ExplainCaller` · `usageSince` · `llmBudgetVerdict` — 소비처 grep 전부(라우터 · 두 공급자 · 배치) · 테스트 개정. 판단 · 점검 경로는 코드 변경 0 |
| 죽은 분기 | 삭제 | 사용자 · 클라이언트로 공급자 고르기 · 사용자별 상한 · env `COACH_LLM_LOCAL_USERS` · `LLM_USER_DAILY_CALL_LIMIT` — 소유자 판정 허용 목록 넷 → 셋 |
| 옛 전제 주석 | 고침 | 조립 · 라우팅 · 상한 · 버튼 컴포넌트 · BFF 테스트 표본 코드 |
| Swagger | 충족 | 새 경로 200 · 400 · 401, 옛 두 경로 없음(swagger-jsdoc 직접 생성) |
| 장중 부하 | 충족 | 배치가 돈 14:20 ~ 15:00 BFF 213요청 5xx 0 · 서버 오류 줄 0 |
| 문서 | 충족 | `DB-REQ-036` 부록 A · `FEATURE-017` FR-2 · 주인 REQ 18 · check-done |
