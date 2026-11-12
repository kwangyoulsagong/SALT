# SRV-REQ-008 (F000 FUNC) — 검증 체크리스트

- REQ: `requirements/specs/in-progress/SRV-REQ-008-F000-FUNC.md`
- 브랜치: `feat/f000-watchlist-tab` → `feat/f000-invite-onboarding-slice` · 검증일: 2026-09-18
- 상태: **부분 완료** — 관심 목록·뉴스·차트·포지션 요약에 이어 **초대 코드·인증 축소·온보딩 상태**가 닫혔다. 알림 2종·동면·`AssetType`·환율이 남았다
> **2026-10-29 전수 조사:** 위 상태 줄은 작성 당시 — 알림 · 동면은 2026-10-27 · 28 닫힘. 본문 표가 진실
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F000-watchlist-tab.md`

## 1. 닫힌 것

| FR | 내용 | 결과 | 근거 |
|---|---|---|---|
| FR-30 | watchlist CRUD 가 `market` 컨텍스트에, **동작 불변** | **pass** | 이관은 `SRV-REQ-006` 에서 끝나 있었다. 동작 변경 0 |
| FR-31 | `@@unique([userId, assetType, symbol])` 유지 | **pass** | 스키마 그대로 |
| FR-33 | 목록에 현재가·변동률 포함 | **pass** | 행 값과 `market_assets` 저장 시세 중 **`priceUpdatedAt` 이 늦은 쪽**. 테스트 6건 |
| FR-40~44 | 심볼별 뉴스 · 최신순 · 상한 · 빈 배열 · 크롤러 유지 | **pass** | 조회는 이미 있었고 **소비처가 이번에 생겼다**. 크롤러로 324건(BTC 66) |
| FR-50~52 | `period` 유효값 · 모르는 값 **422** | **pass** | `miniute` 422 · `minute` 200 · 생략 200 |
| FR-60 | 보유 요약(종목·평가금액·손익률·자산군) | **pass** | `GET /api/portfolio/summary` |
| FR-63 | Projection 조회, Aggregate 미로드 | **pass** | `findByUser` 읽기 쿼리 |

## 2. 남은 것

| FR | 내용 | 언제 닫히나 |
|---|---|---|
| FR-1~7 | 초대 코드 도메인(`AcceptInviteCode` · 예외 4종 · `UserCountProbe` · 원자성 · 상한 설정값) | `DB-REQ-001`(`InviteCode`) 선행 |
| FR-10~14 | 인증 축소 · 온보딩 상태 3단계 | `ledger`·`plan` 공개 API 선행 (F001·F003) |
| FR-20~25 | 알림 2종 제한 · `kindGate` | `notification` 컨텍스트 이관 |
| FR-32 | `AssetType` 3값 | `DB-REQ-001`/`003` (`ALTER TYPE` 락 측정 포함) |
| FR-61·62 | 3자산군 원화 합산 · 환율 기준 | `fx` 컨텍스트 (F001·F002). 지금은 필드만 두고 `null` |
| FR-70~72 | 동면 4종 · 되살리기 테스트 | `SRV-REQ-007` |

## 3. 구현 중 드러난 사실

- **`ListWatchlist` 가 Prisma `Decimal` 을 그대로 내보냈다.** JSON 에서 문자열로 나가
  화면이 숫자로 쓰면 죽는다. 어댑터에서 변환하도록 고쳤고 `null` 은 `null` 로 둔다
  (0 으로 떨어뜨리면 "가격이 0원"이 된다).
- **`/api/portfolio/internal/update-prices` 를 부르는 곳이 없었다.** 보유 평가금액이
  생성 이후 영원히 0 — 홈 "주식" 섹션이 0원만 나오는 원인이었다.
- 그 유스케이스가 **심볼마다 조회를 돌았다.** 밀어 넣는 쪽은 구독 전체(100+)를 5초마다
  보내는데 보유는 몇 건이다 — 한 번 읽고 해당 보유만 갱신하도록 바꿨다(`findBySymbols`).
  테스트 3건이 "심볼 100개여도 조회 1회"를 고정한다.
- 주식에 **업비트 로고 URL** 을 붙이고 있었다(`logos/AAPL.png` 404). 자산군이 크립토일
  때만 만들고 나머지는 `null` 이다 — 플레이스홀더를 만들지 않는다.

## 4. 명령

`npm run build` pass · `npm test` **162건 pass**(기존 153 → ListWatchlist 6 · UpdateHoldingPrices 3)
· `npm run lint` pass · `npm run test:layer-check` pass (차단 10 · 통과 6).

## 5. 초대 코드 · 인증 축소 (2026-09-18, `feat/f000-invite-onboarding-slice`)

전 영역 통합 기록은 루트 `requirements/reports/checklists/F000-invite-onboarding.md` 다.

| FR | 내용 | 결과 | 근거 |
|---|---|---|---|
| FR-1 | 검증 4개(존재·미사용·미만료·상한) | **pass** | `domain/policy/inviteAcceptance` 한 곳. 유닛 5건 |
| FR-2 | 도메인 예외 4종이 `code` + `ErrorKind` | **pass** | 넷 다 `Forbidden`(403). status 로 나누면 그 자체가 무차별 대입의 신호가 된다 |
| FR-3 | `UserCountProbe` 경유 | **pass** | `grep "prisma" src/auth/domain` = 0 |
| FR-4 | 원자적 사용 | **pass** | 실제 DB 동시 2요청 → 201 + 403. `redeem` 이 조건부 UPDATE + INSERT 를 한 트랜잭션에 |
| FR-5 | `register` 유스케이스 0건 | **pass** | **계정을 만드는 함수가 `InviteCodeStore.redeem` 하나**이고 코드 점유 없이 성공하지 않는다 |
| FR-6 | 상한이 설정값 | **pass** | `INVITE_MAX_ACCOUNTS`(기본 10). `=3` 으로 기동해 정원 초과 재현 |
| FR-7 | 실패 시도 기록 · **잠금 없음** | **pass** | `invite_code_attempts`. 코드 앞 4자만 저장. 기록 실패가 가입을 막지 않는다 |
| FR-10 | `Login`·`RefreshSession` 유지 | **pass** | 새 계정으로 로그인 200 |
| FR-11 | `Register`·`ChangePassword`·`DeleteAccount` 제거 | **pass** | 셋 다 404. `modules/auth` 삭제 |
| FR-12 | 토큰 재발급 유지 | **pass** | `POST /api/auth/refresh` |
| FR-13·14 | 온보딩 3단계 · 공개 API 경유 | **부분** | 판정은 `onboarding` 조합 컨텍스트에 있다. **소스가 REQ 와 다르다** — §6 |

## 6. FR-14 가 지정한 소스를 쓰지 못했다

`ledger`(F001)·`plan`(F003) 둘 다 없다. `onboarding` 은 프로브 둘을 주입받고 조립
지점에서 지금 있는 것을 꽂는다.

| 스텝 | REQ 가 말한 소스 | 지금 꽂은 것 | 언제 바뀌나 |
|---|---|---|---|
| `link_account` | `ledger` 거래 존재 | `portfolio.countTransactions > 0` | F001 |
| `set_plan` | `plan` 설정 존재 | `goal` 행 존재 (**`composition.ts` 가 Prisma 로 직접 센다**) | F003 |

**판정 규칙은 컨텍스트 안에 그대로 있다.** 바뀌는 것은 조립 두 줄이다.

## 7. `ErrorKind` 에 `Unauthenticated` 를 더했다

`modules/auth` 의 `UnauthorizedError`(401)를 옮길 자리가 커널에 없었다. 없는 채로
진행하면 로그인 실패·토큰 만료가 403 이 되고, 그건 이관이 아니라 **계약 변경**이다.
403 과 나뉘어 있어야 클라이언트가 토큰 재발급을 시도할지 판단할 수 있다.
`Forbidden` 이 들어올 때와 같은 이유이고, 같은 기준(전 컨텍스트에 걸리는가)을 통과한다.

## 8. 명령 (이 슬라이스)

| 명령 | 결과 |
|---|---|
| `npm run build` · `lint` | pass |
| `npm test` | **184건** (162 → +22: 초대 판정 9 · 유스케이스 9 · 온보딩 4) |
| `npm run test:layer-check` | pass (차단 10 · 통과 6) |
| `npx prisma migrate dev` | `20260918071852_add_invite_code` |

## F011 슬라이스 6 — 국내 지수 · 투자자 순매수 (2026-10-26, 파일만 걸침)

| 항목 | 결과 |
|---|---|
| `market` 공개 팩토리 | 국내 유스케이스 4개 추가 — 기존 키 무변경, `npm test` 796/796 |
| 설정 | `KIS_SUMMARY_INDICES`(기본 `0001,1001`) — 비밀값 아님 · 빈 값이면 지수 띠 없음 |
| 관심 종목 · 추적 자산 규칙 | 무변경(유니버스 순서 보유 → 관심 → 시총을 투자자 수집이 그대로 쓴다) |

미검증: 없음

## F011 슬라이스 6b (2026-10-27) — 파일만 걸침

`market` 공개 팩토리 국내 유스케이스 +2 · 스키마 칸 5 · env 주석 1(값 무변경) — 이 REQ 의 관심 종목 · 추적 자산 동작 무변경(서버 테스트 818 통과). 미검증: 없음

## 알림 1종 · 코드만 · 금액 없음 — FR-20~25 (2026-10-28)

루트 `F000-notification-kind-gate` · 브랜치 `feat/f000-notification-kind-gate` · 커밋 `3320883`

| 항목 | 결과 |
|---|---|
| FR-20 종류 1종 | `notification/domain/NotificationKind` `NOTIFICATION_KINDS = ["signal_update"]` |
| FR-21 생성 거부 | 단위: `decision_change` · `tax_deadline` · `sentiment` · `smart_money` 4종 거부 · 행 0. 실 DB: 공개 API 로 `decision_change` → `NOTIFICATION_KIND_UNSUPPORTED` |
| FR-21 옛 행 | 실경로(상시 4000): 옛 `decision_change` 행이 목록 · 안 읽은 수에 0, 모두 읽음 · 단건 읽음 뒤에도 `isRead=false` 그대로(안 건드림) · 지우지 않음 |
| FR-22 센티먼트 · 고래 생성 | `src` grep 생성 0건(모델 · 관계만) — 이미 닫혀 있던 것을 확인 |
| FR-23 조회 경로 | 손대지 않음 |
| FR-24 금액 | 단위: 금액 키 2 · 숫자 문자열 3 거부. 실경로: payload 에 숫자 `158000000` 를 넣은 행 → 목록 `params` 에서 빠짐 |
| FR-25 코드만 | 코치 → 공개 API → 실 DB 행 `title` · `message` NULL · `messageCode` `coach.decision_changed` · 인자 4개(코드). 완성 문장 · 공백 · 대문자 코드 거부 |
| 중복 억제 | `hasRecentDecisionChange` 발행 전 false → 뒤 true(실 DB) |
| 게이트 | `build` · `lint` · `test` 829 · `test:layer-check` · `prisma generate` · 마이그레이션 로컬 적용 · Bash 로 쓴 18파일 레이어 훅 사후 실행 exit 0(위반 샘플은 exit 2) · Swagger `failOnErrors` 4경로 |

미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| ~~코치 워커가 실제 판단 변화로 알림을 만드는 회차~~ | **닫힘 2026-10-28** — 상시 서버 코치 워커 실제 회차(10:50): 테스트 계정 직전 판단을 `wait` → `hold` 로 바꿔 두자 다음 회차가 `signal_update` · `ai_coach` · `coach.decision_changed` · 인자 `{ mode, symbol, previousAction, nextAction }` · 문장 NULL · 24시간 만료 1건을 만들었다. 다시 `hold` 로 바꾼 11:00 회차는 **2시간 억제로 0건 추가**. 판단은 회차가 원래 값(`wait`)으로 덮었고 시험 알림은 지웠다 | — |
| 옛 행 정리(삭제 · 변환) | 로컬 0건 · 운영 DB 없음. FR-21 이 지우지 말라 한다 | 필요 없음 — 만료(`expiresAt`)가 지운다 |

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: FR-70~72(동면 · 되살리기)는 2026-10-27 `SRV-REQ-007` 에서 구현 — `DORMANT_PATHS` 410 · `/api/missions / 초대 · 인증 · 온보딩 · watchlist · 뉴스 · period 수용 기준은 2026-09-18 Changelog 두 행이 닫았다(`auth/applica / FR-32 `AssetType` 3값: `kr_stock` 은 F011 이 닫음(2026-10-07) · `us_stock` 은 미국 주식 착수 때
- 2026-10-29 전수 조사: 프론트 `entities/auth/model/types.ts`(머리 주석이 이 REQ) 주석만 — 뷰모델 한 벌화 주인 `FE-REQ-024` → `FE-REQ-012` FR-50. 서버 무변경

## 2026-10-30 — F000 종목 검색 · 추적 자산 상한

| FR | 구현 | 확인 |
|---|---|---|
| FR-80 | `market/application/SearchAssets.ts` — 같음 → 시작 → 포함, 같은 순위 안 원천 순서. 결과 `isTracked` · `isHeld` · `tracked` | 단위 5 · 실서버 `삼성` · `비트` · `000660` · `btc` · `zzzz` |
| FR-81 | `domain/policy/trackingLimit.ts` `canStartTracking` · env `TRACKED_ASSET_LIMIT` | 단위(상한 3 설정) · 실서버 12번째 409 · 상한에서 보유 201 |
| FR-82 | `TrackedAssetLimitError` + `DomainError.details` | 단위(`toErrorResponse` 본문 대조) · 실서버 본문 두 수 |
| FR-83 | `HoldingProbe` · `infrastructure/HeldAssetsAdapter.ts`(조립 `composition.ts`, 부를 때 공개 API) | 실서버 보유 ETH · 005930 |
| FR-84 | `readTrackedSummary` — 관심 `listAll` 1 · 보유 1 | 코드 확인 |
| FR-85 | 새 등록만 막는다(정리 코드 없음) | 코드 확인 |
| FR-86 | 빈 검색어 = 관심 ∪ 보유 · `loggableUrl` | 단위 · 실서버 로그 `q=*` |
| FR-87 | 개정 — 코인 + 국내(소유자만, 비소유자는 마스터 조회 0) | 단위 · 실서버 비소유자 0건 |

관심 목록 응답에 `tracked` · 행 `isHeld`(`FE-REQ-011` FR-7). 서버 857 pass · build · lint · layer-check · 훅 사후 · Swagger. 실검증 · 실화면 상세는 루트 `requirements/reports/checklists/F000-asset-search.md` §2

미검증: 없음 — 소유자 실계정 화면은 `QA-001`

## 2026-10-30 — F004 슬라이스 19 차트 1주 탭

| FR | 구현 | 확인 |
|---|---|---|
| FR-50 `week` | `MarketOverview.ts` `ChartPeriod.Week` · `GetChartData` 분기 · `UpbitClient.weeklyCandles` | 실서버 `GET /api/investment/crypto/BTC/chart?period=week&count=3` → 주봉 3개(`date` 10-26 · 10-19 · 10-12, 월요일). 단위 테스트 "week 는 주봉, day 는 일봉, minute 은 분 단위 봉" |
| FR-51 `month` | 열지 않음 | 실서버 `period=month` → 422 `MARKET_CHART_PERIOD_UNSUPPORTED` |
| Swagger | `investment.routes.ts` `enum: [day, minute, week]` | `swagger-jsdoc` `failOnErrors` 로 생성 — `period` enum 3종 |
| 주석 인용 | `errors.ts` · `MarketOverview.ts` · `investment.controller.ts` · `investment.routes.ts` | `FE-REQ-010` FR-50 · 51 → `SRV-REQ-008`(`36b09989`) |

검증: `npm test` 858 · `npm run build` · `npx eslint src/market` · `npm run test:layer-check`(차단 10 · 통과 6) · 훅 사후 실행 6파일 0. Prisma 무변경(스키마 안 건드림 — `prisma:generate` 불필요).
미검증 · 범위 밖: `month`(소비 화면이 생길 때 — 이 FR-50) · 주봉 과거 이동(`to` 파라미터, `FE-REQ-034` Open Questions 서버 후속).

## 2026-10-30 — F000 레거시 모델 drop · 중복 워커 정정 (루트 `F000-legacy-cleanup`)

- 정리 항목 참조 줄에 결과 한 줄 — 내용 무변경

## 2026-11-02 — 파일만 걸침 (F008 해설 근거 슬라이스)

- `ports.ts` 뉴스 사실 두 칸 추가 — 타입 추가만. `npm run build` · `test` 887 통과

미검증: 없음.

## 2026-11-02 — 파일만 걸침 (해설 LLM 스위치)

- `composition.ts`(이 REQ 가 머리 주석 주인)에서 env 를 `llmEnabled` 로. `npm run build` · `test` 889 통과

미검증: 없음.

## F008 해설 공급자 라우팅 · 스트리밍 (2026-11-02) — 검증

`tsc` · `lint` · `test:layer-check`(차단 10 · 통과 6) · 기동 로그 `해설 로컬 CLI local_claude 2.1.316`

루트 `requirements/specs/done/F008-explain-llm-routing-slice.md` · 영역 `SRV-REQ-050` · `BFF-REQ-050` · `FE-REQ-059`

## F008 슬라이스 24 국내 증시 일정 (2026-11-02)

- 변경: `composition.ts` 에 `PrismaMarketScheduleReader` 조립 · 예측이 보유 · 관심 국내 종목(`symbol` 만)을 읽는 근거로 FR-87(국내 추가 = 소유자만)을 인용
- 검증: 조립 · 빌드 통과
- 미검증 · 범위 밖: 없음(슬라이스 2단계는 `FC-REQ-021` · `FE-REQ-046` 표)

## 국내 탭 요약 띠 (F011, 2026-11-02)

- 변경: 파일만 걸침 — 스키마 모델 1 · 열 3, 조립 지점 국내 요약 정책
- 검증: `build` · `lint` · `test` 936 / 0 · `test:layer-check` · Swagger 생성 · 실서버 4000 소유자 200
- 미검증 · 범위 밖: 없음

## 2026-11-02 — MONEY-F1(`FE-REQ-053`) 투자 zone 분리 · 홈 카드

- MONEY-F1(`FE-REQ-053`) 에서 이 REQ 가 걸렸다 — shared 레이어 → `@repo/web-shared`(import 경로 치환)(`20971abf`) · 앱 프레임 · 프로바이더 · 프로필 메뉴를 zone 공용 레이아웃으로(설정 · 로그아웃 이동은 문서 이동)(`d8692621`) · 투자 화면 `apps/web/src` → `packages/domain-invest/src`(내용 무변경) · 투자 zone 조립(`b00b0cea`) · 관심 종목 시세 갱신을 한 문장 UPDATE 로(연결 풀 점유 → 위험 예산 조회 타임아웃 해소)(`e74fbbec`). 파일 2개(경로 이동 내용 무변경 0 · 수정 1 · 추가 1 · 삭제 0). 화면 · 동작이 바뀐 몫은 위 커밋 설명대로
- 확인: 모노레포 check-types · lint · test · zone 5 빌드 · layer-check · 훅 사후 실행(바뀐 TS 전부) · 실화면 — `salt-microFe/requirements/reports/checklists/FE-REQ-053.md` §2

## 2026-11-03 — MONEY-S1a 저축 서비스 첫 판 · 저축 zone 첫 화면

- 이 REQ 에 걸린 몫(`1ec3b0c6`): `composition.ts` 온보딩 `set_plan` 프로브 — `prisma.goal.count` → Kotlin 저축 ~~`home-card`~~ `goals/exists`(**정정 2026-11-03 `c82be47c`** — 홈 카드 조립을 빌리지 않는다) 내부 REST(800ms · 실패 false). env `PLATFORM_API_URL`. 실측 done true / false
- 확인: Kotlin `./gradlew check` 56(저축 종단 10 · 경계 8 · 플랫폼 14 · 도메인 15 · 커널 9) · bootJar 로컬 운영 DB 기동 · 서버 build · lint · test 936 · test:layer-check · BFF build · test 351 · 모노레포 check-types · lint · test(core 83 · ui 43) · zone 5 운영 빌드 · 훅 사후 실행 · 실스택(BFF 4001 → Kotlin 4010 → 로컬 DB) · 실화면 3화면 × 4폭(1024 · 1280 · 1440 · 1600) 넘침 0 · 콘솔 오류 0 — 루트 `requirements/reports/checklists/MONEY-S1a-savings-calculator.md`

## 2026-11-03 — 코드 리뷰(high) 10건 `c82be47c`

- `c82be47c` — 온보딩 `set_plan` 프로브가 `GET /api/savings/goals/exists` 를 부른다(홈 카드 조립을 빌리지 않음). 실측 done true/false
- 검증: Kotlin 종단 10(대소문자 중복 400 · 목록 = 상세 구간 · exists) · 도메인 19 · 경계 8 · 플랫폼 14 · 서버 936 · BFF 351 · 모노레포 check-types · lint · test · web-savings 빌드 · 훅 사후 · 실스택(프로브 done true/false)

## 2026-11-03 — 사용자 "그것도 다 니가해": launchd 상시 · 옛 Express goals 삭제

- `d69c310e` — `schema.prisma` 에서 `Goal` · `SavingTransaction` · enum 2 · User 관계 삭제(이 REQ 가 파일 머리 주인). 동면 대시보드 목표 요약 3쿼리 삭제
- 확인: 서버 build · lint · test 936 · test:layer-check · 재시작 health 200 · Express `/api/goals` 404 · BFF 410 · 온보딩 `set_plan` done · `ops/salt.sh status` 전부 ok

## 2026-11-06 — 서버 S2c notification(`MONEY-S2c-notification`) · `9cee4715` · `33e949e8` · `2fa68f61` · `f1a3c64c`

- Express 쪽 규칙 코드 삭제 · 같은 관문이 `MessageGuard`(Kotlin) · BFF 뷰모델에 있음
- 검증: Express build · test 929 · Kotlin `NotificationSpec`
- 미검증: 없음(이 몫 안)

## 2026-11-06 — 서버 S3a identity 셸 설정(`MONEY-S3a-identity-shell`)

- FR-13 · 14 은퇴 — `src/onboarding/**` 5파일 삭제 · `composition.ts` 조립 · `app.ts` 등록 제거. 검증 Express build · lint · test 925 · `test:layer-check`

## 2026-11-06 — F016 단계 A(파일 걸침)

- 변경 · 검증: `schema.prisma` 머리에 이 REQ — 국내 시장 상태 열 · 표 추가(`DB-REQ-041`). 이 REQ 몫 무변경
- 미검증 · 범위 밖: 없음
- 루트 슬라이스 `requirements/specs/done/F016-A-market-status-tags-slice.md` · 체크리스트 `requirements/reports/checklists/F016-A-market-status-tags.md`

## 2026-11-06 — F016 단계 B(파일 걸침)

- `schema.prisma`(머리에 이 REQ) 에 국내 등락 원천 표 다섯(`DB-REQ-041`). 이 REQ 몫 무변경
- 검증: 영역 전체(서버 build · lint · test 981 · BFF test 421 · FE check-types · lint · test) 통과 — 체크리스트 `requirements/reports/checklists/F016-B-kr-news-flows.md`
- 미검증 · 범위 밖: 없음(이 REQ 몫 무변경)

## 2026-11-09 — F016 단계 C

| 항목 | 결과 |
|---|---|
| `schema.prisma` — `KrIndexName` · 마스터 중분류 칸(F016 단계 C `DB-REQ-041`) | 반영 · 영역 검증 전체 통과 |

루트 체크리스트 `requirements/reports/checklists/F016-C-move-split-facts.md`

## 2026-11-09 — 기사 본문(주인 `SRV-REQ-054` · `BFF-REQ-053` · `FE-REQ-068`)

- `schema.prisma` 에 `NewsArticleBody`(`news_article_body` — `DB-REQ-042`) — 검증은 주인 체크리스트(서버 1031 · BFF 430 · 실화면 1440 · 훅 사후 실행)

## 2026-11-10 — 검색 모달 2단계(주인 `FE-REQ-066` FR-8 · `SRV-REQ-055` · `BFF-REQ-054`)

- DTO 경계 표 테스트 `market/presentation/__tests__/searchDto.test.ts` · 서버 1057 통과
- 루트 체크리스트 `requirements/reports/checklists/FE-066-067-search-header.md`

## 2026-11-10 — F018 걸침

  - `salt-server/src/market/application/ManageWatchlist.ts` — 국내 소유자 판정 걷기(`ADR-011`) — 시세 · 관심 · 거래 · 국내 판단 · 미러 · 복기 · 해설은 로그인 전체(시세는 게스트 포함), 전망 셋만 소유자
  - `salt-server/src/market/application/SearchAssets.ts` — 국내 소유자 판정 걷기(`ADR-011`) — 시세 · 관심 · 거래 · 국내 판단 · 미러 · 복기 · 해설은 로그인 전체(시세는 게스트 포함), 전망 셋만 소유자
  - `salt-server/src/market/application/__tests__/searchAssets.test.ts` — 테스트를 새 계약으로 — 비소유자 거절 단언을 "누구나 · 키 꺼짐만 숨김"으로
  - `salt-server/src/market/presentation/investment.routes.ts` — 국내 소유자 판정 걷기(`ADR-011`) — 시세 · 관심 · 거래 · 국내 판단 · 미러 · 복기 · 해설은 로그인 전체(시세는 게스트 포함), 전망 셋만 소유자

검증은 F018 체크리스트(`SRV-REQ-056` · `BFF-REQ-055` · `FE-REQ-070` · 루트 `requirements/reports/checklists/F018-public-market-guest.md`) — 이 REQ 의 기존 확인 항목은 다시 열지 않음(동작이 바뀐 것은 국내 소유자 판정 · 로그인 조건뿐)

## F017 v2 단계 1b — 2026-11-10

| 항목 | 상태 | 근거 |
|---|---|---|
| 판단 표 인덱스 하나 | 충족 | 마이그레이션 적용 · 스키마 ↔ DB 차이 0 · `prisma:generate` · build |

## F017 단계 1c 수집 따라잡기 (2026-11-11, `feat/f017-s1c-collection`)

| 항목 | 상태 | 근거 |
|---|---|---|
| 이 REQ 에 닿은 변경 | 충족 | `schema.prisma` 에 `MarketUniverseSnapshot` · `PriceFillMark`(`DB-REQ-044`). 관심 추가는 5분봉 따라잡기 순서(보유 · 관심 먼저)에 반영 — FR-80~87 계약 변경 0 · `npm test` 전체 · lint · build · 레이어 훅 사후(음성 대조 exit 2) |

## F017 v2 단계 2 점검 (2026-11-11, `feat/f017-s2-checks-plain-line`)

| 항목 | 상태 | 근거 |
|---|---|---|
| 이 REQ 에 닿은 변경 | 충족 | `schema.prisma` 에 모델 `TradeCheckLedgerEntry` → 표 `trade_check_ledger`(마이그레이션 `20261111130000_trade_check_ledger`, 추가만). 기존 모델 무변경 · `npm run build` · `npm run lint` · `npm test` 1200 통과 · `npm run test:layer-check` · 레이어 훅 사후 실행(음성 대조 exit 2) · `prisma migrate diff` 0 |

## F017 v2 단계 3 해설 늘 (2026-11-11, `feat/f017-s3-explain-always`)

| 항목 | 상태 | 근거 |
|---|---|---|
| 모델 추가 · generate | 충족 | `npm run prisma:generate` · `migrate deploy` · build |

## F016 단계 D 짝(2026-11-12) — 이 REQ 가 머리 주인인 파일

루트 `requirements/specs/done/F016-D-move-summary-slice.md` · 체크리스트 `requirements/reports/checklists/F016-D-move-summary.md`

| 바뀐 것 | 확인 |
|---|---|
| `prisma/schema.prisma` 에 모델 `MoveExplanation` 하나 더함(주인 `DB-REQ-041` FR-8) — 기존 모델 변경 0 | `prisma generate` · 서버 빌드 · 마이그레이션 적용(로컬) |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 없음 — 모델 추가만 | 아래 회고 | 다음 카드 날 배치 로그 |
