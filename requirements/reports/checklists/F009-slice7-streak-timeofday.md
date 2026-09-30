# F009 슬라이스 7 — 연승 · 연패 · 진입 시간대 · 요일 (+ AI 해설 자리) — 체크리스트 (2026-09-27)

영역: `salt-server/requirements/reports/checklists/SRV-REQ-038.md` · `bff/requirements/reports/checklists/BFF-REQ-038.md` · `salt-microFe/requirements/reports/checklists/FE-REQ-039.md` §슬라이스 7 · `salt-microFe/requirements/reports/checklists/FE-REQ-038.md` §2026-09-27

| 확인 | 결과 |
|---|---|
| 서버 | `npm test` 487 / 0(+11, `streakTiming.test.ts`) · `npm run build` · `npm run lint` · Swagger(`/mirror` 응답에 `streak` · `timing`) |
| 서버 실 DB | 로컬 유스케이스 61ms — 결정 결과 0건이라 빈 모양만(`current: null` · `bands: null` · 요일 7칸 0건) |
| BFF | `npm test` 167 / 0(+4) · `npm run build` |
| 프론트 | `pnpm check-types` · `pnpm lint` · `pnpm test`(ui 43 · core 26) · `web` · `web-tax` 빌드 통과(워크트리 `next build` — `/coach/report` 110 kB · `/investments/[symbol]` 115 kB, web-tax 102 kB) |
| 화면 | Playwright 고정 응답 1280 — 미러에 연승 · 연패(관찰된 쪽만 패턴 문장 + 금액 비교 한 줄) · 시간대 · 요일 줄(칸마다 표본 배지 · 날짜만 적은 건수). 가짜 계정 값이다 |
| AI 해설 고침 | 막힌 모드에 제목 + 이유 + 표본 수 · 버튼 · 성적 · 사례 0 · 해설을 거래 기록 폼 위로. `check-types` · `lint` 만 |
| 공통 수용 기준 | 주문 경로 0 · 금액 서버(`Decimal`, 원 반올림 응답 변환 한 곳 — 프론트는 표시만) · 명령형 · 확신 · 목표가 0 · 막는 동작 · 저장 · 알림 0 · 3종 규칙 유지(막힌 해설에 성적 · 사례 없이 버튼도 없음) · LLM 호출 0 · 표본 기준 프론트 상수 0 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 실데이터로 연속 · 시간대 값 | 로컬 DB 결정 결과 0건 — 빈 모양 · 고정 응답으로만 | 청산이 쌓인 계정으로 `QA-001` 로그인 QA(사용자) |
| 실 토큰으로 서버 → BFF → 화면 | 로컬 토큰 발급 불가 · 떠 있는 BFF · 서버가 이 브랜치 코드가 아니다 | 머지 뒤 재기동 · `QA-001` 로그인 QA |
| AI 해설 막힌 모드 · 새 순서를 로그인 화면에서 | 타입 · 린트로만 확인 — 화면으로 보지 않았다 | `QA-001` 로그인 QA(사용자) |
| 375 폭 · 200% 확대 · 대비 | 1280 한 폭만 봤다 | `QA-001` 로그인 QA 때 같이 |
| 월간 복기에 연속 · 시간대 | FEATURE-009 FR-28 항목이 아니다 | 복기에서 보고 싶다는 신호 |
| CVaR(FR-26) | 사용자 결정 — 주식 확장 때 | 주식 확장(시기 미정) |
| `refs/original` 백업 참조 | push 전 커밋 메시지 번호(FR-11 → FR-12)를 고치느라 `filter-branch` 가 남겼다. 삭제는 권한 분류기가 막았다 | 사용자가 push 전에 지운다 |
