# SRV-REQ-006 검증 체크리스트 — DDD 전환

작성: 2026-09-11
브랜치: `feature/srv-req-006-ddd`
상태: **1단계(A·B·C)만 완료.** 컨텍스트 이관(D)은 시작하지 않았다. 근거는 §7.
선행 커밋: `fix(srv): 빌드 에러 17건` — 이 브랜치는 그 위에 있다 (§6).

## 0. 실행한 검증 명령

| 명령 | 결과 |
|---|---|
| `npm run lint` (`ddd/layers`) | **통과** |
| `npm test` (Shared Kernel) | **18/18 통과** |
| `npm run test:layer-check` | **16/16 통과** (차단 10 · 통과 6) |
| `npm run build` | **에러 0건** — 기존 17건은 별도 커밋으로 고쳤다 (§6) |

## 1. Acceptance Criteria

| AC | 결과 | 근거 |
|---|---|---|
| `src/` 최상위에 컨텍스트 디렉터리와 `shared`만 있다 | **미충족** | `shared`는 섰지만 컨텍스트가 0개다. `modules`·`external`·`workers`가 남아 있다. §7 |
| `layer-check` 훅이 FR-11의 위반 6종을 exit 2로 차단한다 | **pass** | 10종을 차단한다 (§3) |
| `grep "@prisma/client" src/*/domain` = 0 | pass | `shared/domain` 포함 0건 |
| `grep "express\|zod" src/*/domain` = 0 | pass | 0건 |
| `grep "\.\./\.\./[a-z]*/infrastructure" src/*/application` = 0 | pass | `application` 디렉터리가 아직 없다 (vacuous) |
| `Money` VO가 있고 금액을 `number`로 들고 다니는 도메인 코드가 0건 | **부분** | `Money`는 있다. 도메인 코드가 아직 `shared`뿐이라 판정 대상이 적다 |
| `toKrwInteger()` 호출이 `presentation`에서만 | pass | 호출처 0건 (아직 없음) |
| `application`의 서비스 이름이 전부 동사로 시작 | **미충족** | `application`이 없다. §7 |
| `prisma.$transaction` 호출이 `application` 밖에 0건 | **미충족** | 현재 전부 `modules/*/service.ts` 안이다 |
| 트랜잭션 안에서 외부 HTTP를 부르는 코드 0건 | **미검증** | 이관 대상 코드를 아직 안 봤다 |
| 신규 코드에 `payload` JSON 조건 쿼리 0건 | pass | 신규 코드에 0건 (기존 `signal-performance`에는 있다) |
| 기존 엔드포인트 응답 스냅샷이 이관 전/후 동일 | **불가** | §5 — **DB가 비어 있어 스냅샷이 성립하지 않는다** |
| 동면 모듈 코드가 삭제되지 않았다 | pass | `mission`·`feed`·`dashboard` 그대로 |
| re-export 껍데기 0건 | pass | 껍데기를 쓰지 않았다 |
| `npm run build` 통과 | **pass** | 0건. 기존 17건을 고친 커밋이 이 브랜치 아래에 있다 (§6) |

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
전부 위반으로 잡혀 lint 가 켜지자마자 무의미해진다. **컨텍스트가 옮겨질 때마다 이 목록이 줄어든다.**

## 5. 스냅샷 테스트가 성립하지 않는다 (NFR)

NFR 은 "이관 전/후 기존 엔드포인트 응답이 **바이트 단위로 같아야 한다. 스냅샷 테스트가 수용 기준**"
이라고 적었다.

**DB 가 비어 있다** — `portfolioTransaction` 0행. 연결은 되지만 모든 엔드포인트가
`insufficient_data`만 답한다. 그 상태로 찍은 스냅샷은 이관을 아무것도 검증하지 않는다.

대안은 두 가지이고 §7에 적었다.

## 6. 빌드 — 깨져 있었고, 고쳤다

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

## 7. 미충족 · 범위 밖

| # | 항목 | 사유 | 언제 닫히나 |
|---|---|---|---|
| 7-1 | **FR-31~33 컨텍스트 이관 전부** | §7-2 참고. 1단계에서 멈췄다 | 후속 작업 |
| 7-2 | `coach` 를 먼저 옮기라는 FR-32 가 성립하지 않는다 | `ai-coach` 가 `market-regime`·`portfolio-state`·`news-analysis` 를 직접 부른다. 컨텍스트 경계 규칙상 **그 셋의 `application/api` 가 먼저 있어야** `coach` 를 옮길 수 있다. 즉 FR-32 는 실제로 `coach`+`market`+`portfolio`+`news` 동시 이관이고, REQ 가 적은 "coach 먼저"보다 범위가 크다 | REQ 본문 정정 후 |
| 7-3 | 스냅샷 테스트 (NFR) | DB 가 비어 있다 (§5) | 픽스처 시딩 또는 순수 계산 특성화 테스트로 대체 |
| 7-5 | FR-31 의 "신규 컨텍스트를 DDD 로 새로 쓴다" | `ledger`·`invoice`·`tax`·`plan`·`fx`·`device` 는 **기능 자체가 없다.** 빈 디렉터리를 만드는 것은 레지스트리 철학("표에 있다고 폴더가 있는 것은 아니다")과 어긋난다 | 각 기능 REQ (F001~F007) |
| 7-6 | 의존성 주입 방식 (Open Question) | 컨텍스트가 아직 0개라 판단 근거가 없다 | 첫 컨텍스트 이관 시 |
| 7-7 | `Float` 원장 컬럼의 `Decimal` 이관 (Open Question) | 스키마 변경은 `DB-REQ-*` 의 것이다 | `DB-REQ-007` |
