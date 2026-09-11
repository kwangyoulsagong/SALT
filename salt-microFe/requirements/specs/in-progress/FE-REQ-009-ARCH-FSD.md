---
id: FE-REQ-009
area: fe
kind: ARCH
title: "FSD 전환 — 기술별 폴더에서 6레이어·슬라이스로 (공식 Next.js 가이드 방식)"
priority: critical
labels: [architecture, fsd, refactoring, layer-check, migration]
created: 2026-09-09
decision: requirements/decisions/ADR-001-microfrontend-replacement.md
reference: https://feature-sliced.design/kr/docs/guides/tech/with-nextjs
---

## Summary

`apps/web`·`apps/web-tax`·`apps/mobile`의 내부 구조를 **Feature-Sliced Design**으로 바꾼다. 레이어 6개(`shared` → `entities` → `features` → `widgets` → `pages` → `app`)와 **슬라이스 레지스트리**를 도입하고, 레이어 위반을 **쓰기 시점에 차단하는 훅**을 붙인다. Next.js 라우팅은 **공식 가이드대로 프로젝트 루트에 두고 `src/`의 FSD를 re-export**한다. 슬라이스 이름은 서버 DDD 컨텍스트 이름과 **동일하게** 맞춘다.

## 왜 지금 구조를 바꾸는가 — 관찰된 문제 4개

### 문제 1 — 폴더가 "무엇인지"로 갈려 있어서 "무엇에 대한 것인지"를 못 찾는다

현재 `apps/investments/src`:

```
component/  Investment/{ChangeRateCell,InvestmentFilterTabs,MarketPreview,PriceCell,RealtimeInvestment}
            InvestmentsApp/{AnalysisGraph,MyInvestments}
            TradingViewChart/
api/        investments/, mock/investments/
hooks/      api/
constants/  api.ts, investmentTabs.ts, queryKeys.ts, slice/
store/      redux/, zustand/
types/      store/
```

"실시간 시세"를 고치려면 **다섯 군데**를 연다: `component/Investment/RealtimeInvestment`, `api/investments`, `hooks/api`, `constants/api.ts`, `store/redux`. 기능이 하나 늘 때마다 다섯 폴더가 같이 자란다.

앞으로 기능 **7개**(F000~F007)가 들어온다. 청구서·세금·적립·코치 대화·포지션이 각각 컴포넌트·API·훅·상수·스토어를 갖는다. 지금 축이면 `component/` 하나에 폴더 100개가 쌓인다.

### 문제 2 — 의존 방향을 아무것도 강제하지 않는다

`salt-microFe/CLAUDE.md`에 규칙이 이미 적혀 있다: *"앱끼리 `apps/other/src/...`를 직접 import하지 않는다"*, *"단일 앱에서만 쓰는 코드는 앱 내부에 둔다"*. 그런데 **강제 수단이 없다.** 문서에만 있는 규칙은 지켜지지 않는다.

### 문제 3 — 표시용 컴포넌트와 상호작용이 섞여 있다

`MyInvestments.tsx`가 데이터 표시·문구(`덜 썻어요` 오타 포함)·레이아웃을 다 갖는다. 청구서·세금처럼 **같은 데이터를 여러 화면이 다르게 보여주는** 기능이 오면 재사용 지점이 없다.

### 문제 4 — 같은 도메인을 웹과 모바일이 각자 이름 붙일 위험

`apps/mobile`(RN)이 새로 생긴다. 같은 "청구서"를 웹은 `component/Invoice`, RN은 `screens/Bill`로 부르기 시작하면 두 앱을 넘나들 때마다 번역이 필요하다. **슬라이스 이름을 세 서피스에서 같게 못 박는 것**이 이 REQ의 절반이다.

---

## 후보 4개를 비교했다

| | A. 현재 유지 | B. 도메인 폴더 | **C. FSD** | D. Atomic Design |
|---|---|---|---|---|
| 기능 추가 시 열어야 하는 폴더 | 5개 | 1개 | **1개** | 컴포넌트 계층 전체 |
| 의존 방향 강제 | 불가 | 부분적(도메인 경계만) | **✓ 레이어 + 슬라이스 2축** | 해당 없음 |
| 표시/상호작용 분리 | 없음 | 규약 필요 | **✓ 레이어가 강제** | 크기로만 분리 |
| 세 서피스 이름 정합 | 없음 | 가능하지만 규약 필요 | **✓ 레지스트리로 명시** | 해당 없음 |
| 서버 DDD와 대응 | 없음 | 컨텍스트≈도메인 | **✓ 슬라이스 = 컨텍스트** | 없음 |
| 표준 문서·생태계 | — | 팀 내부 규약 | **✓ 공개 표준 + Next.js 공식 가이드** | 공개 표준 |
| 이관 비용 | 0 | 중 | **높음** | 높음 |
| 참조 구현 보유 | — | — | **✓ DevAtlas에 규칙 5종 + layer-check 훅** | — |

### A를 버린 이유
문제 1~4를 그대로 안는다. 기능 7개가 들어오는 시점에 이 축은 버티지 못한다.

### B를 버린 이유 — 현재 `CLAUDE.md`가 제안하던 안

`salt-microFe/CLAUDE.md`에 이미 *"도메인은 기능 도메인 폴더로 분리한다. 예: `src/domains/portfolio`, `src/domains/market`, `src/domains/goal`"* 가 적혀 있다. 방향이 맞고 FSD보다 싸다.

**안 되는 것:** 도메인 경계만 있고 **레이어가 없다.** `domains/portfolio` 안에서 표시 컴포넌트가 mutation을 부르는 것을 막을 수단이 없고, 도메인 간 import(`domains/invoice` → `domains/tax`)를 무엇으로 판정할지 규칙이 없다.

**우리에게 안 맞은 결정적 이유:** 우리 기능들은 **서로 데이터를 공유한다.**

```
청구서  ← 원장 · 가격이력 · 편향 라벨
세금    ← 원장 · 환율 · 취득가액 lot
적립    ← 지표 스냅샷 · 실패이력 · 김프
코치    ← 지표 · 성적표 · 실패이력 · 보유 · 편향
```

도메인 폴더만 두면 이 공유가 **도메인 간 직접 import**로 해결되고, 몇 달 뒤 전부 서로를 부른다. FSD의 *"같은 레이어의 다른 슬라이스를 import하지 않는다. 공통이 필요하면 아래 레이어로 내린다"* 가 그 붕괴를 막는 실제 장치다. 위 화살표들은 전부 `entities` 또는 `shared`로 내려가야 하는 것들이고, FSD는 그 판단을 **규칙으로** 준다.

### D를 버린 이유
Atomic Design은 **컴포넌트 크기**로 나눈다. 우리 문제는 크기가 아니라 **도메인과 의존 방향**이다. `packages/ui`(83 subpath)가 이미 원자 컴포넌트를 담당하므로 앱 안에서 원자/분자를 다시 나눌 이유가 없다.

### C가 우리에게 맞은 결정적 이유 3개

1. **슬라이스 이름이 서버 DDD 컨텍스트와 1:1이 된다.** 서버 DDD 전환(`SRV-REQ-006`)이 같은 시점에 진행된다. **두 전환의 이름 축을 하나로 맞출 수 있는 유일한 시점**이다. "청구서를 찾을 때" 웹 `features/invoice`, 모바일 `features/invoice`, 서버 `invoice/{domain,application,…}`.
2. **규칙과 강제 수단을 이미 확보했다.** DevAtlas에 FSD 규칙 5종 + `layer-check.mjs` 훅 + eslint 설정이 실제로 돌고 있다. 처음부터 만들지 않는다.
3. **Next.js 공식 통합 가이드가 있다.** 라우팅 충돌을 어떻게 처리할지 추측하지 않아도 된다(아래 §"Next.js 통합").

---

## Next.js 통합 — 공식 가이드 방식

> **정정 기록.** 이 REQ의 초안은 "Next `src/pages`가 FSD `pages` 레이어와 충돌하므로 App Router로 옮겨야 해결된다"고 적었다. **틀렸다.** 공식 가이드는 **라우팅 디렉터리를 프로젝트 루트**에 두고 FSD를 `src/`에 두는 방식으로 해결하며, **Pages Router와 App Router 둘 다에 적용된다** ([FSD — Next.js와 함께 사용하기](https://feature-sliced.design/kr/docs/guides/tech/with-nextjs)). 즉 **FSD 전환은 App Router 전환의 근거가 아니고, 반대도 아니다.** 둘은 독립 결정이다. App Router의 근거는 스트리밍 하나이며 `FE-REQ-008`이 측정으로 판정한다.

### 디렉터리 (App Router 기준)

```
apps/web/
├── app/                          # Next.js 라우팅 (프로젝트 루트)
│   ├── layout.tsx                #   <html><body> 껍데기 + src/app 프로바이더
│   ├── page.tsx                  #   export { HomePage as default } from '@/pages/home'
│   ├── coach/page.tsx
│   ├── assets/page.tsx
│   └── api/<name>/route.ts       #   export { handler as GET } from '@/app/api-routes'
├── pages/                        # 빈 폴더 — App Router에서도 필수 (공식 가이드)
│   └── README.md
├── middleware.ts                 # 루트
├── instrumentation.ts            # 루트
└── src/
    ├── app/                      # FSD app 레이어 — 앱 초기화
    │   ├── providers/            #   React Query · Toast · Dialog · Theme
    │   ├── styles/               #   전역 스타일 · reset
    │   ├── api-routes/           #   Route Handler 로직 (루트 app/api 가 import)
    │   └── index.ts
    ├── pages/                    # FSD pages 레이어 — 라우트 셸
    │   └── home/{ui,model,lib,index.ts}
    ├── widgets/
    ├── features/
    ├── entities/
    └── shared/
```

### 연결 방식

```tsx
// app/page.tsx  (Next 라우팅)
export { HomePage as default, metadata } from '@/pages/home';

// app/api/ledger-import/route.ts
export { importLedger as POST } from '@/app/api-routes';
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-11 | Next 라우팅 파일은 **프로젝트 루트**(`apps/web/app/**`)에 둔다. `src/` 안에 라우팅을 두지 않는다 | Must |
| FR-12 | 루트 라우팅 파일은 **`@/pages/*` re-export만** 한다. 로직·데이터 접근·컴포넌트 정의를 두지 않는다 | Must |
| FR-13 | App Router를 쓰면 **빈 루트 `pages/` 폴더**를 둔다(공식 가이드 요구). `README.md`로 이유를 남긴다 | Must |
| FR-14 | Route Handler 로직은 `src/app/api-routes/`에 정의하고 루트 `app/api/**/route.ts`가 re-export한다 | Must |
| FR-15 | `middleware.ts`·`instrumentation.ts`는 프로젝트 루트에 둔다 | Must |
| FR-16 | 서버 데이터 조회·캐싱/재검증 로직은 **쿼리 정의와 같은 위치**에 둔다. BFF 호출 래퍼는 `shared/api`, 슬라이스별 조회는 `entities/*/api` | Must |

## 슬라이스 레지스트리 — 세 서피스에서 같은 이름

새 슬라이스는 **이 표에 먼저 추가**한다. 웹·모바일은 하이픈 허용, 서버 컨텍스트는 하이픈 없이.

| 슬라이스 | 책임 | 웹/모바일 | 서버 컨텍스트 | 근거 기능 |
|---|---|---|---|---|
| `auth` | 초대 코드 검증 · 세션 · 토큰 갱신 | ✓ | `auth` | F000 |
| `ledger` | 거래 원장 · CSV import · 거래소 조회 키 · 원장 건강도 | ✓ | `ledger` | F001 |
| `portfolio` | 보유 · 포지션 · 평가금액 · 3자산군 합산 | ✓ | `portfolio` | F001 F006 |
| `market` | 시세 · 실시간 구독 · 차트 · 관심 종목 | ✓ | `market` | F000 |
| `coach` | 추천 · 점수 · 근거 3종 · 대화 · 성적표 · 피드백 | ✓ | `coach` | F004 F006 |
| `invoice` | 반사실 3트랙 · 거래별 귀속 · 편향 집계 | ✓ | `invoice` | F001 |
| `tax` | 취득가액 lot · 손실수확 솔버 · 환율 함정 · 스텝업 · 증빙 | ✓ | `tax` | F002 |
| `plan` | 밸류에이션 밴드 · 주간 적립 · 김프 · 실행 기록 | ✓ | `plan` | F003 |
| `indicator` | 지표 스냅샷 · **실패 이력**(추천 렌더 게이트의 근거) | ✓ | `indicator` | F003 F004 |
| `fx` | 환율 원장 · 결제일 기준환율 | 표시만 | `fx` | F001 F002 |
| `goal` | 목표 저축 (변경 금지 목록) | ✓ | `goal` | F000 |
| `news` | 뉴스 목록 · 프리뷰 | ✓ | `news` | F000 |
| `notification` | 알림 2종 (세금 D-Day · 지표/추천 갱신) | ✓ | `notification` | F000 F002 |
| `device` | 디바이스 등록 · 푸시 토큰 · 앱 버전 게이트 | 모바일만 | `device` | F007 |

### 조합 슬라이스 (`widgets`)

| widget | 엮는 것 | 근거 |
|---|---|---|
| `home-briefing` | portfolio + plan + coach + tax + invoice | F006 홈 5블록 |
| `coach-console` | coach + indicator + portfolio | F006 대화 + 추천 카드 |
| `asset-workspace` | portfolio + invoice + tax | F006 자산 탭 세그먼트 3 |
| `market-board` | market + news + indicator | F000 실시간 + 프리뷰 |
| `onboarding-flow` | auth + ledger + plan | F000 초대→계좌→적립 3스텝 |
| `pc-panel-grid` | `MovableGrid` + 위 widget들 | F006 PC 이진분할 배치 |

## Requirements

### A. 레이어 구조

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `src/`를 6레이어로 만든다: `shared`(0) · `entities`(1) · `features`(2) · `widgets`(3) · `pages`(4) · `app`(5) | Must |
| FR-2 | 의존은 아래로만 흐른다. 상위 레이어 import 금지 | Must |
| FR-3 | **같은 레이어의 다른 슬라이스를 직접 import하지 않는다.** 공통이 필요하면 아래 레이어로 내린다 | Must |
| FR-4 | 모든 슬라이스에 `index.ts` barrel. 외부에서는 barrel로만 접근한다. `@/entities/tax/model/types` 같은 내부 경로 직접 참조 금지 | Must |
| FR-5 | 세그먼트는 `model`(타입·enum·상수·store) · `api`(조회/mutation) · `ui` · `lib`(헬퍼·훅) | Must |
| FR-6 | `shared`는 슬라이스가 아니라 **flat 세그먼트**다: `api` · `config` · `lib` · `model` · `ui` · `i18n`. **도메인 무관한 코드만** — `shared/lib/formatTaxDeadline.ts`가 생기면 그건 `entities/tax/lib/`의 것이다 | Must |
| FR-7 | `shared/ui`는 **최후의 수단**이다. 컴포넌트가 필요하면 먼저 `@repo/ui`(83 subpath)를 확인하고, 없으면 디자인 시스템에 추가하는 것을 우선 검토한다 | Must |
| FR-8 | `entities/*/ui`는 **표시 전용**이다. 이벤트 핸들러를 prop으로 받되 그 안에서 mutation을 부르지 않는다 | Must |
| FR-9 | `entities/*/api`는 **조회만**. mutation은 `features/*/api`로 올린다 | Must |
| FR-10 | `features` 슬라이스 이름은 **동사를 포함**한다: `import-ledger` · `solve-harvest` · `ask-coach` · `complete-weekly-plan` · `add-goal` · `toggle-watchlist` | Must |
| FR-17 | `widgets`는 **조합만** 한다. 비즈니스 로직이 생기면 `features`로 내린다 | Must |
| FR-18 | `pages`는 **위젯 배치 + 라우트 파라미터 해석**까지만 한다 | Must |
| FR-19 | `app`은 **앱 초기화만** 한다: 프로바이더 · 전역 스타일 · Route Handler 로직. 화면을 두지 않는다 | Must |

### B. 강제 수단

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `.claude/hooks/layer-check.mjs`를 이식한다. Edit/Write 직전에 레이어·슬라이스 위반을 검사하고 **exit 2로 차단**한다. 규칙 표는 `layer-rules.mjs`로 분리 | Must |
| FR-21 | 같은 검사를 ESLint(`packages/eslint-config`)에도 넣는다. **겹치는 것은 의도적이다** — 피드백 시점이 다르다(쓰기 시점 vs 에디터) | Must |
| FR-22 | `tsconfig`에 `@/shared` `@/entities` `@/features` `@/widgets` `@/pages` `@/app` alias를 정의한다. **다른 레이어 참조는 반드시 alias**, 같은 슬라이스 내부는 상대 경로 | Must |
| FR-23 | 훅 규칙에 **zone 간 import 금지**: `apps/web-tax`가 `apps/web/src/**`를 import하면 차단 (`FE-REQ-007` FR-33) | Must |
| FR-24 | 훅 규칙에 **RN↔웹 교차 import 금지**: `apps/mobile`이 `packages/ui`(vanilla-extract)를 import하면 차단 | Must |
| FR-25 | 훅 규칙에 **루트 라우팅 파일 제약**: `apps/*/app/**`과 `apps/*/pages/**`에는 re-export 외의 코드가 올 수 없다 | Must |
| FR-26 | 훅 규칙에 **레지스트리 검사**: 레지스트리 표에 없는 슬라이스 디렉터리 생성을 차단한다 | Should |

### C. 이관 (점진적, 기능 정지 없이)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 이관 순서: **`shared` → `entities` → `features` → `widgets` → `pages` → `app`.** 아래 레이어가 먼저 서야 위 레이어가 import할 곳이 생긴다 | Must |
| FR-31 | 1단계 `shared`: `constants/api.ts`(BASE_URL·END_POINTS·HTTP 상수) → `shared/config` + `shared/api`. **사용자 노출 문구를 `shared/i18n`으로 모은다**(현재 `HTTP_ERROR_MESSAGE`·`TOAST_MESSAGES`가 상수 파일에 섞여 있다) | Must |
| FR-32 | 2단계 `entities`: 화면이 있는 것부터 — `market`(시세 셀·테이블 행), `portfolio`(보유 행), `goal`(목표 카드), `news`(기사 카드) | Must |
| FR-33 | 3단계 `features`: FR-10의 동사형 슬라이스 | Must |
| FR-34 | 4단계 `widgets`: 조합 슬라이스 6개 | Must |
| FR-35 | 5단계 `pages`: `home` · `coach` · `assets` · `tax` · `goals` · `onboarding` · `login` | Must |
| FR-36 | **변경 금지 목록을 침범하지 않는다.** 홈 4블록 · 실시간 테이블 5컬럼 · 필터 3그룹 · 2컬럼 레이아웃 · **변동률 blink 2초** · 색 토큰(`#FF2E55`/`#1677EE`/`#007AFF`/`#F2F4F6`)은 **파일이 옮겨질 뿐 렌더 결과가 같아야 한다.** 이관 전/후 스크린샷 비교가 수용 기준 | Must |
| FR-37 | 이관은 **슬라이스 단위 커밋**으로 한다. 한 커밋이 여러 슬라이스를 건드리면 되돌릴 수 없다 | Must |
| FR-38 | 이관 중 옛 경로에 **re-export 껍데기**를 두어 빌드를 유지하고, 슬라이스가 완성되면 껍데기를 지운다. 껍데기가 남아 있으면 done이 아니다 | Should |

### D. 인터페이스 정의

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 타입은 `{slice}/model/types.ts`에 둔다. **데이터 구조·DTO는 `interface`**, 열거값은 **`enum`**(문자열 리터럴 union 금지), `type` alias는 두 개 이상 조합할 때만 | Must |
| FR-41 | `any` 금지. 불가피하면 `unknown` + 타입 가드 | Must |
| FR-42 | 요청/응답 타입은 `{Action}{Entity}Request` / `{Action}{Entity}Response` | Must |
| FR-43 | BFF 뷰모델 타입은 **BFF가 소유한 계약**이다. 프론트가 자기 이름으로 다시 정의하지 않고 `packages/core`에서 공유한다 | Should |
| FR-44 | 커스텀 훅은 `lib/`(store 접근 훅은 `model/` 허용). 파일명 `use{동사}{명사}.ts`, 한 파일에 훅 하나, 반환 타입 명시 | Must |

## Non-Functional

| 구분 | 요구사항 |
|---|---|
| 시각 동일성 | FR-36. 375px · 390px · 1440px 3뷰포트 스크린샷 비교 통과 |
| 번들 | barrel `export *` 체인이 tree-shaking을 막지 않는지 확인. 이관 전/후 클라이언트 JS gzip 기록, **증가분 0 목표** |
| 빌드 | 각 슬라이스 커밋마다 `pnpm build` · `lint` · `check-types` 통과 |
| 문서 | 레지스트리·레이어 규칙을 `.claude/rules/layered-architecture.md` + `fsd-*.md` 6종에 둔다 |

## Acceptance Criteria

- [ ] `src/`에 6레이어가 있고 그 외 최상위 폴더가 없다
- [ ] Next 라우팅이 **프로젝트 루트** `app/`에 있고, 그 파일들이 `@/pages/*` re-export만 한다
- [ ] 빈 루트 `pages/` 폴더가 있다(App Router 요구사항, `README.md` 포함)
- [ ] Route Handler 로직이 `src/app/api-routes/`에 있다
- [ ] `layer-check` 훅이 상위 레이어 import · cross-slice import · zone 교차 · RN↔웹 교차 · 루트 라우팅 파일 로직을 **exit 2로 차단**한다 (위반 케이스 8개로 테스트)
- [ ] 슬라이스 내부 경로 직접 import이 0건이다
- [ ] `entities/*/api`에 mutation이 0건, `entities/*/ui`에 mutation 호출이 0건이다
- [ ] `features` 슬라이스 이름이 전부 동사를 포함한다
- [ ] 문자열 리터럴 union 열거값이 0건, `any`가 0건이다
- [ ] 레지스트리 표에 없는 슬라이스가 0건이다
- [ ] 사용자 노출 문구가 `shared/i18n`에 모여 있다
- [ ] 이관 전/후 스크린샷이 3뷰포트에서 동일하다 (변경 금지 목록)
- [ ] re-export 껍데기가 0건이다
- [ ] `pnpm build` · `lint` · `check-types` 통과

## Trace

| FR | 산출물 | 검증 |
|---|---|---|
| FR-1~10, 17~19 | 6레이어 디렉터리 | 구조 검사 스크립트 |
| FR-11~16 | 루트 `app/`·`pages/`, `src/app/api-routes` | 라우트 순회 200 + re-export만 확인 |
| FR-20~26 | `layer-check.mjs`, `layer-rules.mjs`, eslint | 위반 케이스 8개 |
| FR-30~38 | 슬라이스별 커밋 | 커밋 로그 + 스크린샷 |
| FR-40~44 | `model/types.ts` | grep(`any`, 리터럴 union) |

## Dependencies

- **독립 결정:** App Router 전환(`FE-REQ-008`)과 **순서 의존이 없다.** FSD는 루트/`src` 분리로 두 라우터 모두에서 성립한다. 다만 라우트 파일을 두 번 만들지 않으려면 `FE-REQ-007` → `008` → `009` 순서가 싸다
- **동시 진행:** `SRV-REQ-006`(DDD 전환) — 슬라이스/컨텍스트 이름 축을 함께 확정한다
- **후속:** F001~F007의 모든 FE·RN REQ가 이 구조를 전제한다
- **참조:** [FSD — Next.js와 함께 사용하기](https://feature-sliced.design/kr/docs/guides/tech/with-nextjs) · `/Users/sagong-gwang-yeol/Desktop/DevAtlas/.claude/rules/fsd-*.md` · `.claude/hooks/layer-check.mjs`

## Open Questions

- `packages/core`(플랫폼 무관 `model`·`api`·`lib` 공유) 범위. 웹과 RN이 `entities` 전부를 공유할지 `model`만 공유할지. **RN이 React Query를 쓰는지에 따라 `api` 공유 여부가 갈린다** → `RN-REQ-001`에서 확정.
- `store/redux`(auth·goals)와 `store/zustand`(ui)의 이관 위치. FSD에서 전역 상태는 슬라이스 `model`에 둔다. **auth를 쿠키 기반으로 옮기면(`FE-REQ-008` Open Question) redux auth store 자체가 사라질 수 있다.**
- `packages/mocks`(MSW) 위치. 슬라이스별 `api/mock`으로 내릴지 `shared`에 둘지.
- `MovableGrid`가 `packages/ui`에 있는데 사용처가 PC 한 화면뿐이다. `widgets/pc-panel-grid`로 내릴지 관찰 대상으로 둔다.
- FSD `app` 레이어와 Next 루트 `app/` 디렉터리가 **이름이 같다.** 공식 가이드가 그렇게 하라고 하지만 사람이 혼동한다. 규칙 문서에 "루트 `app/` = 라우팅, `src/app/` = FSD 초기화"를 반복 명시한다.
