# SRV-REQ-048 — 체크리스트

## 2026-11-06 — 서버 S2c notification(`MONEY-S2c-notification`) · `9cee4715` · `33e949e8` · `2fa68f61` · `f1a3c64c`

- 몫: FR-5 — `services/notification`(도메인 · 유스케이스 · jOOQ · 리스너 셋 · 정리 워커) · `NotificationController`(`/api/notifications` · `/prefs`) · Flyway notification V1 · coach V1(아웃박스만) · 가져오기 SQL · Express `notification` 삭제
- 검증: `./gradlew check`(`NotificationSpec` 5 · `NotificationEndToEndTest` 4) · Express build · lint · test 929 · 실스택 · 실화면 — 루트 체크리스트
- 수용 기준 4 충족 · 1~3 은 S3
- 미검증: 웹 알림 목록(화면 없음 — F006) · 앱 푸시 — 루트 표

## 2026-11-06 — 서버 S2c 확인 2회차

- 확인 2회차(`55b4290a`): 국내 종목 코드 관문 · enabled 타입 · Express 쓰기 실패 격리 — 결함 셋 고침, 입력 경계 · Swagger 6 · 데드레터 0. 상세 루트 체크리스트

## 2026-11-06 — 서버 S3a identity 셸 설정(`MONEY-S3a-identity-shell`) · `fc0207cb` · `7f2ba1ed`

- 몫: FR-1 · FR-2 — `services/identity`(도메인 `ShellPrefs` · 유스케이스 넷 · jOOQ `JooqShellPrefs` · `ShellController`) · Flyway identity V1(`user_domain_pref` + 공통 세 표 · 모양 CHECK 다섯) · `IdentityComposition` · `svc_identity` 로그인
- 은퇴: Express `onboarding` 조합 컨텍스트(5파일) · `/api/onboarding/status` · `PLATFORM_API_URL` · 저축 `/savings/goals/exists`(유스케이스 · 포트 · 저장소 · 테스트) — 삭제 251줄
- 검증: `./gradlew check` 통과(`ShellPrefsSpec` 6 · `IdentityShellEndToEndTest` 6 — 투자 미선택 · 거절 400 · 409 · DB 모양 검사 · `svc_identity` 남의 스키마 권한 오류) · Express build · lint · test 925 · `test:layer-check` · 실스택 · 실화면(루트 체크리스트)
- 수용 기준 1 충족 · 4 는 S2c · 2 · 3 은 S3c · S3b

## F017 v2 단계 2 점검 (2026-11-11, `feat/f017-s2-checks-plain-line`)

| 항목 | 상태 | 근거 |
|---|---|---|
| 이 REQ 에 닿은 변경 | 충족 | `coach/domain/ports.ts` 에 포트 `BaseRateReader` · `TradeCheckLedger`. 기존 포트 무변경 · `npm run build` · `npm run lint` · `npm test` 1200 통과 · `npm run test:layer-check` · 레이어 훅 사후 실행(음성 대조 exit 2) · `prisma migrate diff` 0 |

## F017 v2 단계 3 해설 늘 (2026-11-11, `feat/f017-s3-explain-always`)

| 항목 | 상태 | 근거 |
|---|---|---|
| Port | 충족 | build · 테스트 |

## F017 v2 단계 4 등급 (2026-11-11, `feat/f017-s4-grade`)

| 항목 | 결과 | 근거 |
|---|---|---|
| 이 REQ 에 걸린 몫 | 반영 | `salt-server/src/coach/domain/ports.ts` — 포트 `JudgmentTierReader` 추가. 주인 `SRV-REQ-053` FR-7 |
| 영역 검증 | 통과 | 서버 build · lint · test 1219 · test:layer-check / BFF test 449 · build / FE check-types · lint · test · test:layer-check / 예측 ruff · pyright · lint-imports · pytest · leakage |
| 이 REQ 의 기존 계약 | 변화 없음 | 칸을 더하기만 했다 — 지우거나 바꾼 필드 0 |

## F017 v2 단계 5 시나리오(`feat/f017-s5-short-direction`) (2026-11-11)

| 항목 | 결과 | 근거 |
|---|---|---|
| 포트 | 충족 | 타입 · 빌드 통과 |

## F016 단계 D 짝(2026-11-12) — 이 REQ 가 머리 주인인 파일

루트 `requirements/specs/done/F016-D-move-summary-slice.md` · 체크리스트 `requirements/reports/checklists/F016-D-move-summary.md`

| 바뀐 것 | 확인 |
|---|---|
| coach `domain/ports.ts`(머리 주인) — 포트 셋(`MoveCardReader` · `MoveSummaryStore` · `MoveSummaryWriter`) · 사용량 `purpose` 에 `move_summary` 추가. 알림 · identity 몫 변경 0 | 서버 빌드 · 레이어 훅 사후 실행 0 |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 없음 | — | — |

## 2026-11-12 — 서버 S3b(`MONEY-S3b-identity-accounts`)

루트 `requirements/specs/in-progress/MONEY-S3b-identity-accounts-slice.md` · 체크리스트 `requirements/reports/checklists/MONEY-S3b-identity-accounts.md`

| 바뀐 것 | 확인 |
|---|---|
| FR-8 · 9 — Kotlin 계정 · 토큰 · JWKS · `UserRegistered` · Express 리소스 서버 전환 | `./gradlew check` 274 · Express 1286 · BFF 457 · 실스택 · 실화면 |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| Prisma 마이그레이션 적용(승인 대기) · HS 삭제 2026-11-27 | 되돌리기 어려운 DB 작업 · 이중 기간 | 승인 즉시 · 2026-11-27 |
