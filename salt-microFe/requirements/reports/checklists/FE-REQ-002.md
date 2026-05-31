---
id: FE-REQ-002
spec: ../../specs/done/FE-REQ-002.md
title: 투자 시장 미리보기 확장 및 차트 디자인시스템 승격 체크리스트
validated: 2026-05-31
---

# FE-REQ-002 체크리스트

## 요구사항 검증

| # | 요구사항 | 구현 위치 | 상태 |
|---|---|---|---|
| 1 | 순수 차트를 `@repo/ui`의 `PreviewChart`로 승격 | `packages/ui/src/PreviewChart/PreviewChart.tsx` | ✅ |
| 2 | `./previewChart` 공개 subpath 추가, 앱은 subpath로 import | `packages/ui/package.json`, `apps/investments/.../MarketPreviewChart/MarketPreviewChart.tsx` | ✅ |
| 3 | `PreviewChart` Storybook story 추가(CSF3 + autodocs) | `packages/ui/src/PreviewChart/PreviewChart.stories.tsx` | ✅ |
| 4 | SVG 차트에 접근 가능한 label 제공 | `packages/ui/src/PreviewChart/PreviewChart.tsx` (`role="img"`, `aria-label`, `<title>`) | ✅ |
| 5 | 앱 로컬 차트는 데이터 와이어링만, 시각화는 `PreviewChart`에 위임 | `apps/investments/.../MarketPreview/MarketPreviewChart/MarketPreviewChart.tsx` | ✅ |
| 6 | 시장 심리/스마트머니/뉴스 인텔리전스 추가 | `apps/investments/.../MarketPreview/MarketIntelligencePreview/MarketIntelligencePreview.tsx` | ✅ |
| 7 | 뉴스 미리보기/Badge 분리 | `.../MarketIntelligencePreview/component/MarketIntelligenceNewsPreview/MarketIntelligenceNewsPreview.tsx`, `.../Badge/Badge.tsx` | ✅ |
| 8 | 실시간 캔들 hook 분리(구독/해제 + setQueryData) | `apps/investments/src/hooks/investments/useMarketPreviewChartRealtime.ts` | ✅ |
| 9 | 애니메이션을 transform / SVG stroke-dashoffset + rAF로 처리 | `MarketIntelligencePreview.tsx` | ✅ |
| 10 | 탭 상수를 라우트 폴더 밖 `src/constants`로 이동 | `apps/investments/src/constants/investmentTabs.ts` | ✅ |
| 11 | 무거운 실시간 위젯을 `next/dynamic({ssr:false})` client island로 분리 | `apps/investments/src/pages/investment/index.tsx` | ✅ |
| 12 | WebSocket 타입 파일명 오타 정리 | `apps/investments/src/libs/webSocketClient/type/webSocketClient.type.ts` | ✅ |
| 13 | 컴포넌트/파일/디렉터리/`displayName` 오타 정리 | `MarketPreviewChart/`, `MarketIntelligenceNewsPreview.tsx`, `MarketIntelligencePreviewProps` | ✅ (리뷰 단계에서 수정) |
| 14 | 마켓 오버뷰 테이블 실시간 회귀 수정(cold-cache 구독 누락) | `apps/investments/src/hooks/investments/useMarketOverviewRealtime.ts`, `apps/investments/src/component/Investment/RealtimeInvestment/RealtimeInvestment.tsx` | ✅ (검증 중 발견 후 수정) |

## 리뷰 단계에서 수정한 항목

| 항목 | 수정 전 | 수정 후 | 파일 |
|---|---|---|---|
| 디렉터리/컴포넌트명 오타 | `MarketPeviewChart` | `MarketPreviewChart` | `apps/investments/.../MarketPreview/MarketPreviewChart/` |
| 파일명 오타 | `MarketIntelligenceNewPreview.tsx` | `MarketIntelligenceNewsPreview.tsx` | 뉴스 미리보기 |
| interface 오타 | `MarketIntelligencePreivewProps` | `MarketIntelligencePreviewProps` | `MarketIntelligencePreview.tsx` |
| 스타일 export 오타 | `preivewChartWrapper`, `tootTipBase` | `previewChartWrapper`, `tooltipBase` | `previewChart.css.ts` + 사용처 |
| `displayName` 케이싱/오타 | `"marketIntelligencePreview"`, `"marketIntelligenceNewsPreivew"`, 누락 | PascalCase로 통일, `PreviewChart` 추가 | 각 컴포넌트 |
| 리스트 `key` 누락 | `<text>` time label에 key 없음(React 경고) | `key={`time-${idx}`}` 추가 | `PreviewChart.tsx` |
| 미사용 props | `symbol`, `timeframe` 선언만 됨 | SVG 접근성 label로 사용 | `PreviewChart.tsx` |
| no-op 코드 | `.replace(/:/, ":")` | 제거 | `PreviewChart.tsx` (`formatTime`) |
| 빈 배열 위험 | `Math.max(...candles.map())` → 빈 배열 시 `-Infinity` | `reduce` + 길이 가드 | `PreviewChart.tsx` (`maxVolume`) |
| 비교 연산자 | `min == max` | `min === max` | `PreviewChart.tsx` |
| story 컨벤션 | `tags` 누락, `StoryObj<typeof PreviewChart>` | `tags:["autodocs"]`, `StoryObj<typeof meta>` | `PreviewChart.stories.tsx` |
| 테이블 실시간 회귀 | cold-cache 첫 진입 시 `getQueryData` 빈값으로 effect bail → 재구독 안 됨(deps에 데이터 없음) | `useMarketOverviewRealtime(params, symbols, onBlink)` + `symbolsKey` 의존, cleanup `cancelAnimationFrame` 추가 | `useMarketOverviewRealtime.ts`, `RealtimeInvestment.tsx` |

## 검증 산출 (2026-05-31 재실행)

```text
pnpm --filter @repo/message-event-bus check-types   # OK
pnpm --filter @repo/ui check-types                  # OK

cd apps/shell        && npx tsc --noEmit            # OK (exit 0)
cd apps/goals        && npx tsc --noEmit            # OK (exit 0)
cd apps/investments  && npx tsc --noEmit            # OK (exit 0)

pnpm --filter shell        lint                     # OK
pnpm --filter goals        lint                     # OK
pnpm --filter investments  lint                     # OK

pnpm --filter goals        build                    # OK
pnpm --filter investments  build                    # OK
pnpm --filter shell        build                    # OK
```

## 참고

- `PreviewChart`(이번 신규 파일)는 `@repo/ui` lint 경고를 새로 만들지 않는다. 리뷰 단계에서 발견된 3개 경고(미사용 `symbol`/`timeframe`, `displayName` 누락)는 수정 완료.
- `pnpm --filter @repo/ui lint`는 여전히 `--max-warnings 0`을 통과하지 못한다. 남은 23개 경고는 stories/`useDebounce`/`useThrottle`/`Table`/`Tabs` 등 **이번 작업 이전부터 있던** 경고이며 FE-REQ-001 회고에서 이미 별도 정리 대상으로 기록되어 있다(범위 밖).
- `pnpm --filter shell build`는 remote dev server(goals 3001, investments 3002)가 꺼져 있으면 `goals/AddGoals offline` 등 remote offline 로그를 남기지만 `RemoteBoundary` fallback이 동작해 build는 성공한다.
- 테이블 실시간 회귀 수정 후 `investments` tsc/lint/build를 재실행해 모두 통과 확인.
