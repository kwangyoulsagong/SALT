---
id: FE-REQ-002
title: 투자 시장 미리보기(MarketPreview) 확장 및 차트 디자인시스템 승격
priority: high
labels: [feature, investments, design-system, chart, realtime, domain-architecture]
created: 2026-05-31
updated: 2026-05-31
---

## Summary

`investments` remote의 `MarketPreview`는 기존에 종목 헤더와 단일 차트(`MarketChartPreview`)만 보여줬다. 이번 작업은 미리보기를 "실시간 캔들 차트 + 시장 인텔리전스(심리 온도계 / 스마트머니 / 뉴스)"로 확장한다.

동시에 차트 렌더링 로직을 앱 로컬 컴포넌트에서 `@repo/ui`의 재사용 차트 컴포넌트(`PreviewChart`)로 승격한다. 앱 로컬 컴포넌트는 데이터 패칭/실시간 구독만 담당하고, 순수 차트 시각화는 디자인 시스템이 소유한다. 라우트 폴더 안에 있던 상수도 앱 `constants`로 이동해 도메인 아키텍처 규칙에 맞춘다.

이 요구사항은 `salt-microFe/**` 범위에만 적용한다. `bff/**`, `salt-server/**` 계약은 변경하지 않는다.

## Research Notes

- `React.memo`로 감싼 함수형 컴포넌트는 `displayName`을 명시하지 않으면 DevTools/lint에서 익명으로 잡힌다. memo 비교 함수는 props 동등성만 판단하고 부수효과를 가지면 안 된다. 출처: [React memo](https://react.dev/reference/react/memo)
- 차트는 DOM/SVG로 그릴 때 노드 수와 reconciliation 비용이 병목이 될 수 있다. 미리보기 수준(수십 개 캔들)은 SVG로 충분하고, 수천 개 이상/고빈도 갱신에서만 Canvas를 검토한다. 출처: 레포 규칙 `.claude/rules/canvas.md`
- 차트/canvas는 색상만으로 정보를 전달하지 않고 외부에 요약 텍스트 또는 접근 가능한 label을 제공해야 한다. SVG에는 `role="img"` + `aria-label` 또는 `<title>`을 둘 수 있다. 출처: [MDN SVG title](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/title), 레포 규칙 `.claude/rules/a11y-policy.md`
- 실시간 데이터는 React Query cache를 owner로 두고 `setQueryData`로 갱신하면 컴포넌트 트리 전체를 다시 fetch하지 않고 최신 캔들만 반영할 수 있다. streaming 데이터는 보관 개수 상한과 슬라이딩 윈도우를 둔다. 출처: [TanStack Query setQueryData](https://tanstack.com/query/v5/docs/framework/react/reference/QueryClient#queryclientsetquerydata), 레포 규칙 `.claude/rules/state-convention.md`, `.claude/rules/performance.md`
- `requestAnimationFrame` 기반 애니메이션은 `transform`/`opacity`/SVG `stroke-dashoffset`처럼 layout을 유발하지 않는 속성에 한정해야 paint/layout 비용을 줄일 수 있다. 출처: 레포 규칙 `.claude/rules/performance.md`
- 두 개 이상 앱에서 재사용될 수 있는 순수 UI는 `packages/ui`로 승격하고 공개 `exports` subpath와 Storybook story를 함께 추가한다. 앱은 `packages/ui/src/**` 내부 파일을 deep import하지 않는다. 출처: 레포 규칙 `.claude/rules/design-system.md`, `packages/ui/CLAUDE.md`

## Current Findings (작업 전 상태)

- `apps/investments/.../MarketPreview/MarketChartPreview/MarketChartPreview.tsx`가 데이터 패칭과 차트 렌더링을 한 컴포넌트에서 모두 담당했다.
- 시장 미리보기에 심리/스마트머니/뉴스 같은 인텔리전스 영역이 없었다.
- 실시간 캔들 갱신 로직이 정리된 hook으로 분리되어 있지 않았다.
- 투자 탭 상수(`tabs`)가 라우트 폴더 `pages/investment/menu/investmentTabs.ts`에 있어 "route 파일/폴더에 상수 금지" 도메인 규칙과 어긋났다.
- WebSocket 타입 파일명이 `webSokcetClient.type.ts`로 오타가 있었다.

## Requirements

### 1. 차트 디자인시스템 승격

- 순수 차트 시각화 컴포넌트를 `packages/ui`의 `PreviewChart`로 승격한다.
- `packages/ui/package.json` `exports`에 `./previewChart` subpath를 추가하고, 앱은 그 subpath로만 import한다(`@repo/ui/src/**` deep import 금지).
- `PreviewChart`는 앱 route/store/API를 import하지 않는 순수 UI여야 한다. 데이터는 props(`data`)로만 받는다.
- 새 재사용 컴포넌트이므로 Storybook story를 추가한다(CSF3, `tags: ["autodocs"]`, 결정적 mock data).
- SVG 차트에는 접근 가능한 label(`role="img"` + `aria-label` 또는 `<title>`)을 제공한다.

### 2. MarketPreview 데이터 와이어링 분리

- 앱 로컬 차트 컴포넌트(`MarketPreviewChart`)는 데이터 패칭(`useInvestments`)과 실시간 구독만 담당하고, 시각화는 `PreviewChart`에 위임한다.
- 로딩/에러/빈 데이터 상태에서는 차트 대신 렌더를 중단하거나 fallback을 둔다.
- `MarketPreview`는 헤더, 실시간 차트, 시장 인텔리전스를 조합하는 얇은 조합 컴포넌트로 유지한다.

### 3. 시장 인텔리전스 미리보기

- `MarketIntelligencePreview`에 시장 심리 온도계, 스마트머니 추적, 뉴스 미리보기를 구성한다.
- 심리 온도계와 스마트머니 원형 progress 애니메이션은 layout을 유발하지 않는 속성(`transform`, SVG `stroke-dashoffset`)과 `requestAnimationFrame`으로 처리한다.
- 데이터가 없거나 에러일 때 안전하게 렌더를 중단한다(`data?.` optional 접근, 기본값 사용).
- 뉴스 항목은 `MarketIntelligenceNewsPreview`와 `Badge`로 분리한다.

### 4. 실시간 캔들 hook

- 실시간 캔들 갱신을 `useMarketPreviewChartRealtime` hook으로 분리한다.
- hook은 `wsClient.subscribeCandle`로 구독하고 unmount 시 반드시 `unsubscribeCandle`로 해제한다.
- 갱신은 React Query `setQueryData`로 해당 query key의 캔들 배열만 변경한다(같은 timestamp면 마지막 캔들 교체, 아니면 슬라이딩 윈도우로 append).
- 다른 symbol/timeframe 이벤트는 무시한다.

### 5. 구조/상수 정리

- 라우트 폴더의 탭 상수를 `apps/investments/src/constants/investmentTabs.ts`로 이동한다.
- 컴포넌트/파일/디렉터리/타입/`displayName` 네이밍은 PascalCase와 의미 기반 규칙을 따른다(오타 금지).
- WebSocket 타입 파일명 오타(`webSokcetClient.type.ts` → `webSocketClient.type.ts`)를 바로잡는다.
- 무거운 browser-only 실시간 위젯은 `next/dynamic({ ssr:false })` client island로 분리한다.

## 구현 계획 (Plan)

1. **승격**: `MarketChartPreview` 시각화 로직을 `packages/ui/src/PreviewChart`로 추출 → `exports`에 `./previewChart` 추가 → Storybook story 작성.
2. **와이어링**: `MarketPreviewChart`(앱 로컬)에서 `useInvestments` + `useMarketPreviewChartRealtime`로 데이터를 모아 `PreviewChart`에 props로 전달.
3. **실시간 hook**: `useMarketPreviewChartRealtime` 작성 → `wsClient` 구독/해제 + `setQueryData` 캔들 갱신.
4. **인텔리전스**: `MarketIntelligencePreview`(심리/스마트머니) + `MarketIntelligenceNewsPreview`/`Badge` 작성, rAF 기반 애니메이션.
5. **조합**: `MarketPreview`에서 헤더 + 차트 + 인텔리전스를 `Suspense`로 조합.
6. **정리**: 탭 상수 이동, 파일/타입명 오타 정리, `RealtimeInvestment` client island화.
7. **검증**: `@repo/ui`/`@repo/message-event-bus` check-types → 3앱 tsc/lint → 3앱 build(goals→investments→shell) → 결과를 체크리스트에 기록.
8. **회귀 수정**: 검증 중 발견된 테이블 실시간 회귀(suspense 제거로 인한 cold-cache 구독 누락)를 `useMarketOverviewRealtime`이 `symbols`(파생 키)에 의존하도록 바꿔 해결하고 cleanup에 `cancelAnimationFrame`을 추가.

## Acceptance Criteria

- `PreviewChart`가 `@repo/ui`에 있고 `./previewChart` subpath로 export되며 앱이 그 subpath로 import한다.
- `PreviewChart`가 앱 route/store/API를 import하지 않는다.
- `PreviewChart`에 Storybook story가 있고 SVG에 접근 가능한 label이 있다.
- 앱 로컬 `MarketPreviewChart`는 데이터 와이어링만 하고 시각화는 `PreviewChart`에 위임한다.
- `MarketIntelligencePreview`가 심리/스마트머니/뉴스를 렌더하고 데이터 부재 시 안전하게 중단한다.
- `useMarketPreviewChartRealtime`가 구독을 등록/해제하고 `setQueryData`로 캔들만 갱신한다.
- 탭 상수가 라우트 폴더 밖 `src/constants`에 있다.
- 컴포넌트/파일/디렉터리/`displayName` 오타가 없다.
- `pnpm --filter @repo/ui check-types`, `pnpm --filter @repo/message-event-bus check-types`가 통과한다.
- `shell`, `goals`, `investments`의 `tsc --noEmit`과 `lint`가 통과한다.
- `goals`, `investments`, `shell` build가 모두 성공한다.
- 신규 파일(`PreviewChart`)이 `@repo/ui` lint 경고를 새로 만들지 않는다.

## Out Of Scope

- `bff`/backend API 계약 변경.
- Canvas/OffscreenCanvas 차트 렌더링 전환(측정 전 도입 금지).
- React Query SSR prefetch/dehydrate/hydrate.
- `@repo/ui` 기존(이번 작업 이전부터 있던) Storybook/util lint 경고 일괄 정리.
- 뉴스/인텔리전스 실데이터 연동(현재 mock/preview 데이터 기준).

## Changelog

- 2026-05-31: codex 자동화로 구현된 MarketPreview 확장 + PreviewChart 디자인시스템 승격 작업을 요구사항으로 문서화했다.
- 2026-05-31: 검증/리뷰 과정에서 발견한 네이밍 오타, 누락된 `key`, 미사용 props, displayName 누락, no-op 코드를 수정 항목으로 반영했다(상세는 회고 참조).
- 2026-05-31: 마이그레이션(useSuspenseQuery → useQuery)으로 발생한 마켓 오버뷰 테이블 실시간 회귀를 수정했다. `useMarketOverviewRealtime`을 `symbols` 의존으로 바꿔 cold-cache 첫 진입/새로고침에서도 구독되도록 했다. 연관 커밋은 `refactor/microfrontend-build` 브랜치의 본 작업 커밋에 포함된다.

## Status

- done (검증 완료: 3앱 tsc/lint/build 통과). 본 spec은 `requirements/specs/done/`에 위치한다.
