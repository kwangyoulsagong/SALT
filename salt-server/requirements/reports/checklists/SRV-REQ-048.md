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
| 검증 | `./gradlew check` 통과 · 종단 8/8 · Express build · lint · test 1300 · layer-check · 서버 훅 사후 실행 8파일 0(음성 대조 2) · EXPLAIN(upsert 는 PK 중재 16ms · 주간 집계 18ms · 주석 읽기 7ms) |
| 변이 | 9/9 — Express 주석 하나 빠짐 · 프롬프트 칸 추가 · 공개 칸 빠짐 · 모르는 등급 통과 · (Kotlin) 민감 → 기록 · upsert `DO NOTHING` 외 BFF 셋 |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 결제 문자 원문 미보관(FEATURE-015 FR-5 첫 줄) | 결제 문자 입력 자체가 없다 | 결제 문자 입력이 생길 때 |
| 삭제 직후 남은 접근 토큰(최대 15분) | S3c 그대로 | 배포 `OPS-001` |

## F017 v4 순서 1b 짝 (2026-11-13) — 이 REQ 가 머리 주인인 파일

루트 `requirements/specs/in-progress/F017-v4-stage1-panel-slice.md` · 체크리스트 `requirements/reports/checklists/F017-v4-stage1-panel.md`

| 바뀐 것 | 확인 |
|---|---|
| `composition.ts` 등락 의존(`move`)에 원인 근거 리더(`PrismaMoveEvidenceReader`) 조립 한 줄 | 서버 build · lint · test 1379 · layer-check / BFF build · test 486 / FE check-types · lint 13/13 · test 361 / 훅 사후(대조군 둘 exit 2 → 18파일 0) / 변이 28/28 / 전 종목 157 실측(실패 0 · 원인 칸 null 0 · 금지어 0 · 서버 p95 25ms · BFF p95 34ms) / 실화면 국내 둘 · 코인 둘 × 1440 · 390(axe 0 · 넘침 0) · 옛 응답 · 미리보기(`route`) |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 없음 | — | — |

## F017 v4 1d 짝 (2026-11-13, `feat/f017-v4-s1d-coach-panel`)

| 항목 | 상태 | 근거 |
|---|---|---|
| 포트 `MoveCauseReader` 만 — identity · notification 0 | 충족 | 주인 REQ 체크리스트 |

## 2026-11-14 — F017 v4 2a 걸침(`SRV-REQ-058`)

- `composition.ts` 에 `news` AI 경로 본문 조립(`SRV-REQ-058` 2a) — identity · notification 무변경
- 검증은 `SRV-REQ-058` 체크리스트 — 이 REQ 의 기존 항목은 다시 열지 않음

## 2026-11-16 — 새 맥 이전(`OPS-002-new-mac-setup`) · `chore/new-mac-setup`

- 몫: `ops/salt.sh` 걸침(node 경로) — identity · notification 무변경
- 검증: 루트 체크리스트 `requirements/reports/checklists/OPS-002-new-mac-setup.md` — 이 REQ 의 기존 항목은 다시 열지 않음

## 2026-11-16 — F017 v4 순서 3a 짝

- `ops/salt.sh`(머리 주인)에 `forecast-intraday`(5분 · `StartInterval 300`) 이름 · plist · 상태 줄 — identity · notification 무변경
- 검증은 루트 체크리스트 `requirements/reports/checklists/F017-v4-stage3-intraday.md` — 이 REQ 의 기존 항목은 다시 열지 않음

## 2026-11-16 — `SRV-REQ-057` FR-8 짝

- `composition.ts`(머리 주인)에서 뉴스 수집기 · 기사 저장소를 변수로 꺼내 빈 날 메우기(`gap`)에 같이 꽂음 — identity · notification 무변경
- 검증은 `SRV-REQ-057` 체크리스트 — 이 REQ 의 기존 항목은 다시 열지 않음

## 2026-11-16 — F017 v4 순서 5 짝

- 공유 파일에 한 자리 — 이 REQ 기능 변경 없음. 검증 표는 루트 `requirements/reports/checklists/F017-v4-stage5-ontology.md`


## 2026-11-17 — F008 슬라이스 24 2단계(`feat/f008-slice24-s2-earnings-window`, 루트 `requirements/specs/in-progress/F008-slice24-kr-market-events-slice.md`)

이 REQ 몫: 짝(공유 파일 `coach/domain/ports.ts`) — `ForecastReader.earningsOutlook`

| 항목 | 상태 | 근거 |
|---|---|---|
| 빌드 · 린트 · 레이어 | 충족 | `npm run build` 0 · `npm run lint` 0 · `npm run test:layer-check` 차단 10 · 통과 6 |
| 단위 시험 | 충족 | `npm test` 1730/1730 — 새 시험 `dartEarnings`(실제 원문 픽스처 9건 · 분류 경계 표 19 · 결산 이름 8) · `collectDartEarnings` 6 · `refetchDartBodies` 2 · `dartDecode` 2 · `earningsOutlook` 11 · `macroEvents` 경계 |
| 마이그레이션 | 충족 | `20261117120000` · `120100` · `120200` 로컬 적용 — 추가만(표 · 뷰 · CHECK 넓히기 · 열 하나) |
| 실데이터 수집 | 충족 | DART 실호출: 유니버스 51종목 2016~ 실적 공시 5,245 · IR 4,006 · 예고 586 · 최근 1년 IR · 예고 본문 561건 전부 읽음(실패 0) — 실적 IR 174 · 결산 기간 158 |
| 분류 표본 눈 확인 | 충족 | IR 12건 무작위 — 첫 판 거짓 양성 2(기아 CLSA · 신한 MS: 내용 칸만 실적) → '개최목적' 칸만 · 결산 기간으로 고침 |
| EXPLAIN | 충족 | 새 쿼리 다섯 0.4~4.9ms — 대기 본문 부분 인덱스 · 종목 날짜 인덱스 · `event_reaction_stats_latest` |
| 응답(실DB · 프로세스 안) | 충족 | `GetSymbolEvents` 실DB 005930 · 000660 · 000270 · 035420 · BTC — 창 · 적중 · 빗나간 결산 · 반응 게이트, 코인 `null`, 1~24ms |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| HTTP 실토큰 응답(서버 · BFF 경로) | 로컬 옛 HS 창이 닫혀(11-16) 소유자 토큰을 만들 수 없다 — 서명 키 읽기는 권한 거부. 같은 유스케이스 · 리더 · 정책을 실DB 로 프로세스 안에서 돌렸다 | 사용자 로그인 화면 QA(`QA-001`) |
| DART 본문 다시 받기 실회차 | 서버 · 뉴스 워커가 새 코드로 같이 재기동해야 한다(옛 서버 추출은 옛 사실을 안 지운다) | 머지 · `ops/salt.sh restart server news` 뒤 첫 회차 — 634건 · 하루 안 |

## 2026-11-18 — F008 O3 해설 에이전트 도구(`feat/fc-req-023-agent-tools`)

- 이 REQ 몫 변경 0 — `userId: null` 타입 그대로 · 고르기 요청 타입에 사람 · 금액 필드 0(컴파일 시험)

## 2026-11-18 F006 코치 대화 1단계 — 같은 파일

- 이 REQ 항목 변경 0 · 영역 검증 전체 통과(루트 체크리스트 `F006-coach-conversation.md`)

## 2026-11-18 — F006 대화 2단계 짝(`feat/f006-coach-conversation-s2`)

- `coach/domain/ports.ts`(머리 주인)의 대화 메시지 포트에 `card` · `insightId`(주인 `SRV-REQ-028`). identity · notification 포트 변경 0 — 영역 시험 전부 통과

## 2026-11-18 F006 포지션 1단계(`feat/f006-position-overview`)

- `salt-server/src/composition.ts` — 포트폴리오 조립에 일봉 · 뉴스 감성 ACL 과 레이더 설정을 꽂았다. 기존 시험 전부 통과(서버 1895 · BFF 533 · FE check-types · lint)
- 미충족: 없음(이 REQ 몫 변경 0)
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-position-overview.md`

## 2026-11-18 F006 포지션 2단계(`feat/f006-position-trades`, 파일만 걸침)

- `salt-server/src/composition.ts` — portfolio 조립에 `ledger: { run: runInTransaction }` 한 줄. identity · 알림 무변경
- 미충족: 없음(이 REQ 몫 변경 0)
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-position-trades.md`

## 2026-11-18 F006 알림 화면(`feat/f006-alerts-screen`)

- 서버 경로는 S2c 그대로 — 실호출(임시 계정 · 알림 25건)로 켠 도메인만 · 끄면 목록 0 · 읽음 반영 확인
- 미충족: 없음(이 REQ 몫 변경 0)
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-alerts-screen.md`

## 2026-11-19 PC 격자 짝(`feat/f006-pc-panel-grid`, 파일만 걸침)

- 계정 삭제 · 내보내기 목록(`coach/infrastructure/userRows.ts`)에 `panel_layouts`
- 미충족: 없음(이 REQ 몫 변경 0) · 근거 루트 체크리스트 `requirements/reports/checklists/F006-pc-panel-grid.md`

## 2026-11-19 F003 v2 순서 2

- `salt-server/src/composition.mydata.ts` 내 데이터 목록에 plan 표 둘(`PLAN_USER_ROWS` — 내보내기 · 계정 삭제 실확인)
- 미충족: 없음(이 REQ 몫 변경 0)
- 근거: 루트 체크리스트 `requirements/reports/checklists/F003-v2-s2-plan-server.md`

## 2026-11-19 — `WEB-perf-req-close-slice.md` 짝(파일만 걸침)

- `coach/domain/ports.ts`(머리 주인) — `FEEDBACK_KEY_PREFIX` · `pruneBefore` 포트 선언. 시험 `feedbackRowsExcluded.test.ts` · `recordCoachFeedbackKey.test.ts` · `generateCoachLogging.test.ts`
- 미충족: 없음(이 REQ 몫 변경 0)
- 근거: 루트 슬라이스 `requirements/specs/done/WEB-perf-req-close-slice.md` 검증 절

## 2026-11-19 코치 대화 재설계가 걸침

- 조립 파일(`composition.ts`)이 걸침(`feat/f006-coach-chat-redesign`) — 코치에 `plan` 주간 계획 끼움. identity · notification 변경 0
- 확인은 `FE-REQ-030` 체크리스트 2026-11-19 코치 대화 재설계 절

## 2026-11-19 — 대화 보관 한도 · 지난 대화 무한 스크롤(`feat/f006-coach-chat-history`)

- 파일만 걸침 — 본문 `SRV-REQ-028` FR-113

루트 `requirements/specs/done/F006-coach-chat-history-slice.md` · 미검증 표는 그 슬라이스 체크리스트

## 2026-11-20 시세 등락 기준 걸침

- [x] 시세 등락 기준 바로잡기(`fix/crypto-change-basis`, `SRV-REQ-061` · `FE-REQ-075`)가 걸침 — 업비트 등락 · 고저는 당일(오전 9시) 전일 종가 대비라 "24시간" 이름표 · 프롬프트 줄 · 주석을 "전일 대비 · 당일"로. 값 · 계약 필드 이름 변화 0 — 확인은 `salt-server` 짝 REQ 체크리스트(`SRV-REQ-061` · `FE-REQ-075`)

- 2026-11-21 걸침(`SRV-REQ-062`): notification 조립 · `NotificationUserRows` 에 `push_subscription` — `NotificationEndToEndTest` 4 · `MyDataEndToEndTest` 8 통과
