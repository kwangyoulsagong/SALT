# SRV-REQ-006 검증 체크리스트 — DDD 전환

작성: 2026-09-11 (1단계) · 갱신: 2026-09-11 (3단계) · 2026-09-18 (**4단계**)
브랜치: `feature/srv-req-006-ddd` → `feature/srv-req-006-coach` → `feature/srv-req-006-contexts`
상태: **4/4단계.** `shared` Kernel + 강제 수단(1) · `coach` 정책 추출 + 특성화 테스트(2) ·
`news`·`market`·`portfolio` 이관(3, FR-32a) · **`coach` 통합(4, FR-32)** 까지 왔다.
FR-33 의 나머지 이관(`auth`·`goal`·`notification`·동면 4종)은 `SRV-REQ-007` 이다 (§9-2 · §11).
선행 커밋: `fix(srv): 빌드 에러 17건` — 이 브랜치 계열은 그 위에 있다 (§6).

> **4단계 내용은 §10, 그 미충족은 §11 이다.** §1~§9 는 3단계 시점의 기록이고 값이 바뀐 행만
> "4단계" 표시로 갱신했다.

## 0. 실행한 검증 명령

| 명령 | 1단계 | 3단계 | 4단계 |
|---|---|---|---|
| `npm run lint` (`ddd/layers`) | 통과 | 통과 | **통과** |
| `npm test` | 18/18 | 85/85 (신규 44건) | **137/137** (신규 52건) |
| `npm run test:layer-check` | 16/16 | 16/16 | **16/16** (차단 10 · 통과 6) |
| `npm run build` | 0건 | 0건 | **0건** |
| `node dist/server.js` + `GET /health` | — | 200 | **200** · 인사이트 워커 1회차 완주 (§10-6) |

## 1. Acceptance Criteria

| AC | 결과 | 근거 |
|---|---|---|
| `src/` 최상위에 컨텍스트 디렉터리와 `shared`만 있다 | **부분** (4단계) | 컨텍스트 4개 + `shared`. **`modules` 가 12개 → 8개**(`auth`·`user`·`goals`·`investment-insight` 잔여·`investment-notification`·`mission`·`feed`·`dashboard`). `workers` · `external`(죽은 코드만) 이 남아 있다. §4 · §11-1 |
| `layer-check` 훅이 FR-11의 위반 6종을 exit 2로 차단한다 | **pass** | 10종을 차단한다 (§3) |
| `grep "@prisma/client" src/*/domain` = 0 | pass | `shared/domain` 포함 0건 |
| `grep "express\|zod" src/*/domain` = 0 | pass | 0건 |
| `grep "\.\./\.\./[a-z]*/infrastructure" src/*/application` = 0 | pass | **0건.** `application` 디렉터리 3개가 실제로 있는 상태에서 잰 값이다 |
| `Money` VO가 있고 금액을 `number`로 들고 다니는 도메인 코드가 0건 | **부분** | `portfolio/domain` 은 `Decimal` 로 계산한다(`number` 아님). **`Money` 는 아니다** — 이유는 §8-1 |
| `toKrwInteger()` 호출이 `presentation`에서만 | pass | 호출처 0건 — 세 컨텍스트가 `Money` 를 쓰지 않는다 (§8-1) |
| `application`의 서비스 이름이 전부 동사로 시작 | **pass** (4단계) | 유스케이스 **49개 전부** 동사형이다. `coach` 가 13개를 더했다(`Analyze`·`Check`·`Explain`·`Generate`·`Get`·`List`·`Record`·`Update`) |
| `prisma.$transaction` 호출이 `application` 밖에 0건 | **pass** | 세 컨텍스트의 `$transaction` **호출이 0건**이다(유일한 등장은 주석). 왜 안 걸었는지는 §8-2 |
| 트랜잭션 안에서 외부 HTTP를 부르는 코드 0건 | **pass** | 거래소·Fear&Greed·RSS 호출이 전부 트랜잭션 밖이다 (§8-2) |
| 신규 코드에 `payload` JSON 조건 쿼리 0건 | **pass** (4단계) | 0건. `signal-performance` 가 `payload.kind` 로 거르던 것은 **조회 조건이 아니라 이미 읽어 온 행의 메모리 필터**로 옮겼다(`domain/policy/signalPerformance.ts`) |
| 기존 엔드포인트 응답 스냅샷이 이관 전/후 동일 | **대체 충족** | §5 — 스냅샷 대신 **순수 계산 특성화 테스트 44건**(NFR 정정). FIFO 는 원문 `Float` 산술과 직접 대조했다 (§7-2) |
| 동면 모듈 코드가 삭제되지 않았다 | pass | `mission`·`feed`·`dashboard` 그대로 |
| re-export 껍데기 0건 | **pass** (4단계) | 네 컨텍스트 모두 껍데기 없이 옮겼다. 4단계에서 원문 29파일(3,538줄)을 **삭제**했다 (FR-37 · §10-1) |
| `npm run build` 통과 | **pass** | 0건. 기존 17건을 고친 커밋이 이 브랜치 계열 아래에 있다 (§6) |

## 2. Shared Kernel (FR-20~24)

| VO / 타입 | 지키는 것 | 테스트 |
|---|---|---|
| `Money` | 통화 혼합 예외 · 중간 반올림 금지 · `toKrwInteger` 1회 | 6건 |
| `Quantity` | 8자리 · 음수 금지 · **차감 음수 시 예외**(lot 소진량 ≤ 보유량) | 3건 |
| `KstDate` | tz 경계 — UTC 15:00이 KST 다음 날 | 4건 |
| `TickerSymbol` | 대문자 정규화 · 자산군 포함 동일성 | 2건 |
| `Degraded` | 이유 누적·중복 제거 | 2건 |
| `Currency` | KRW·USD | 1건 |
| `DomainError` · `ErrorKind` | 전역 미들웨어가 컨텍스트를 모르는 채로 매핑 | — |

측정: **18/18 통과.** `0.1 + 0.2 === 0.3` · `0.5 × 3 = 1.5 → 2원` · `2026-12-30T15:00Z → 2026-12-31`.

### 횡단 인프라

| 이동 | 전 | 후 |
|---|---|---|
| Prisma client | `src/config/database.ts` | `src/shared/infrastructure/prisma.ts` |
| env · logger · swagger | `src/config/*` | `src/shared/config/*` |
| 에러·로거·인증 미들웨어 | `src/middleware/*` | `src/shared/presentation/*` |
| `AppError` 계열 | `src/utils/error.util.ts` | `src/shared/presentation/httpErrors.ts` |
| JWT · password | `src/utils/*` | `src/shared/lib/*` |
| **신규** | — | `eventBus` · `httpClient`(타임아웃 기본값) · `scheduler`(인프로세스 락) · `healthRouter` |

`import` 76개 파일을 재배선했다. 잔존 옛 경로 **0건**.

## 3. `layer-check` 훅 (FR-10~13)

| # | 위반 | 규칙 |
|---|---|---|
| 1 | `domain` → `application` | `domain-to-application` |
| 2 | `domain` → `@prisma/client` | `domain-framework` |
| 3 | `domain` → `zod` | `domain-framework` |
| 4 | `application` → `infrastructure` | `application-to-infrastructure` |
| 5 | `presentation` → `infrastructure` | `presentation-to-infrastructure` |
| 6 | `shared` → 컨텍스트 | `shared-to-context` |
| 7 | 컨텍스트 → 타 컨텍스트 내부 | `cross-context` |
| 8 | `presentation` → 타 컨텍스트 공개 API | `presentation-cross-context` |
| 9 | 레지스트리에 없는 컨텍스트 | `registry` |
| 10 | 조합 컨텍스트에 Aggregate | `composite-domain` |

REQ 요구는 6종이고 8·9·10을 더 넣었다. **과차단 확인용 통과 케이스 6종**도 함께 돈다.

규칙 표는 `.claude/hooks/layer-rules.cjs` **한 파일**이고 훅(ESM)과 ESLint 플러그인이 같이 읽는다.
`no-restricted-imports` glob 으로 방향 규칙을 다시 쓰면 표가 두 벌이 되므로 쓰지 않았다.

## 4. 이관 전 모듈은 검사 대상이 아니다

`modules`·`external`·`workers`는 `LEGACY_ROOTS`로 규칙에서 제외했다. 그러지 않으면 기존 18개 모듈이
전부 위반으로 잡혀 lint 가 켜지자마자 무의미해진다.

**3단계에서 `modules` 가 15개 → 12개로 줄었다** (`news`·`portfolio`·`investment`·
`market-intelligence`·`technical-indicator` 제거). `external` 은 이제 **죽은 코드 하나만**
남았다(`upbit/upbit-ws.client.ts` — import 하는 곳 0건). `LEGACY_ROOTS` 에서 빼는 것은
그 파일을 지운 뒤이고 `SRV-REQ-007` 의 일이다.

## 5. 스냅샷 대신 특성화 테스트 (NFR 정정)

NFR 은 "이관 전/후 기존 엔드포인트 응답이 **바이트 단위로 같아야 한다. 스냅샷 테스트가 수용 기준**"
이라고 적었다. **DB 가 비어 있다** — `portfolioTransaction` 0행. 연결은 되지만 모든 엔드포인트가
`insufficient_data` 만 답하고, 그 상태로 찍은 스냅샷은 이관을 아무것도 검증하지 않는다.

REQ 본문을 정정해 **순수 계산 특성화 테스트**를 수용 기준으로 바꿨고, 3단계에서 44건을 썼다.

| 대상 | 건수 | 무엇을 고정하나 |
|---|---|---|
| `news/application` | 8 | 크롤링 계수 규칙 · 예외 메시지 · 중복 북마크 · 소스 분류 |
| `market/domain` | 14 | 심리 점수·라벨 경계 · 스마트머니 지수 · RSI/MA |
| `market/application` | 6 | **체결 대금 vs 수량 배선** · 고래 금액 기준 · 시세 실패 시 관심목록 추가 |
| `portfolio/domain` | 16 | **FIFO 원가** · 합산 · 성과 시계열 · 구간 파싱 |

**FIFO 는 원문 `Float` 산술을 테스트 안에 그대로 옮겨 와 직접 대조한다.** 현실적인 거래 열에서
차이가 **1원 미만**이고, 0.1 매수 1,000건에서는 원문만 오차를 남긴다(§7-2).

> 스냅샷은 여전히 불가다. DB 픽스처 시딩은 **원장 데이터가 곧 제품**인 이 레포에서
> `ledger`(F001)가 import 경로를 만든 뒤에 해야 한다 — §9-3.

## 6. 빌드 — 깨져 있었고, 고쳤다 (1단계)

작업 시작 시점에 `npm run build` 가 **에러 17건**으로 실패하고 있었다. 브랜치와 `main` 이 동일했다 —
이관이 만든 에러가 아니다.

| 파일 | 건수 | 성격 |
|---|---|---|
| `investment-insight/whale-signal.service.ts` | 11 | Prisma `Decimal` ↔ `number`, null 미처리, `InsightType` 불일치 |
| `portfolio/portfolio.service.ts` | 4 | `userId_symbol` 복합 키 없음, `assetType` 필수 누락 |
| `investment-insight/portfolio-rebalance.service.ts` | 2 | `InsightType` 불일치 |

전부 **Prisma 스키마와 코드의 어긋남**이고 이 REQ 이전부터 있었다. `npm start` 가 `dist/` 를 돌기
때문에 드러나지 않았다 — **빌드가 깨진 채로 배포 산출물만 살아 있었다.**

**별도 커밋 `fix(srv): 빌드 에러 17건` 으로 고쳤고 이 브랜치는 그 위에 있다.**
타입만 맞춘 것이 아니라 원인을 고쳤다:

| 원인 | 실제 피해 | 고침 |
|---|---|---|
| `InsightType` enum 에 `rebalance`·`whale_buy_signal`·`whale_sell_signal` 이 없다 | Prisma 가 런타임에도 거부 → **두 워커가 계속 실패** | 마이그레이션으로 값 3개 추가 |
| `PriceHistory.close`·`volume` 이 `Decimal`(volume 은 nullable)인데 `number` 로 산술 | 통과했더라도 `+` 가 문자열 연결 → **평균 거래량이 거짓** | 읽는 지점에서 `toNumber()` 1회 |
| `PortfolioHolding` 유니크가 `(userId, symbol, assetType)` 인데 `userId_symbol` 로 조회 | 자산군이 섞이고 삭제가 남의 행을 지운다 | 복합 키 정정 + `updateHolding` 에 `assetType` 전달 |

검증: `node dist/server.js` 기동 성공 · `GET /health` 200 · 마켓 동기화 288 심볼.

> **게이트는 "에러 0건"이다.** 실패하는 명령은 게이트가 아니다 — 그 사실을 `validation.md` 에 적었다.

## 7. 3단계 — `news` · `market` · `portfolio` (FR-32a)

### 7-1. 무엇이 옮겨졌나

| 컨텍스트 | 원본 | 유스케이스 | 공개 API |
|---|---|---|---|
| `news` | `modules/news` + `external/news-api` + `external/korean-news` | 9 | `findArticlesBySymbol` |
| `market` | `modules/investment` + `modules/market-intelligence` + `modules/technical-indicator` + 워커 4 | 18 | `latestIndicator` · `latestSentiment` · `recentWhaleTransactions` · `closesSince` |
| `portfolio` | `modules/portfolio` | 9 | `listHoldings` · `getHolding` · `listTransactions` |

**HTTP 경로 4개가 그대로다** (FR-35): `/api/news` · `/api/investment` ·
`/api/market-intelligence` · `/api/portfolio`.

**공개 API 에 실제 소비처를 붙였다** — 소비처 없이 설계하지 않기 위해서다:

| 소비처 | 무엇을 부르나 | 원래 |
|---|---|---|
| `market` → `news` | `findArticlesBySymbol` | `prisma.newsArticle` 직접 |
| `portfolio` → `market` | `closesSince` | `prisma.priceHistory` 직접 |
| `coach`(`market-regime`) → `market` | `latestIndicator` · `latestSentiment` | `prisma` 직접 |
| `coach`(`portfolio-state`) → `portfolio` | `listHoldings` | `prisma.portfolioHolding` 직접 |

### 7-2. FIFO — 처음으로 검증된 계산

원문에서는 `private updateHolding()` 안에 Prisma 조회와 저장 사이에 끼어 있었다.
**DB 없이는 한 줄도 실행할 수 없었고, DB 가 비어 있어 실제로 아무도 확인한 적이 없다.**

측정 (`src/portfolio/domain/__tests__/portfolio.test.ts`):

| 입력 | 원문(`Float`) | 이관(`Decimal`) |
|---|---|---|
| 0.1 매수 × 1,000건 → 수량 합계 | 100 이 **아니다** (오차 < 1e-9) | **정확히 100** |
| 현실적 거래 5건 (수량·투자금·실현손익·평균단가) | — | **차이 1원 미만** |

### 7-3. 고치지 않고 테스트로 고정한 것

**이관이 아니라 판단이 필요한 변경**이라 원문 동작을 그대로 뒀다. 각각 테스트가 있어
누군가 고치면 그 테스트가 "의도된 변경인가"를 묻는다.

| # | 무엇 | 왜 지금 안 고치나 |
|---|---|---|
| a | `fearGreed: 0` 이 falsy 로 걸러져 심리 점수에 혼합되지 않는다 | 극단적 공포(지수 0)가 총점을 못 낮춘다. 고치면 점수가 달라진다 |
| b | `calculateRSI` 가 `gains / (losses || 1)` 로 나눈다 — 하락 없는 구간에서 RSI 가 100 이 아니다(계단식 +1 이면 93) | 지표 정의 변경이다. 근거(과거 적중률)를 가진 쪽이 정한다 |
| c | 한글 뉴스 `source` 가 `GoogleNews(키워드)` 라 언어 분류 목록과 어긋난다 → `language: "ko"` 가 항상 0건 | HTTP 로 그 쿼리를 넘기는 경로가 **없다**(도달 불가). 맞추면 없던 필터가 갑자기 동작한다 |
| d | 매수 기록 없는 매도의 원가를 0 으로 본다 → 매도 전액이 실현 이익 | 원장 import 이전 이력의 문제다. 드러내는 것은 `invoice` 원장 건강도(F001) |
| e | 성과 곡선이 **현재** 보유 수량을 과거 가격에 곱한다 | 과거 보유 시계열은 `ledger`(F001)가 만든다 |

### 7-4. 고친 것 — 사유와 근거

| 무엇 | 왜 이관에서 고쳤나 |
|---|---|
| **부팅 시 `market-sync` 2회 실행** | `market-sync.worker.ts` 가 모듈 최상위에서 `worker.sync()` 를 부르고 `app.ts` 가 import 후 또 불렀다. **등록을 한 곳으로 모으는 것이 이관의 내용**이라 구조적으로 사라졌다 |
| **캔들 수집이 회차 전체를 중단시킴** | `collectSymbol` 에 try/catch 가 없어 심볼 하나의 실패가 `Promise.all` 을 타고 올라가 **보관 정책 삭제까지 건너뛰었다.** `workers-external.md` 가 금지하는 모양이다. 고친 뒤 기동에서 `DELETE` 2건이 실제로 돌았다 |
| **거래소 번역 두 벌** | `UpbitService.volume24h` 는 체결 **수량**, `market-intelligence` 의 axios 직접 호출은 체결 **대금**이었다. 합치면서 둘을 다른 필드로 분리하고 배선을 테스트로 못 박았다 |
| `getPortfolioStats` 가 거래 전체를 `findMany` 로 읽어 `length` 만 씀 | FR-43. 거래 5,000건이면 5,000행을 옮겨 와서 셌다 → `count` |
| 관심목록 삭제 3왕복 → 1왕복 | 조회·소유검사·삭제 사이에 상태가 바뀔 수 있었다 |
| `marketAsset.update` → `updateMany` | 거래소가 우리 DB 에 없는 심볼(동기화 전 신규 상장)을 주면 **배치 전체가 던졌다** |
| `whaleTransaction` 루프 `create` 10회 → `createMany` | N+1 |
| 성과 컨트롤러에 `try/catch` 없음 | 에러가 `errorMiddleware` 를 안 거쳤다 |

### 7-5. 옮기지 않은 죽은 코드

사용처 0건임을 grep 으로 확인하고 남기지 않았다 — 죽은 코드를 옮기면 다음 사람이 계약으로 읽는다.

`getAllMarkets` · `getBatchCandles` · `getCachedDailyCandles`(+캐시) ·
`getCachedMarketOverview` · `sortMarketOverview` · `modules/investment` 에 커밋돼 있던
빌드 산출물 9개(`.js`·`.d.ts`·`.map`).

### 7-6. 기동 검증

`node dist/server.js` → `GET /health` **200**. 마켓 동기화 **288 심볼**, 캔들 upsert **3,134건**,
보관 정책 `DELETE` 2건.

부팅 직후 네 작업이 동시에 거래소를 때려 **일부 심볼의 5분봉 수집이 실패**한다(레이트리밋).
치명적이지 않고 다음 5분 주기가 받는다. 지수 백오프는 §9 를 본다.

## 8. 규칙에서 벗어난 판단 셋

### 8-1. `portfolio/domain` 이 `Money` 가 아니라 `Decimal` 을 쓴다

AC 는 "금액을 `number` 로 들고 다니는 도메인 코드 0건"이고 `number` 는 쓰지 않는다.
그런데 `Money`·`Quantity` VO 도 쓰지 않았다.

**둘은 음수를 금지하는데(그게 그 VO 의 가치다) 이 데이터 모델은 음수 중간값을 만든다.**
과거 매수 수량을 줄이면 잔량이 음수가 되고, 매도 원가를 빼면 투자금이 음수가 된다.
VO 를 쓰면 그 경우 **예외가 나고 보유가 갱신되지 않는다** — 원문은 음수 수량을 0 이하로
보고 보유 행을 지웠다. 그건 이관이 아니라 정책 변경이다.

> **닫히는 조건:** 원장이 음수를 만들지 않게 되는 것 = `ledger` 컨텍스트(F001 ·
> `SRV-REQ-012`~`015`)가 거래를 불변 원장으로 다룰 때. 컬럼 `Float` → `Decimal` 은 `DB-REQ-007`.

### 8-2. `$transaction` 을 걸지 않았다

FR-42 는 트랜잭션을 `application` 에만 두라고 하고 여기가 그 자리인데, 세 컨텍스트에
호출이 0건이다.

거래 생성과 보유 재계산은 한 덩어리여야 하지만 **재계산은 그 사용자·종목의 거래 전체를
다시 읽는다.** 지금 감싸면 거래가 늘수록 트랜잭션이 길어지고 그 안에서 읽는 행이 계속
늘어난다 — `performance-server.md` §2 가 경고하는 모양이다.

버티는 이유는 **재계산이 멱등**이라는 것이다. 생성 직후 프로세스가 죽어도 다음 거래나
수정에서 전체 재계산으로 복구된다.

> **닫히는 조건:** `ledger`(F001)가 스냅샷 분리와 advisory lock 을 들여올 때
> (`performance-database.md` §5).

### 8-3. `ErrorKind` 에 `Forbidden` 을 추가했다

FR-22 는 네 값(`NOT_FOUND`·`CONFLICT`·`INVALID`·`BLOCKED`)만 적었다. 남의 거래에 손대는
경우 원문 응답은 **403** 이었고 선택지가 둘뿐이었다:

1. `Blocked`(422)로 매핑 → **응답 코드가 조용히 바뀐다**
2. `domain` 이 `shared/presentation` 의 `ForbiddenError` 를 import → **`ddd-domain.md` 의
   허용 목록에 그 경로가 없다** (레이어 규칙 위반)

둘 다 이관이 계약이나 규칙을 조용히 바꾸는 것이라 커널에 값을 하나 늘렸다. 사유는
`shared/domain/DomainError.ts` 의 enum 주석에 있다.

## 9. 미충족 · 범위 밖

| # | 항목 | 사유 | 언제 닫히나 |
|---|---|---|---|
| 9-1 | ~~FR-32 `coach` 통합~~ | **닫혔다 (4단계 · §10).** 남은 것은 §11 | 2026-09-18 |
| 9-2 | FR-33 나머지 이관 — `auth` · `goal` · `notification` · 동면 4종 | `coach` 뒤다. **`modules` 8개**가 남아 있다 (4단계에서 12 → 8) | `SRV-REQ-007` |
| 9-3 | 스냅샷 테스트 (원 NFR) | DB 가 비어 있다(§5). 특성화 테스트 44건으로 **대체**했고 REQ 본문을 정정했다 | `ledger`(F001)가 import 경로를 만든 뒤 |
| 9-4 | `portfolio` 금액이 `Money` 가 아니다 | §8-1 — VO 가 음수를 금지하는데 이 데이터 모델이 음수 중간값을 만든다 | `ledger`(F001 · `SRV-REQ-012`~`015`) · 컬럼은 `DB-REQ-007` |
| 9-5 | `RecordTransaction` 에 트랜잭션 경계가 없다 | §8-2 — 재계산이 거래 전체를 다시 읽어 거래 수에 비례해 트랜잭션이 길어진다. 재계산이 멱등이라 버틴다 | `ledger`(F001) 스냅샷 분리 시 |
| 9-6 | `AssetType` enum 이 둘이다 (DB `crypto`·`stock` vs 커널 3값) | 커널 타입을 쓰면 DB 가 거부하는 값이 컴파일을 통과한다. 두 컨텍스트가 DB 값만 쓰도록 막아 뒀다 | `DB-REQ-003` (`ALTER TYPE` 락 측정 포함) |
| 9-7 | `assetType` 을 DTO 가 받지 않아 `crypto` 로 고정 | 컬럼이 나중에 추가되며 코드가 따라오지 않았다. 계약을 바꾸지 않으려고 기본값 유지 | F000·F001 (프론트·BFF 계약과 함께) |
| 9-8 | 부팅 시 일부 심볼 5분봉 수집 실패 (레이트리밋) | 네 작업이 동시에 거래소를 때린다. 치명적이지 않고 다음 주기가 받는다. **지수 백오프 3회**(`workers-external.md`)가 아직 없다 | `SRV-REQ-007` 또는 `performance-server` 작업 |
| 9-9 | `external/` 에 죽은 코드 하나 (`upbit/upbit-ws.client.ts`) | import 하는 곳 0건. 삭제는 근거(grep)를 붙여 별도로 한다 | `SRV-REQ-007` (삭제 5건) |
| 9-10 | 한글 뉴스 언어 필터가 항상 0건 | §7-3c — 도달 불가 코드다. 맞추면 없던 필터가 갑자기 동작한다 | `SRV-REQ-007` (살릴지 지울지) |
| 9-11 | 성과 곡선이 과거 보유 수량을 쓰지 않고 `degraded` 도 없다 | §7-3e — 원장 시계열이 필요하다 | F001(원장) · F006(홈 블록) |
| 9-12 | FR-31 "신규 컨텍스트를 DDD 로 새로 쓴다" | `ledger`·`invoice`·`tax`·`plan`·`fx`·`device` 는 **기능 자체가 없다.** REQ 본문에서 각 기능 REQ 로 넘겼다 | F001~F007 |
| 9-13 | `Float` 원장 컬럼의 `Decimal` 이관 | 스키마 변경은 `DB-REQ-*` 의 것이다 | `DB-REQ-007` |

> **이 표와 `§1 Acceptance Criteria` 가 어긋나면 둘 중 하나가 거짓이다.**
> AC 의 "부분"·"대체 충족"은 전부 여기에 행이 있다.

## 10. 4단계 — `coach` 통합 (FR-32)

### 10-1. 무엇이 옮겨졌나

원문 **29파일 3,538줄을 삭제**하고 `coach` 컨텍스트 하나로 합쳤다. 껍데기를 남기지 않았다(FR-37).

| 원문 | 간 곳 |
|---|---|
| `investment-insight/ai-coach/*` (9파일) | `coach/domain/policy/{score,candidates,explain,modeDecision}` · `application` · `presentation` |
| `ai-investment-coach.service` (482줄) | `GenerateCoachRecommendation` · `GetCoachRecommendation` · `GetSymbolCoach` · `ManageCoachProfile` · `RecordCoachFeedback` |
| `behavior-analysis.service` (358줄) | `domain/policy/behavior` + `AnalyzeTradingBehavior` |
| `news-analysis.service` (282줄) | `domain/policy/newsSentiment` + `AnalyzeNewsSentiment` |
| `market-regime.service` · `portfolio-state.service` | `domain/policy/{marketRegime,portfolioState}` |
| `modules/behavior-coach` · `profit-plan` · `trade-preflight` · `signal-performance` | `coach/application` 4개 + `presentation` |

**HTTP 경로 5개가 그대로다** (FR-35): `/api/ai-coach` · `/api/behavior-coach` ·
`/api/profit-plan` · `/api/trade-preflight` · `/api/signal-performance`.
`/api/ai-coach/explain` 이 **인증 앞에 있는 순서까지** 유지했다 — 줄 위치가 곧 공개 여부다.

유스케이스 13개 전부 동사형이다. `coach` 는 **공개 API 를 열지 않았다** — 부르는 컨텍스트가
아직 없고, 첫 소비처는 F006 홈 브리핑이다 (§11-9).

### 10-2. 남의 테이블 직접 조회 6개가 사라졌다

원문 코치는 `prisma` 로 **남의 컨텍스트 테이블 5개**를 직접 뒤졌다. 전부 Port + ACL 로 바뀌었다.

| 원문이 읽던 것 | 지금 |
|---|---|
| `portfolioHolding` · `portfolioTransaction` | `PortfolioApi` → `HoldingTradeAdapter` |
| `technicalIndicator` · `marketSentiment` · `marketAsset` · `whaleTransaction` · `priceHistory` | `MarketApi` → `MarketSignalAdapter` |
| `newsArticle` | `NewsApi` → `ArticleTextAdapter` |

그러려면 **공개 API 를 9개 늘려야 했다.** 늘린 것과 이유:

| 컨텍스트 | 추가 | 왜 |
|---|---|---|
| `news` | `findArticlesForSentiment` | 감성 채점은 **본문**까지 본다. 목록용 `ArticleSummary` 에는 `content` 가 없다 |
| `market` | `latestIndicators` · `latestSentiments` · `assetQuotes` · `recentWhalesForSymbols` · `highestCloseSince` · `closeAtOrAfter` · `latestCloses` | 전부 **여러 심볼을 한 번에**. 심볼당 조회로 열면 코치가 N+1 을 만든다 |
| `portfolio` | `countTransactions` · `listTransactions(since·assetType)` | 건수를 세려고 거래 행을 옮겨 오지 않는다 (`ddd-infrastructure.md` §3) |

**키워드 사전은 `coach` 에 남겼다.** "무엇을 호재로 보는가"는 `news` 의 판단이 아니다 —
`news` 는 검색어를 인자로 받는다.

### 10-3. 특성화 테스트 52건 (FR-32b)

| 대상 | 건수 | 무엇을 고정하나 |
|---|---|---|
| `policy/score` | 18 | 점수 엔진 468줄 — 가중치·상한·계단식 고래 금액·행동 페널티 |
| `policy/marketRegime` · `portfolioState` · `candidates` | 10 | 국면 경계 · 집중도 등급 · 후보 생성 순서 |
| `policy/modeDecision` | 4 | 단타/장기가 같은 입력에 다른 점수를 주는 지점 |
| `policy/newsSentiment` | 4 | **부분 문자열 누적** · 시간 가중치 0.3 하한 · 본문 채점 |
| `policy/behavior` | 8 | 과다거래·패닉셀·추격매수 severity 식과 임계 |
| `policy/signalPerformance` · `explain` | 8 | 승률·낙폭 집계 · 심볼 해석 순서 · severity/confidence 상한 |

**18건이 첫 실행에 그대로 통과했다** — 기대값을 원문 식에서 손으로 풀어 적었고, 옮긴 코드가
같은 값을 냈다는 뜻이다. `npm test` 85 → **137건**.

### 10-4. 이관에서 고친 것 — 사유

| 무엇 | 왜 이관에서 고쳤나 |
|---|---|
| **추격 매수 판정이 심볼마다 `aggregate` 를 불렀다** | 심볼 수만큼 왕복이다. `groupBy` 한 번으로 바꿨다 — 조회를 Port 뒤로 옮기는 것이 이관의 내용이라 구조적으로 드러났다 |
| **행동 코치가 거래 행 전체를 읽어 `length` 로 셌다** | FR-43. `countTransactions` 로 바꿨다 |
| **성적표가 판단 1건마다 최신가를 다시 조회** | 최신가는 심볼 단위다. 배치로 바꿔 쿼리를 절반으로 줄였다(진입가는 §11-4) |
| **컨트롤러의 `console.error` + `next(error)` 이중 로깅** | 같은 에러가 두 번 남고, **해설 실패 로그에 모델 응답이 섞여 있었다**(`ddd-infrastructure.md` §6 이 금지하는 원문 로깅). 파싱 실패 예외에서도 응답 본문을 뺐다 |
| **지표 주기가 경로마다 달랐다** | `ai-coach-feature.extractor` 는 `m5` 로 못 박고 `buildSymbolCoach` 는 주기를 안 정했다. 같은 심볼이 호출마다 다른 RSI 를 줬다 → **`m5` 로 통일**(§11-2) |
| `mode` enum 이 세 DTO 에 복사돼 있었다 | 한 파일로 모았다. `trade-preflight` 는 도메인 enum 을 직접 검증한다 |

### 10-5. 고치지 않고 테스트로 고정한 것

| # | 무엇 | 왜 지금 안 고치나 |
|---|---|---|
| a | `makeModeDecision` 의 `riskLevel` 삼항이 두 갈래 모두 `medium` | 값이 같아 **동작 동일**이다. 식만 줄이고 주석을 남겼다 — 등급을 나누는 것은 판단 변경이다 |
| b | 패닉셀이 **매수 원가가 아니라 현재가** 대비로 손실을 본다 | 원문의 한계이고 주석도 그렇게 적혀 있었다. 거래별 귀속은 `ledger`(F001)의 일이다 |
| c | 뉴스 키워드가 부분 문자열로 중복 가산된다("ETF 승인" 하나에 3개가 걸린다) | 점수 체계 변경이다. 테스트가 39점을 못 박았다 |
| d | 국면 판정이 지표 없음과 중립(50)을 같게 본다 | 기본값을 바꾸면 국면이 달라진다 |

### 10-6. 기동 검증

`node dist/server.js` → `GET /health` **200**(포트 4000).
인사이트 워커 1회차가 **새 코치 유스케이스로 완주**했다:
`📰 뉴스 감성 → 🧠 행동 분석 → 🤖 AI 코치 → ✅ 완료`.

경로 5개 라우팅 확인: 인증 필요한 넷이 **401**, `/api/ai-coach/explain` 이 **400**(빈 본문 검증
실패) — 공개 경로가 여전히 인증 앞에 있다는 뜻이다.

## 11. 4단계의 미충족 · 범위 밖

| # | 항목 | 사유 | 언제 닫히나 |
|---|---|---|---|
| 11-1 | `modules` 8개가 남아 있다 (`auth`·`user`·`goals`·`investment-insight` 잔여·`investment-notification`+동면 3종) | FR-33 이고 `coach` 뒤 순서다 | `SRV-REQ-007` |
| 11-2 | **LLM 해설이 `expectedReturn`(수익률 예측 범위)을 만든다** | 전 영역 공통 수용 기준 4("수익률 예측 0건")와 어긋난다. **원문 그대로 옮겼다** — 응답 계약이고 BFF 가 그대로 흘려보낸다(프론트 소비처는 grep 0건). 빼는 것은 계약 변경이라 **프론트가 먼저**다 | F004 코치 화면 계약 확정 시 — **가장 먼저 닫아야 할 항목** |
| 11-3 | 지표 주기를 `m5` 로 통일했다 | `buildSymbolCoach` 경로는 원문이 주기를 안 정했다(=`m5`·`h1` 중 최신). 값이 달라질 수 있다 — 대신 호출마다 흔들리지 않는다 (§10-4) | 유지 (판단 완료) |
| 11-4 | 성적표 진입가가 아직 판단 1건마다 조회다 | 판단 시각마다 기준이 달라 배치가 안 된다. 성적을 스냅샷 테이블로 옮기면 루프가 사라진다 | F004 |
| 11-5 | `generate`·`getLatest` 응답에서 `userId`·`assetType` 이 빠졌다 | 도메인 모델이 DB row 를 그대로 싣지 않는다. `userId` 는 토큰에서 오고 `assetType` 은 이 행에서 항상 `null` 이다. BFF·프론트 소비처 grep 0건 | 유지 (판단 완료) |
| 11-6 | `InvestmentInsight` 테이블의 주인이 둘이다 | `smart_buy_zone`·`risk_alert` 은 아직 `modules/investment-insight` 워커가 쓴다. 코치는 **읽기만** 한다 | `SRV-REQ-007` |
| 11-7 | 판단 변화 통보를 알림 테이블에 직접 쓴다 | `notification` 컨텍스트가 없다. 지금 이벤트로 내면 받을 쪽이 없다. `CoachNotifier` 구현 한 파일만 바뀐다 | FR-33 (`notification` 이관) |
| 11-8 | LLM 호출에 타임아웃·지수 백오프가 없다 | 원문에 없었고 넣으면 실패 시 비용·지연 성격이 바뀐다 (`ddd-infrastructure.md` §6 은 요구한다) | `SRV-REQ-007` 또는 `performance-server` 작업 |
| 11-9 | `coach` 공개 API 가 없다 | 부르는 컨텍스트가 0개다. 소비처 없이 열면 첫 소비처가 그 모양에 끌려간다 | F006 `homebriefing` |
| 11-10 | `/api/ai-coach/explain` 이 인증·레이트리밋 없이 공개다 | 원문 주석의 TODO 그대로다(프로토타입 데모). **순서를 유지하는 것**이 이관의 일이었다 | 배포 전 (`auth-security.md`) |
| 11-11 | 코치의 쓰기에 트랜잭션 경계가 없다 | 쓰기가 인사이트 1행 + 알림 0~1행이고 서로 독립이다. 묶으면 얻는 것 없이 트랜잭션만 길어진다 | 판단 완료 (§8-2 와 같은 근거) |
| 11-12 | 주문 전 계산의 총평가액에 `assetType` 필터가 없다 | 원문은 `crypto` 만 합산했다. `PortfolioApi.listHoldings` 에 자산군 인자가 없고, 3단계의 `portfolio-state` 도 이미 같은 상태다 | `DB-REQ-003`(자산군 확장) 때 함께 |

> **이 표와 §1 · §9 가 어긋나면 둘 중 하나가 거짓이다.**
