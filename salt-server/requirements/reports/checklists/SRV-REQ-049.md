# SRV-REQ-049 — 체크리스트

## 2026-11-05 — 금융 팁 S2a(`MONEY-S2a-tips-content`)

- 몫: 금융 팁 S2a 가 남긴 몫: content 법적 선 검사기(`LegalLine`, Kotlin)와 코치 말투 검증기(Express `languageGuard.ts`)를 **S6 코치 이전 때 한 모듈로**(FR-4 와 같이). 지금은 꼴을 옮겨 적은 두 벌
- 검증: 슬라이스 검증 그대로(`requirements/reports/checklists/MONEY-S2a-tips-content.md`) — 이 REQ 의 수용 기준은 바뀌지 않았다
- 미검증: 없음(이 몫 안)

## 2026-11-06 — 서버 S2c notification(`MONEY-S2c-notification`) · `9cee4715` · `33e949e8` · `2fa68f61` · `f1a3c64c`

- 모듈 · Flyway V1 · `CoachComposition`(릴레이 원천만)
- 검증: `./gradlew check` · 로컬 운영 DB coach 스키마 표 넷
- 미검증: 없음(이 몫 안)

## 2026-11-26 — 서버 S4a 밴드 적립 → Kotlin portfolio(`MONEY-S4a-portfolio-plan`, `feat/srv-req-049-s4-portfolio`)

- 검증: `./gradlew check` 통과(57초) — `PlanPolicySpec` 50(옛 Express 시험 기대값 그대로) · `PortfolioPlanEndToEndTest` 4(설정 전 · 첫 저장 → 스냅샷 → 체크 → 이번 달 · 거절 경계 · svc_portfolio 권한 · 내 데이터) · `MyDataEndToEndTest` · `ArchitectureTest`(Modulith · ArchUnit)
- 검증: Express `npm run build` · `lint` · `npm test` 2002/2002 · `test:layer-check` 10/6 · `prisma validate` · `/api/plan/weekly` 404(은퇴)
- 검증: 실스택(임시 identity 계정 · BFF 4001 → platform 4010): 설정 전 · 읽기 전용 키 422 `PLAN_BAND_READ_ONLY` · 단위 422 · 첫 저장 `startedWeek` 2026-11-23 · 주 150,000 × 2 · 지난 주 422 `PLAN_WEEK_NOT_CURRENT` · 체크 → 연속 1 · 이번 달 진행 50% · 미래 달 400 · 계정 삭제 → portfolio 지운 행 3 · 남은 행 0
- 검증: 삭제한 줄 수(FR-7): Express `src/plan` 28파일 2,246줄 · composition · app · env 몫
- 검증: drop 적용(사용자 "베스트케이스로 결정") — 덤프 `~/salt-backups/2026-11-26-public-plan-tables-before-drop.dump` · 복원 시험 · `migrate deploy`
- 검증: 지연 재측정(부하 1.84) — `/plan/weekly` p95 5ms · BFF p95 26ms
- 미검증: 400 바디의 `errors[].message` 문구가 옛 Zod 영어 문장과 다르다(필드 경로 · 상태 · 코드는 같다) — BFF · 화면은 읽지 않는다
