---
id: SRV-REQ-006
area: srv
kind: ARCH
title: "DDD 전환 — 기술 레이어 모듈에서 컨텍스트 우선 4층으로"
priority: critical
labels: [architecture, ddd, refactoring, layer-check, migration]
created: 2026-09-09
---

> **정정 기록 (2026-09-11, 1단계 구현 후).** FR-12 · FR-31 · FR-32 · NFR 동작 동일성 네 항목을
> 정정했다. 근거는 `requirements/reports/retrospects/SRV-REQ-006.md` §6.
> 각 정정은 해당 섹션 아래 인용 블록에 있다.

## Summary

`src/modules/{domain}/{routes,controller,service,dto}`를 **Bounded Context 우선 DDD 4층**으로 바꾼다. 컨텍스트 이름은 프론트 FSD 슬라이스와 **동일**하게 맞춘다. 레이어 위반을 **쓰기 시점에 차단하는 훅**을 붙인다.

## 왜 지금 구조를 바꾸는가 — 관찰된 문제 5개

### 문제 1 — 서비스가 God 클래스로 자라고 있다

현재 `src/modules`는 18개 도메인이고 각각 `service.ts` 하나에 유스케이스가 전부 들어간다. `investment-insight/` 하나에 서비스가 12개 파일로 쪼개졌지만(`market-regime` · `portfolio-state` · `news-analysis` · `whale-signal` · `risk-alert` · `portfolio-rebalance` · `behavior-analysis` · `insight-ranking` · `ai-investment-coach` …) **그 경계가 무엇인지 규칙이 없다.** 새 파일을 어디에 둘지 매번 판단해야 한다.

앞으로 들어올 것: 반사실 엔진, 취득가액 lot 엔진, 손실수확 솔버, 환율 함정 탐지, 크립토 시나리오, 손익분기 솔버, 결제 캘린더, 법령 파라미터, 증빙 아카이브, 밴드 엔진, 김프, 지표 수집, 코치 대화. **13개 이상이다.** 지금 축이면 `modules/tax/tax.service.ts`가 2,000줄이 된다.

### 문제 2 — 도메인 규칙이 Prisma 모양에 묶여 있다

`profit-plan.service.ts`가 손절·익절 가격을 계산하는데, 입력이 `prisma.portfolioHolding.findMany()`의 결과이고 계산이 `holding.currentPrice * 0.94` 같은 **`Float` 산술**이다.

이 제품의 핵심 불변식이 금액에 있다 — **청구서 항등식 잔차 ≤ 100원**, 취득가액 lot 소진량 ≤ 보유량, 솔버 매도 수량 ≤ 보유 수량. `Float`와 DB row 위에서는 그 불변식을 표현할 자리가 없다.

### 문제 3 — 계약 밖에서 서로를 부른다

`behavior-coach.service.ts`가 `investment-insight/behavior-analysis.service`를 직접 import하고 그것을 실행한 뒤 `prisma.investmentInsight.findMany()`를 다시 부른다. 두 모듈의 경계가 없다.

F001은 `behavior-coach`의 편향 판정을 **거래 단위 라벨러로 재사용**해야 하고, F004는 `signal-performance`와 `IndicatorTrackRecord`를 **조립**해야 한다. 경계 없이 그걸 하면 순환이 생긴다.

### 문제 4 — 트랜잭션 경계가 없다

`prisma.$transaction`을 쓰는 곳이 정해져 있지 않다. LLM 호출(수십 초)이 트랜잭션 안에 들어가면 사용자 ≤10명 서버가 멈춘다. 앞으로 LLM 경로가 **대화까지 늘어난다.**

### 문제 5 — JSON을 조건으로 뒤진다

`signal-performance.service`가 `InvestmentInsight` 100건을 읽어와 애플리케이션에서 `payload.kind === 'coach_feedback'`으로 버린다. 인덱스를 못 쓰고, `payload` 구조가 계약이 아닌데 계약처럼 쓰인다.

---

## 후보 4개를 비교했다

| | A. 현재 유지 | B. 모듈 안에서 레이어만 | **C. 컨텍스트 우선 DDD** | D. 헥사고날(전역 레이어) |
|---|---|---|---|---|
| 새 엔진 13개를 둘 자리 | 판단 필요 | 판단 필요 | **컨텍스트가 결정한다** | 레이어가 결정, 도메인은 흩어진다 |
| 금액 불변식 표현 | 불가(`Float` + row) | 부분적 | **✓ VO + Aggregate** | ✓ |
| 모듈 간 경계 강제 | 없음 | 없음 | **✓ `application/api`만 공개** | 약함 |
| 트랜잭션 경계 | 없음 | 규약 필요 | **✓ `application`만** | ✓ |
| 프론트 슬라이스와 이름 정합 | 부분적 | 부분적 | **✓ 레지스트리로 명시** | ✗ 레이어가 최상위라 도메인이 안 보인다 |
| 이관 비용 | 0 | 낮음 | **높음** | 높음 |
| 참조 구현 보유 | — | — | **✓ DevAtlas 규칙 5종 + 훅** | — |

### A를 버린 이유
문제 1~5를 그대로 안는다. 새 엔진 13개가 들어오는 시점에 이 축은 버티지 못한다.

### B를 버린 이유 — 가장 싼 후보

`modules/tax/{controller,service,repository,domain}` 처럼 **모듈 안에만 레이어**를 두는 안. 비용이 가장 싸고 현재 구조에서 자연스럽다.

**안 되는 것:** 모듈 간 경계를 무엇으로도 막지 못한다. 문제 3이 그대로 남는다. `invoice`가 `tax`의 취득가액을, `coach`가 `indicator`의 실패이력을, `plan`이 `fx`의 환율을 필요로 한다 — **경계가 없으면 서로의 `service`를 직접 부르고, 그게 순환이 된다.**

**우리에게 안 맞은 결정적 이유:** F001~F004는 **서로의 계산 결과를 소비하는 구조**다. 청구서가 취득가액을 쓰고, 세금이 원장을 쓰고, 코치가 지표·성적표·편향을 쓴다. 이 의존을 **공개 API 하나로 제한하지 않으면** 몇 달 뒤 어느 것도 혼자 추론할 수 없다.

### D를 버린 이유
전역 레이어(`src/{domain,application,infrastructure,presentation}`)를 쓰면 **도메인이 레이어 안에 흩어진다.** `src/domain/`에 Aggregate 14종이 평평하게 쌓이고, 세금을 고칠 때 네 디렉터리를 연다. 문제 1이 형태만 바꿔 남는다. **프론트 FSD와 이름 축을 맞출 수도 없다.**

### C가 우리에게 맞은 결정적 이유 3개

1. **프론트 FSD 슬라이스와 컨텍스트 이름을 1:1로 맞출 수 있다.** 프론트 FSD 전환(`FE-REQ-009`)이 같은 시점에 진행된다. **두 전환의 이름 축을 하나로 맞출 수 있는 유일한 시점**이다.
2. **금액 불변식을 담을 자리가 생긴다.** `Money` VO 하나로 반올림 시점·통화 혼합·정밀도를 한 곳에서 지킨다. 미국주식이 들어오면서 통화 혼합이 실제 위험이 된다.
3. **조합 컨텍스트가 부분 실패를 설계 가능하게 만든다.** 홈 5블록의 "하나가 실패해도 나머지는 내려준다"(F006 FR-5)를 `homebriefing` 컨텍스트가 담는다. 지금은 그 조립이 BFF에만 있고 서버 쪽 대응이 없다.

---

## Requirements

### A. 컨텍스트 구성

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `src/{context}/{domain,application,infrastructure,presentation}` 구조를 만든다. 컨텍스트 목록은 `server-architecture.md` §2 레지스트리 | Must |
| FR-2 | `src/shared/{domain,infrastructure,presentation,config,lib}`를 만든다. 현재 `src/config`·`src/middleware`·`src/utils`가 이관 대상 | Must |
| FR-3 | 조합 컨텍스트 `homebriefing` · `onboarding`을 만든다. **Aggregate 없이 `application`(+`presentation`)만** | Must |
| FR-4 | 컨텍스트 밖으로 열리는 것은 `{context}/application/api/index.ts`뿐이다 | Must |
| FR-5 | `src/workers`는 유지하되 **스케줄과 락만** 담당하고 `application`의 유스케이스를 부른다 | Must |

### B. 레이어 규칙 강제

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | `.claude/hooks/layer-check.mjs`를 이식한다. Edit/Write 직전 검사 + exit 2 차단. 규칙 표는 `layer-rules.mjs` | Must |
| FR-11 | 차단 대상: `domain` → 상위/타 컨텍스트/`@prisma/client`/`express`/`zod`, `application` → `infrastructure`, `presentation` → `infrastructure`/타 컨텍스트, `shared` → 아무 컨텍스트, 컨텍스트 → 타 컨텍스트(`application/api` 제외) | Must |
| FR-12 | 같은 검사를 ESLint에도 넣는다. ~~(`no-restricted-imports` 패턴)~~ → **`layer-rules.cjs`의 판정 함수를 부르는 커스텀 규칙**으로 한다 (아래 정정) | Must |
| FR-13 | 레지스트리에 없는 컨텍스트 디렉터리 생성을 차단한다 | Should |

> **FR-12 정정 (2026-09-11).** `no-restricted-imports`의 glob으로 방향 규칙을 표현하면
> **판정이 두 곳에 생기고 한쪽만 고쳐진다.** 레포 CLAUDE.md의 "하네스를 다시 늘리려면
> 미러가 아니라 같은 파일을 가리키게 한다"가 여기에도 적용된다.
> `eslint.config.mjs`가 `layer-rules.cjs`의 `checkImport`를 그대로 부른다 —
> 프론트(`FE-REQ-009` FR-21)와 같은 방식이다.

### C. `shared` Kernel

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | **`Money` VO를 만든다.** `Decimal`(decimal.js) 기반, 통화 태그, `plus`/`times`, **`toKrwInteger()`는 응답 직전 1회만** | Must |
| FR-21 | `Quantity`(8자리) · `UserId` · `Symbol`(대문자 정규화) · `AssetType`(3값) · `KstDate`(tz 경계) VO를 만든다 | Must |
| FR-22 | `DomainError` 기반 타입 + `ErrorKind`(`NOT_FOUND`·`CONFLICT`·`INVALID`·`BLOCKED`)를 만든다. 전역 에러 미들웨어가 이 상위 타입만 본다 | Must |
| FR-23 | `Degraded` 표현(이유 코드 배열)을 만든다. 청구서·세금·적립이 공유한다 | Must |
| FR-24 | `shared/infrastructure`에 Prisma client 단일 인스턴스 · HTTP 클라이언트 팩토리 · **인프로세스 이벤트 버스** · cron 등록을 둔다 | Must |

### D. 이관 순서 (기능 정지 없이)

> **FR-32 정정 (2026-09-11) — "coach 먼저"는 성립하지 않는다.**
>
> ```
> ai-coach/*  →  ai-investment-coach.service  →  market-regime.service    (→ market)
>                                             →  portfolio-state.service  (→ portfolio)
>                                             →  news-analysis.service    (→ news)
>                                             →  behavior-analysis.service (→ coach)
> ```
>
> `profit-plan`·`trade-preflight`도 `portfolioHolding`을 직접 읽는다. 경계 규칙(§4 "다른 컨텍스트는
> `application/api`로만")을 지키려면 **`portfolio`·`market`·`news`의 공개 API가 먼저 있어야 한다.**
>
> 즉 FR-32는 실제로 **네 컨텍스트 동시 이관(~3,600줄)** 이다. 순서를 FR-32a·FR-32b로 명시한다.
> 절반 옮긴 컨텍스트를 남기면 두 아키텍처가 공존하는 동안 어느 규칙을 따라야 하는지 알 수 없다.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | **`shared`를 먼저 세운다.** `Money`·`DomainError`가 없으면 어느 컨텍스트도 옮길 수 없다 | Must |
| FR-31 | ~~다음 **신규 컨텍스트를 DDD로 새로 쓴다**: `ledger` · `invoice` · `tax` · `plan` · `indicator` · `fx` · `device`~~ **→ 각 기능 REQ로 넘긴다.** 이 REQ에서 하지 않는다 | ~~Must~~ |

> **FR-31 정정 (2026-09-11).** 이관 비용이 0인 이유는 "기존 코드가 없다"인데, **기능 자체가 없다.**
> 빈 컨텍스트 디렉터리를 만드는 것은 레지스트리 철학("표에 있다고 폴더가 있는 것은 아니다")과
> 어긋나고, 첫 유스케이스를 쓸 사람이 이미 있는 뼈대에 맞추게 만든다. `ledger`는 `DB-REQ-005`~`008`과
> `SRV-REQ-012`~`015`가, `tax`는 `SRV-REQ-016`~`019`가 자기 컨텍스트를 만든다.
| FR-32 | **`coach`를 옮긴다.** `investment-insight/ai-coach` + `signal-performance` + `profit-plan` + `behavior-coach` + `trade-preflight` + `behavior-analysis`를 한 컨텍스트로 통합한다. F004·F006이 이것을 조립해야 하므로 경계가 먼저 필요하다 | Must |
| FR-32a | **선행: `portfolio`·`market`·`news`의 `application/api`를 먼저 만든다.** `coach`가 그것을 부른다 (아래 정정) | Must |
| FR-32b | **선행: 순수 계산 특성화 테스트를 먼저 쓴다.** 손절·익절 가격 · 손익비/비중 · 점수 엔진 (NFR 정정) | Must |
| FR-33 | 그 다음 `portfolio` · `market` · `ledger` 연동 · `auth` · `goal` · `news` · `notification`을 옮긴다 | Should |
| FR-34 | **동면 모듈(`mission`·`feed`·`dashboard`·`insight-ranking`)은 옮기지 않는다.** route만 끄고 코드는 `src/modules/` 아래 그대로 둔다. 되살릴 때 그 시점에 옮긴다 | Must |
| FR-35 | **HTTP 경로를 이관 중 유지한다.** 기존 경로(`/api/investment`·`/api/portfolio`·`/api/ai-coach`·`/api/profit-plan`·`/api/signal-performance`·`/api/trade-preflight`·`/api/behavior-coach`)가 그대로 동작해야 한다. 경로 변경은 BFF 계약 변경과 함께, 프론트가 먼저 | Must |
| FR-36 | 이관은 **컨텍스트 단위 커밋**으로 한다 | Must |
| FR-37 | 이관 중 옛 경로에 **re-export 껍데기**를 두어 빌드를 유지하고, 컨텍스트가 완성되면 지운다. 껍데기가 남아 있으면 done이 아니다 | Should |

### E. 유스케이스 분해

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | `application`의 서비스는 **동사로 시작**한다. 명사형 God 서비스를 만들지 않는다 | Must |
| FR-41 | 기존 God 서비스를 동사형으로 쪼갠다. 예: `portfolio.service.ts` → `RecalculateHoldings` · `GetPositionSummary` · `RecordTransaction` | Must |
| FR-42 | `prisma.$transaction`은 `application`에서만 호출한다. **외부 I/O(LLM·거래소·환율·지표·뉴스)를 트랜잭션 안에 넣지 않는다** | Must |
| FR-43 | 조회는 `domain`에 `*Projection` Port로 선언하고 `infrastructure`가 구현한다. **목록·집계에 Aggregate를 로드하지 않는다** | Must |
| FR-44 | `payload` JSON을 조건으로 뒤지는 쿼리를 신규 코드에서 만들지 않는다. `InvestmentInsight`의 `kind`를 컬럼으로 승격한다(DB-REQ-017 계열) | Must |

## Non-Functional

> **NFR 정정 (2026-09-11) — 스냅샷 테스트가 성립하지 않는다.**
>
> **DB가 비어 있다**(`portfolioTransaction` 0행). 연결은 되지만 모든 엔드포인트가
> `insufficient_data`만 답하므로, 그 상태로 찍은 스냅샷은 이관을 아무것도 검증하지 않는다.
>
> **위험한 것은 DB 접근이 아니라 계산이다** — `profit-plan`의 손절·익절 가격,
> `trade-preflight`의 손익비/비중, `ai-coach-score.engine` 468줄. 전부 입력만 주면 되는
> 순수 계산이므로 **DB 없이 특성화 테스트**를 쓸 수 있다. 그것을 먼저 쓰고 옮긴다.
>
> 픽스처를 시딩해 스냅샷을 찍는 안도 있었으나, 픽스처가 곧 기대값이 되어 **이관 전 동작을
> 증명하지 못한다.** 특성화 테스트는 현재 코드의 산술을 그대로 고정한다.

| 구분 | 요구사항 |
|---|---|
| 동작 동일성 | FR-35. 이관 전/후 기존 엔드포인트 응답이 **바이트 단위로 같아야 한다**. ~~스냅샷 테스트가 수용 기준~~ → **순수 계산 특성화 테스트**가 수용 기준 (아래 정정) |
| 성능 | 이관이 성능을 악화시키지 않는다. `performance-server.md` 예산을 이관 전/후 측정해 기록 |
| 빌드 | 각 컨텍스트 커밋마다 `npm run build` 통과 |
| 데이터 | 이관은 스키마를 바꾸지 않는다. DB 변경은 `DB-REQ-*`가 담당 |

## Acceptance Criteria

- [ ] `src/` 최상위에 컨텍스트 디렉터리와 `shared`만 있다 (동면 `modules/` 예외)
- [ ] `layer-check` 훅이 FR-11의 위반 6종을 **exit 2로 차단**한다 (위반 케이스 6개로 테스트)
- [ ] `grep -rn "@prisma/client" src/*/domain` = 0
- [ ] `grep -rn "express\|zod" src/*/domain` = 0
- [ ] `grep -rn "from '\.\./\.\./[a-z]*/infrastructure" src/*/application` = 0
- [ ] `Money` VO가 있고, 금액을 `number`로 들고 다니는 도메인 코드가 0건이다
- [ ] `toKrwInteger()` 호출이 `presentation`에서만 일어난다
- [ ] `application`의 서비스 이름이 전부 동사로 시작한다
- [ ] `prisma.$transaction` 호출이 `application` 밖에 0건이다
- [ ] 트랜잭션 안에서 외부 HTTP를 부르는 코드가 0건이다
- [ ] 신규 코드에 `payload` JSON 조건 쿼리가 0건이다
- [ ] 기존 엔드포인트 응답 스냅샷이 이관 전/후 동일하다
- [ ] 동면 모듈의 코드가 삭제되지 않았다
- [ ] re-export 껍데기가 0건이다
- [ ] `npm run build` 통과

## Trace

| FR | 산출물 | 검증 |
|---|---|---|
| FR-1~5 | 컨텍스트 디렉터리 + `shared` | 구조 검사 |
| FR-10~13 | `layer-check.mjs`, `layer-rules.mjs`, eslint | 위반 케이스 6개 |
| FR-20~24 | `shared/domain/*.ts` | `Money` 단위 테스트 (통화 혼합 예외 · 반올림 시점) |
| FR-30~37 | 컨텍스트별 커밋 | 스냅샷 테스트 |
| FR-40~44 | `application` 파일명 · grep | 자동 검사 스크립트 |

## Dependencies

- **동시 진행:** `FE-REQ-009`(FSD 전환) — 이름 축을 함께 확정한다
- **선행:** 없음. `shared` Kernel부터 시작할 수 있다
- **후속:** `SRV-REQ-007`(정리) · F001~F007의 모든 SRV REQ
- **참조:** `/Users/sagong-gwang-yeol/Desktop/DevAtlas/.claude/rules/ddd-*.md`, `.claude/hooks/layer-check.mjs`

## Open Questions

- **기존 `Float` 원장 컬럼을 언제 `Decimal`로 바꿀지.** 매퍼에서 승격하면 계산은 안전하지만 저장은 여전히 `Float`다. 반사실 항등식이 저장값을 다시 읽으므로 **언젠가는 바꿔야 한다.** `DB-REQ-007`(F001 MIGRATION)에서 원장 확장과 함께 하는 것이 맞는지 판단 필요.
- `investment-insight/`의 12개 서비스를 `coach`·`indicator`·`market` 중 어디로 나눌지. `market-regime`·`news-analysis`·`whale-signal`은 `market`, `behavior-analysis`·`insight-ranking`·`ai-coach`는 `coach`, `technical-indicator`는 `indicator`가 기본안.
- 의존성 주입 방식. 현재는 클래스를 컨트롤러에서 `new`한다. DDD 4층에서는 Port 주입이 필요하다. **컨테이너 라이브러리를 도입할지, 조립 함수를 손으로 쓸지** 결정 필요. 컨텍스트 14개면 손으로도 가능하다.
- `presentation`에서 다른 컨텍스트를 못 부르는 규칙이 기존 `/api/dashboard`류 조합 엔드포인트와 충돌한다. **동면 대상이므로 문제가 아니지만** 되살릴 때 조합 컨텍스트로 옮겨야 한다.
