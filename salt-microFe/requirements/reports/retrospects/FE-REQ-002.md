---
id: FE-REQ-002
spec: ../../specs/done/FE-REQ-002.md
checklist: ../checklists/FE-REQ-002.md
title: 투자 시장 미리보기 확장 및 차트 디자인시스템 승격 회고
completed: 2026-05-31
---

# FE-REQ-002 회고

## 요약

codex 자동화로 `MarketPreview`를 "실시간 캔들 차트 + 시장 인텔리전스(심리/스마트머니/뉴스)"로 확장하고, 순수 차트 렌더링을 `@repo/ui`의 `PreviewChart`로 승격했다. 실시간 캔들 갱신은 `useMarketPreviewChartRealtime` hook으로 분리해 React Query cache를 owner로 두고 `setQueryData`로 갱신한다. 검증(타입/린트/3앱 build)은 모두 통과했고, 리뷰 단계에서 네이밍 오타·미사용 props·누락된 `key`·no-op 코드 등 품질 이슈를 직접 수정했다.

## 변경 내용

- 앱 로컬 `MarketChartPreview`의 시각화 로직을 `packages/ui/src/PreviewChart`로 승격하고 `./previewChart` 공개 subpath와 Storybook story를 추가했다.
- 앱 로컬 `MarketPreviewChart`는 `useInvestments` + `useMarketPreviewChartRealtime`로 데이터를 모아 `PreviewChart`에 props로만 넘기는 와이어링 컴포넌트로 정리했다.
- `MarketIntelligencePreview`(심리 온도계, 스마트머니 원형 progress)와 `MarketIntelligenceNewsPreview`/`Badge`를 추가했다. 애니메이션은 `transform`/SVG `stroke-dashoffset` + `requestAnimationFrame`으로 처리한다.
- `useMarketPreviewChartRealtime`가 `wsClient` 구독/해제와 `setQueryData` 기반 슬라이딩 윈도우 갱신을 담당한다.
- 탭 상수를 `pages/investment/menu/`에서 `src/constants/investmentTabs.ts`로 이동하고, `RealtimeInvestment`를 `next/dynamic({ssr:false})` client island로 분리했다.
- WebSocket 타입 파일명 오타(`webSokcetClient` → `webSocketClient`)를 정리했다.

## 리뷰에서 직접 고친 것

- **네이밍 오타 정리**: `MarketPeviewChart`→`MarketPreviewChart`(디렉터리/파일/컴포넌트/displayName), `MarketIntelligenceNewPreview.tsx`→`MarketIntelligenceNewsPreview.tsx`, `MarketIntelligencePreivewProps`→`MarketIntelligencePreviewProps`, css `preivewChartWrapper`/`tootTipBase`→`previewChartWrapper`/`tooltipBase`.
- **React 경고 제거**: `PreviewChart`의 time label `<text>`에 누락된 `key` 추가.
- **미사용 props 활용**: `PreviewChart`가 받기만 하고 안 쓰던 `symbol`/`timeframe`을 SVG 접근성 label(`role="img"`, `aria-label`, `<title>`)로 사용 — lint 경고 제거와 a11y 규칙 충족을 동시에 달성.
- **displayName 정리**: 컴포넌트 displayName을 PascalCase로 통일하고 `PreviewChart`에 추가.
- **사소한 정리**: `formatTime`의 no-op `.replace(/:/, ":")` 제거, `maxVolume`을 빈 배열에서 `-Infinity`가 나오지 않도록 `reduce`+가드로 변경, `==`→`===`, story를 CSF3 컨벤션(`tags:["autodocs"]`, `StoryObj<typeof meta>`)에 맞춤.

## 실시간 테이블 회귀 (검증 중 발견 후 수정)

마이그레이션 후 "마켓 오버뷰 테이블의 실시간 가격이 새 진입/새로고침에서 안 나온다"는 회귀가 발견됐다. 실시간 차트는 정상이라 소켓 연결 문제로 보였지만, 실제 원인은 다른 곳이었다.

- **증상**: 첫 진입/새로고침 시 테이블만 실시간이 멈춤. 관심종목 탭으로 갔다가 돌아오면 동작. 차트는 영향 없음.
- **원인**: 마이그레이션에서 `useInvestments`의 `investmentsMarketOverview`가 `useSuspenseQuery` → `useQuery`로 바뀌었다. `useMarketOverviewRealtime` 훅은 "effect가 처음 실행될 때 캐시에 데이터가 이미 있다"는 가정(= suspense가 보장하던 warm cache) 위에 작성돼 있었다. `useQuery`로 바뀌면서 컴포넌트가 로딩 상태로 즉시 마운트되고, 훅 effect가 cold 시점에 `getQueryData`로 `undefined`를 받아 `return`으로 빠진 뒤, 의존성(`[params, queryClient, onBlink]`)이 안 바뀌어 데이터가 도착해도 재실행되지 않아 구독이 영영 등록되지 않았다.
- **차트가 멀쩡한 이유**: `useMarketPreviewChartRealtime`는 `symbol`에 의존하는데 `selectedSymbol`이 로드 후 `"" → 실제 심볼`로 바뀌며 effect가 재실행돼 재구독된다. 테이블 훅엔 그런 데이터 의존성이 없었다.
- **해결**: 훅을 다시 suspense에 묶는 대신 데이터(심볼)에 반응하도록 바꿨다. `useMarketOverviewRealtime(params, symbols, onBlink)`로 `symbols`를 받고, `symbolsKey = symbols.join(",")`를 의존성에 넣어 심볼이 채워지는 순간 effect가 재실행돼 구독이 등록된다. cleanup에 `cancelAnimationFrame`도 추가했다. 이로써 cold/warm, SSR/CSR 무관하게 동작하며 SSR 마이그레이션 방향과도 충돌하지 않는다.
- **성능 메모**: 본 변경은 "더 빠른" 변경이 아니라 "올바른" 변경이다. suspense↔useQuery는 속도가 아니라 렌더 오케스트레이션/SSR 정합성 차이다. 실시간 성능의 실제 핵심(rAF 배치, 변경분만 `setQueryData`, `memoKey` 행 메모이제이션)은 그대로다. 초기 로드 UX/성능을 더 올리려면 SSR prefetch + dehydrate/hydrate가 레버이며, 이는 FE-REQ-001에서 범위 밖으로 둔 별도 작업이다.

## 잘된 점

- 차트 승격으로 "시각화는 디자인 시스템, 데이터/실시간은 앱"이라는 경계가 명확해졌다. 앱은 `@repo/ui/previewChart` subpath로만 소비하고 deep import가 없다.
- 실시간 갱신을 hook + `setQueryData`로 분리해 트리 전체 refetch 없이 마지막 캔들만 갱신한다. 구독 해제도 cleanup에서 처리된다.
- 인텔리전스 애니메이션이 layout 비용이 큰 속성을 피하고 rAF + transform/stroke-dashoffset을 사용해 성능 규칙과 맞다.
- 자동화 산출물이 빌드/타입/린트를 통과하는 상태로 들어와 리뷰가 "검증 추가"가 아니라 "품질 다듬기"에 집중될 수 있었다.

## 아쉬운 점

- 자동화 결과에 네이밍 오타(`Peview`, `Preivew`, `NewPreview`)가 여러 곳 남아 있었다. 빌드는 통과하지만 검색성·일관성을 해쳐 리뷰에서 일괄 정리해야 했다.
- `PreviewChart`가 `symbol`/`timeframe`을 받지만 시각화에 쓰지 않아 죽은 props 상태였다(접근성 label로 활용해 해소).
- `MarketIntelligenceNewsPreview`의 뉴스 제목에 overflow 테스트용 placeholder 문자열(`faskdljf...`)이 남아 있다. mock 데이터지만 실데이터 연동 전 정리 대상이다.
- `PreviewChart`가 `@visx/*` 차트 의존성을 `@repo/ui`로 들였다. 차트 컴포넌트에는 적절하지만, 기본 primitive 번들에 섞이지 않도록 subpath import 경계를 유지해야 한다.
- `@repo/ui` lint는 기존 경고 23개 때문에 여전히 `--max-warnings 0`을 통과하지 못한다(FE-REQ-001에서 이미 별도 작업으로 식별됨).

## 후속 조치

- `MarketIntelligenceNewsPreview`의 placeholder 텍스트를 실데이터 연동 또는 결정적 mock으로 교체한다(`packages/mocks` 활용 검토).
- 뉴스/심리/스마트머니 데이터의 BFF 계약이 정해지면 별도 REQ로 API owner와 타입을 정의한다.
- `@repo/ui` 기존 lint 경고 정리를 FE-REQ-001 후속과 묶어 `pnpm --filter @repo/ui lint`가 통과하도록 한다.
- 캔들 수가 크게 늘거나 갱신 빈도가 높아지면 `canvas.md` 기준으로 측정 후 Canvas 전환을 검토한다(현재는 SVG로 충분).
- 초기 로드 UX/성능과 "데이터 도착 후 구독" 경로를 더 개선하려면 MarketOverview를 SSR prefetch + dehydrate/hydrate하는 별도 REQ를 정의한다(query owner/serialization 정책 포함).
- suspense → useQuery처럼 데이터 준비 타이밍 가정을 바꾸는 마이그레이션은 캐시 타이밍에 의존하는 hook(실시간 구독 등)의 회귀를 유발할 수 있으므로, 해당 hook은 데이터(파생 키)에 명시적으로 의존하도록 작성한다.

## 품질 점수

| 항목 | 점수 (1-5) | 근거 |
|---|---:|---|
| 디자인시스템 경계 | 5/5 | 순수 차트를 `@repo/ui` subpath로 승격하고 앱은 데이터 와이어링만 담당, deep import 없음. |
| 도메인/구조 정리 | 4/5 | 라우트 폴더 상수 이동·컴포넌트 분리는 잘됐으나 자동화 산출물의 네이밍 오타를 후처리해야 했다. |
| 실시간/성능 | 4/5 | hook + setQueryData + rAF/transform 애니메이션으로 규칙을 지켰다. 검증 중 발견된 테이블 실시간 회귀(suspense 제거로 인한 cold-cache 구독 누락)를 데이터 의존 구독으로 해결. 보관 개수 상한은 슬라이딩 윈도우(고정 길이)에 암묵적으로 의존한다. |
| 접근성 | 4/5 | 차트에 접근 가능한 label을 추가했으나 인텔리전스 수치의 비색상 보조 표기는 추가 점검 여지가 있다. |
| 검증 완성도 | 5/5 | event-bus/ui check-types, 3앱 tsc/lint, 3앱 build가 모두 통과한다. |
