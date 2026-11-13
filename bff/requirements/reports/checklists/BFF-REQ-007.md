# BFF-REQ-007 (F000 FUNC) — 검증 체크리스트

- REQ: `requirements/specs/in-progress/BFF-REQ-007-F000-FUNC.md`
- 브랜치: `feat/f000-watchlist-tab` → `feat/f000-invite-onboarding-slice` · 검증일: 2026-09-18
- 상태: **부분 완료** — D·E·F·G절에 이어 **A절(동면 410, 2026-09-22)** 이 닫혔다(FR-6 1주 로그만 2026-09-29). B·C절(홈 조립·알림)이 남았다
> **2026-10-29 전수 조사:** 위 상태 줄은 작성 당시 — 이후 닫힌 절(B · C절 10-27 · 10-28, 코치 리포트 · 재생성 · 해설 인증 슬라이스 5 · 14)은 본문 표가 진실
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F000-watchlist-tab.md`

## 1. 닫힌 것

| FR | 내용 | 결과 | 근거 |
|---|---|---|---|
| FR-30 | `/api/app/news?symbol=&limit=` | **pass** | 실기사 2건 응답 |
| FR-31 | 제목·요약·이미지·출처·발행시각, **`content` 없음** | **pass** | 테스트 `content 를 담지 않는다` |
| FR-32 | 0건이면 빈 배열, 더미 0건 | **pass** | 테스트 + 실측 |
| FR-33 | 이미지 없으면 `null`, 플레이스홀더 0건 | **pass** | GoogleNews 기사 전부 `imageUrl: null` |
| FR-34 | `viewCount` 는 서버가 줄 때만 | **pass** | 테스트 `viewCount 는 서버가 줄 때만 있다` |
| FR-40 | `/api/app/watchlist` | **pass** | GET·POST·DELETE |
| FR-41 | 서버 값 우선, 없으면 캐시 보정 | **pass** | 테스트 4건 |
| FR-42 | 캐시에 없으면 `priceStale: true` + 서버 값 | **pass** | AAPL `null` + `true` |
| FR-43 | 0건이면 빈 배열 | **pass** | `{"items":[]}` |
| FR-50~52 | `period` 를 **교정하지 않고** 422 | **pass** | BFF `miniute` 422 · `minute` 200 |

## 2. 남은 것

> 2026-09-18 시점 표다. 최신은 §8(남은 것)과 §9(A절). FR-60~64 는 §6 에서, FR-1~5 는 §9 에서 닫혔다.

| FR | 내용 | 언제 닫히나 |
|---|---|---|
| ~~FR-1~6~~ | ~~동면 route 제거 + 410 Gone + 1주 로그~~ | **§9 — FR-1~5 닫힘, FR-6 2026-09-29** |
| FR-10~15 | `app-home.service` 재작성 (`allSettled` · 동면 소스 제거 · 뷰모델) | 홈 블록이 생기는 F006 `BFF-REQ-027` 과 순서 조율 필요 |
| FR-20~24 | 알림 ~~2종~~ **1종**(개정 2026-09-21) 축소 | `SRV-REQ-008` FR-20~25 선행 |
| ~~FR-60~64~~ | ~~인증 경로 정리 · 온보딩 3개~~ | **§6 에서 닫힘** |

## 3. 판단이 REQ와 다른 것

- **`priceStale` 을 캐시 적중이 아니라 "돌려주는 값의 나이"로 판정한다.** 구독을 부르는
  것은 `price-updater.worker`(별도 프로세스)라 REST 만 띄우면 캐시가 비어 **전부 지연**이
  된다. 서버 값이 기본이고 캐시는 빈 자리를 채우거나 더 새로울 때만 이긴다 — FR-41 의
  의도는 그대로다. 임계값 60초는 실측 근거가 있다(표본 40 · p50 2.5s · 최대 4.8s · 12.4배).
- **`CHART_PERIODS` 가 둘이다**(FR-52 는 넷). 서버에 `week`·`month` 가 없어서 넷을 적으면
  BFF 는 통과시키고 서버가 422 를 준다.

## 4. 이번에 생긴 것 · 드러난 것

- **테스트 러너가 이 REQ 작업에서 처음 생겼다** (`npm test`, 23건). 막고 있던 것은
  "서비스를 import 하면 `upbit-ws.service` 가 최상위에서 소켓을 연다"였고, 판정 규칙을
  import 없는 순수 함수(`*.viewmodel.ts`)로 떼어 풀었다.
- **관심 목록을 한 페이지만 읽고 있었다.** 별 아이콘이 이 응답으로 판정하므로 101번째부터
  "담겨 있는데 빈 별"이 된다 — 페이지를 끝까지 읽도록 고쳤다(상한 10페이지).
- **`/portfolio/internal/update-prices` 를 아무도 부르지 않았다.** 워커가 관심 목록 쪽만
  밀어 넣어서 보유 평가금액이 영원히 0 이었다. 같은 페이로드를 두 곳에 보낸다(`allSettled`).
- `market-overview.service` 도 같은 캐시를 쓴다 — **REST 프로세스에서는 보정이 조용히
  no-op 이다.** 실패가 아니라 "보정이 안 된" 상태라 아무도 모른다. `BFF-REQ-010` 에서
  캐시 적중률을 관측 항목으로 넣을 것.

## 5. 명령

`npm run build` pass · `npm test` **23건 pass**.

## 6. G절 — 인증 경로 정리 (2026-09-18, `feat/f000-invite-onboarding-slice`)

| FR | 내용 | 결과 | 근거 |
|---|---|---|---|
| FR-60 | proxy 에서 `POST /api/auth/register` 제거 | **pass** | 404. 서버에서도 404 라 남겨 두면 프론트가 죽은 경로를 계속 부른다 |
| FR-61 | `POST /api/app/onboarding/invite` → 서버 `/auth/invite/accept` | **pass** | 201 + 토큰 |
| FR-62 | `GET /api/app/onboarding/status` → 서버 `/onboarding/status` | **pass** | 봉투를 벗기고 뷰모델로 |
| FR-63 | `invite/check` 무인증 + rate limit | **pass** | 창당 30회. 34회 중 6회 429 |
| FR-64 | 초대 `403` + `reasonCode` 그대로 전달 | **pass** | 본문 `{"reasonCode":"…"}`. 문장 0건 |

**`PATCH /users/password` · `DELETE /users/account` proxy 도 함께 제거**했다(`BFF-REQ-008`
제거 표). 서버에서 404 다.

## 7. rate limit 이 BFF 에도 필요한 이유

서버(`salt-server`)에 같은 것이 있다. 그런데 **BFF 가 무인증으로 여는 경로**는 서버에
닿기 전에 BFF 의 커넥션과 upstream 호출을 먼저 쓴다. 서버에서만 막으면 BFF 는 그 요청을
전부 중계하고 나서 429 를 받아 온다 — **막는 지점이 비용이 드는 지점보다 뒤**다.

값(창 60초 · check 30 · accept 10)은 서버 쪽과 같게 뒀다. 다르면 둘 중 좁은 쪽만
의미가 있고 넓은 쪽은 착각을 만든다.

## 8. 남은 것

| 항목 | 언제 닫히나 |
|---|---|
| ~~A절 FR-1~5~~ — §9 에서 닫힘 | — |
| A절 FR-6 — 1주 로그 잔여 0건 | 2026-09-29 |
| B절 FR-10~15 — 홈 조립 재작성(`allSettled` · 뷰모델) | A절 선행 조건은 풀렸다. F006 홈 블록(`BFF-REQ-027`)과 순서 조율 |
| C절 FR-20~24 — 알림 2종 축소 | `notification` 컨텍스트 |

## 9. A절 — 동면 route (2026-09-22, `chore/bff-cleanup` · `BFF-REQ-036`)

| FR | 내용 | 결과 | 근거 |
|---|---|---|---|
| FR-1 | `/api/app/feed` 등록 해제, **파일은 남긴다** | **pass** | `app.ts` 에서 import · `use` 제거. `feed.*` 3파일 유지 |
| FR-2 | proxy 에서 `/missions*` · `/users/points/*` · `/users/achievements` 제거 | **pass** | `proxy.routes.ts`. `/api/dashboard*` 는 원래 proxy 에 없었다 |
| FR-3 | 410 + 1회 로그 | **pass** | 로그 키 = 마운트 지점(`req.baseUrl`) — `originalUrl` 이면 `/missions/:id` 로 끝없이 는다 |
| FR-4 | `{ code: 'ENDPOINT_DORMANT', revivable: true }` | **pass** | 실측 5경로 |
| FR-5 | 상수 한 곳 | **pass** | `gone.middleware.ts` `DORMANT_PATHS` |
| FR-6 | 1주 로그 잔여 0건 | **대기** | 2026-09-29 |

프론트 호출 0건(`salt-microFe/apps` · `packages` grep). `/api/users/dashboard` 도 더했다(스펙 목록 밖 — 근거 `BFF-REQ-036.md` §3).
테스트 3건(`gone.middleware.test.ts`). 실측과 명령은 `BFF-REQ-036.md`.

## 10. B절 — 홈 조립 (2026-10-27, `chore/adr-002-remnants` `545270b`)

| FR | 내용 | 결과 | 근거 |
|---|---|---|---|
| FR-10 | 블록 함수 구조 · 동면 소스 제거까지 | **부분** | 동면 소스 제거 pass. 블록별 엔드포인트 · 블록 함수 export 는 F006 `BFF-REQ-027`(소비처 0건 — 웹 홈은 블록마다 다른 경로를 부른다) |
| FR-11 | `Promise.allSettled` | **pass** | `app-home.service` |
| FR-12 | `/dashboard` 호출 제거 | **pass** | 단위 테스트가 부른 경로 = `/investment-notifications/unread-count` 하나 |
| FR-13 | `/investment-insight/top` 호출 제거 | **pass** | 동일 |
| FR-14 | F000 최소 구성(보유 요약 + 알림 + 시장 개요) | **pass** | 보유 요약은 `/api/app/portfolio/summary` 와 같은 함수(이름 · 로고 · `namesDegraded`) |
| FR-15 | 서버 봉투가 아니라 뷰모델 | **pass** | `AppHomeVM { portfolio, unreadNotifications: number \| null, marketOverview, degradedBlocks }` |

실경로: BFF 4101 → 워커 없는 스크래치 서버 4100(동면 410 상태) · 소유자 토큰 `GET /api/app/home` **200 · 70ms** · `degradedBlocks: []` · 보유 0 · 시장 20 · 안 읽은 알림 0.
부분 실패: 단위 테스트(알림 · 시장 실패 → 둘만 `null` + `degradedBlocks`, 보유는 내려감).
**main 에서도 이미 실패하고 있었다** — 서버 `/api/dashboard` · `/investment-insight/top` 이 라우터 바인딩 결함으로 언제나 500(`SRV-REQ-007` 체크리스트 §2).
프론트 계약: `/api/app/home` 소비처 0건(`salt-microFe` grep — 스트리밍 프로브 주석 한 줄뿐) → shape 변경 영향 없음.

명령: `npm run build` · `npm test` 278 pass(`app-home.test.ts` 2).

| 남은 것 | 언제 닫히나 |
|---|---|
| 블록별 엔드포인트 · 블록 함수 | F006 `BFF-REQ-027` · `028` |
| 블록 타임아웃 · 총 상한(`performance-bff.md` §3) | 동일 — 지금은 `backendApi` 클라이언트 타임아웃만 |
| C절 알림 1종 | `notification` 컨텍스트 |

## C절 — 알림 1종 축소 (2026-10-28)

루트 `F000-notification-kind-gate` · 브랜치 `feat/f000-notification-kind-gate` · 커밋 `ed1615f`

| 항목 | 결과 |
|---|---|
| FR-20 · 21 | `alerts.viewmodel` 단위: 옛 종류 3 · 종류 없음 1 → 버림, 오류 없음 |
| FR-22 금액 | 단위: 금액 키 2 · 숫자 문자열 2 · 숫자 1 제거. 실경로: 서버가 `avgPrice: "91000000"` 를 실어 보낸 행(직접 넣은 행)에서 빠짐 |
| FR-23 코드만 | `messageCode` 없는 행 버림 · 항목 키 7개 고정 |
| FR-24 | `createdAt` 내림차순 · 20건(25건 → 20) · 실경로 두 행 순서 확인 |
| 실경로 | BFF 4001 → 상시 서버 4000: `{ alerts: [...2], unreadCount: 2 }` · `/api/app/home` 200 그대로 |
| 게이트 | `tsc` · `test` 282(+4) |

짝 영역: 프론트 `/api/app/alerts` 소비처 0건 — 변경 없음(F006 `FE-REQ-030` 알림 화면이 첫 소비처, 문장은 `FE-REQ-011` FR-44 i18n 매핑).

미검증: 없음

## 2026-10-28 — F000 웹 API 에러 정규화 후속 (`f74c34f` · `2ff2ae6` · `3f38160`)

| 항목 | 결과 |
|---|---|
| FR-52 `chartPeriod.middleware` | 422 본문에 `code` — 실측 `/api/investment/crypto/BTC/chart?period=week` |

미검증: 없음

## 2026-10-29 REQ 전수 조사

- FR-52 2종 · 홈 3블록 · 현재형 문장 정정 · 수용 기준 구현분 표시

## 2026-10-29 FR-6(1주 410 로그) 확인

- **관찰 불가로 닫고 대체** — BFF 는 상시 실행되지 않는다(launchd 에 `com.salt.server` · `com.salt.forecast-daily` 만, BFF 로그 파일 없음). 9-22~29 1주 로그가 쌓일 수 없었다. 같은 신호(동면 경로 잔여 호출)를 상시 서버의 410 1회 로그로 본다 — `F000-dormant-410` 체크리스트 2026-11-03 확인으로 넘김

## 2026-10-30 — F000 종목 검색 · 추적 자산 상한

| FR | 결과 |
|---|---|
| FR-70 | `rest/routes/search.routes.ts` · `controllers/search.controller.ts`(q ≤ 30 · assetType · limit 1~30 400) · 인증 필수 |
| FR-71 · 72 | `services/asset-search.viewmodel.ts` — 단위 3 |
| FR-73 | `utils/error.util.ts` · `error.middleware.ts` — 단위 1 · 실서버 본문 두 수 |
| FR-74 | `app-watchlist.service.ts` · `watchlist.viewmodel.ts` `isHeld` — 단위 1 · 실화면 카운터 |
| FR-75 | `loggableUrl` — 단위 3 · 실로그 `GET /api/app/search?q=*&limit=20` |

BFF 295 pass · build. 실검증은 새 코드 BFF 4011(기존 4001 은 watch 없는 옛 프로세스 — 루트 체크리스트 §3). 실검증 · 실화면 상세는 루트 `requirements/reports/checklists/F000-asset-search.md` §2

미검증: 없음

## 2026-10-30 — F004 슬라이스 19 차트 1주 탭

| FR | 구현 | 확인 |
|---|---|---|
| FR-52(개정 3종) | `chartPeriod.middleware.ts` `CHART_PERIODS = ["minute", "day", "week"]` | 실BFF(4001) `period=week` 200 주봉 · `period=month` 422. 테스트 `chartPeriod.middleware.test.ts` 2건 |
| FR-50 · 51 | 교정하지 않고 422 | 위 테스트(`miniute` 422) |

검증: `npm test` 297 · `npm run build`. 훅 사후 실행 3파일 0.
미검증 · 범위 밖: 없음

## 2026-11-03 — S0 서버 스위치(`BFF-REQ-045`)

- 410 · 404 순서 그대로 — 기존 gone 테스트 통과

## 2026-11-03 — MONEY-S1a 저축 서비스 첫 판 · 저축 zone 첫 화면

- 이 REQ 에 걸린 몫(`3e5e0d42`): 동면 목록 파일(`gone.middleware.ts`)에 **은퇴** 목록 `RETIRED_PATHS` 를 더했다 — 동면(되살릴 수 있음 · `revivable: true`)과 은퇴(새 계약으로 대체 · `replacement`)를 섞지 않는다. 기존 동면 경로 410 무변경(테스트 그대로 통과)
- 확인: Kotlin `./gradlew check` 56(저축 종단 10 · 경계 8 · 플랫폼 14 · 도메인 15 · 커널 9) · bootJar 로컬 운영 DB 기동 · 서버 build · lint · test 936 · test:layer-check · BFF build · test 351 · 모노레포 check-types · lint · test(core 83 · ui 43) · zone 5 운영 빌드 · 훅 사후 실행 · 실스택(BFF 4001 → Kotlin 4010 → 로컬 DB) · 실화면 3화면 × 4폭(1024 · 1280 · 1440 · 1600) 넘침 0 · 콘솔 오류 0 — 루트 `requirements/reports/checklists/MONEY-S1a-savings-calculator.md`

## 2026-11-06 — 서버 S2c notification(`MONEY-S2c-notification`) · `9cee4715` · `33e949e8` · `2fa68f61` · `f1a3c64c`

- `ALERT_KINDS` · 테스트 종류 셋
- 검증: `npm test` 404
- 미검증: 없음(이 몫 안)

## 2026-11-06 — 서버 S2c 확인 2회차

- 확인 2회차(`c8aba5a2`): 알림 인자 `symbol` 은 코드 형식 검사(국내 숫자 코드가 지워지던 결함) · 경계표 테스트 · `npm test` 405

## 2026-11-06 — 서버 S3a identity 셸 설정(`MONEY-S3a-identity-shell`)

- 은퇴 목록 한 줄 · 실스택 410 확인

## 2026-11-10 — 검색 모달 2단계(주인 `FE-REQ-066` FR-8 · `SRV-REQ-055` · `BFF-REQ-054`)

- `rest/controllers/search.controller.ts` · `routes/search.routes.ts` 에 `BFF-REQ-054` 경로 셋 — 기존 검색 경계(q 30 · limit 30) 그대로. 검증은 주인 체크리스트(`BFF-REQ-054` — build · 434 · 실호출)
- 루트 체크리스트 `requirements/reports/checklists/FE-066-067-search-header.md`

## 2026-11-10 — F018 걸침

  - `bff/src/rest/routes/search.routes.ts` — "국내 소유자 전용" 주석 · Swagger 문구 정정(판정은 서버 — 이제 사람 · 게스트 누구나)
  - `bff/src/services/__tests__/asset-search.viewmodel.test.ts` — 검색 `isTracked` · `isHeld` 를 `boolean | null` 로 — 게스트는 null(지어내지 않음)
  - `bff/src/services/asset-search.viewmodel.ts` — 검색 `isTracked` · `isHeld` 를 `boolean | null` 로 — 게스트는 null(지어내지 않음)

검증은 F018 체크리스트(`SRV-REQ-056` · `BFF-REQ-055` · `FE-REQ-070` · 루트 `requirements/reports/checklists/F018-public-market-guest.md`) — 이 REQ 의 기존 확인 항목은 다시 열지 않음(동작이 바뀐 것은 국내 소유자 판정 · 로그인 조건뿐)

## 2026-11-12 — F017 단계 6 덧붙임

- [x] 뉴스 프리뷰 뷰모델에 `tag`(측정 태그 — `news-tag.viewmodel`)를 더했다. 카드 칸 판정(전문 끊기 · 플레이스홀더 0)은 그대로
- [x] 회귀: 영역 테스트 전체 통과(서버 1236 · BFF 453 · FE check-types · lint) — 기존 동작 바뀐 것 없음(태그는 덧붙임)
- 주인 REQ 의 체크리스트 · 미검증 표는 `SRV-REQ-053` · `FE-REQ-064` · `BFF-REQ-052` · `FC-REQ-028` · `DB-REQ-043`

## F017 v4 1e 짝 (2026-11-13, `feat/f017-v4-s1d-coach-panel`)

| 항목 | 상태 | 근거 |
|---|---|---|
| `gone.middleware.ts`(머리 주인) `RETIRED_PATHS` 에 코치 칸별 경로 둘(`/scenario` · `/explanation` → `/panel`, 1주) | 충족 | 주인 REQ 체크리스트(`FE-REQ-064` · `BFF-REQ-052`) |
