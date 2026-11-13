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

## 2026-11-12 — 서버 S3b 확인 2회차

- 변이 11/11 · EXPLAIN · 429 · 소유자 판정 · 국내 스트림 · 게스트 실화면 · identity 중단 중 검증 — 새 결함 0. 상세 루트 체크리스트 `requirements/reports/checklists/MONEY-S3b-identity-accounts.md`

## 2026-11-12 — 서버 S3c 내 데이터(`MONEY-S3c-identity-my-data`)

루트 `requirements/specs/done/MONEY-S3c-identity-my-data-slice.md` · 체크리스트 `requirements/reports/checklists/MONEY-S3c-identity-my-data.md`

| 바뀐 것 | 확인 |
|---|---|
| FR-3 내보내기 · FR-4 계정 삭제(지우기 허가 · 서비스마다 · 계정 마지막 · 삭제 기록 · 갱신 401) | `./gradlew check` · `MyDataEndToEndTest` 5 · Express 1294 · BFF 465 · 변이 8/8 · 실스택 · 실화면 |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| ~~FR-6 분류 · FR-7 계측~~ | S3c 를 내보내기 · 삭제로 좁힘 | 서버 S3d — **닫힘 2026-11-13**(아래 S3d 절) |
| 삭제 직후 남은 접근 토큰(최대 15분) | 접근 토큰은 서명만 본다 — 지운 기기 쿠키는 그 자리에서 지움 · 갱신은 401 | 토큰 폐기 목록이 필요해질 때(배포 `OPS-001`) |

## 2026-11-13 — 서버 S3d 개인 데이터 등급 · AI 로 가는 것 · 사용 계측(`MONEY-S3d-identity-classify-usage`)

| 항목 | 결과 |
|---|---|
| FR-6 등급 경로 | 서비스 여섯 `GET /api/<service>/me/data-classification` 200 · 아웃박스 0 · 토큰 없음 401 · 없는 서비스 404(종단) |
| FR-6 AI 입력 | `llmInputs.test.ts` — 바꾸면 프롬프트가 바뀌는 칸 = 공개 목록(해설 · 등락 한 줄) · 뉴스 주소 · 시각 미전송 · `ExplainCaller.userId` 에 사람 id 를 넣으면 컴파일 오류(`@ts-expect-error`) |
| FR-7 계측 | `POST /api/identity/me/usage` — 세 번 = 한 행 3 · 해시 ≠ id · 모르는 값 400 · 401 · 내보내기 열에 해시 0 · 계정 삭제 때 함께 지움(실스택 임시 사용자 2행 → 0) |
| 검증 | `./gradlew check` 통과 · 종단 8/8 · Express build · lint · test 1300 · layer-check · EXPLAIN(upsert 는 PK 중재 16ms · 주간 집계 18ms · 주석 읽기 7ms) |
| 변이 | 9/9 — Express 주석 하나 빠짐 · 프롬프트 칸 추가 · 공개 칸 빠짐 · 모르는 등급 통과 · (Kotlin) 민감 → 기록 · upsert `DO NOTHING` 외 BFF 셋 |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 결제 문자 원문 미보관(FEATURE-015 FR-5 첫 줄) | 결제 문자 입력 자체가 없다 | 결제 문자 입력이 생길 때 |
| 삭제 직후 남은 접근 토큰(최대 15분) | S3c 그대로 | 배포 `OPS-001` |
