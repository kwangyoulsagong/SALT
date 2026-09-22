---
id: FE-REQ-035
feature: F004
area: fe
kind: CHORE
title: "프론트 부채 정리 — axios 제거 · lint 금지, 봉 병합을 @repo/core 로 · 단위 테스트 러너"
priority: medium
labels: [fe, bundle, lint, test, tech-debt]
created: 2026-09-22
---

## Summary

회고가 여러 번 Action 으로 적고도 닫지 못한 프론트 부채 둘을 닫는다. 화면 동작은 바뀌지 않는다.

1. **axios** — 시세 조회(`marketApi`)와 관심 종목 토글(`toggleWatchlistApi`)이 마지막으로 axios 를 직접 쓴다.
   `apiFetch` 로 옮기고, `axios` import 를 lint 로 막고, 의존성을 지운다
2. **봉 시각 · 실시간 병합** — `FE-REQ-034` 의 `candleTime`(KST 파싱 · 병합)이 일회성 스크립트로만 검증됐다.
   `@repo/core/market` 으로 옮기고 vitest 를 붙인다

그리고 `FE-REQ-034` 회고 §5 의 규칙 후보 둘을 규칙에 반영한다.

## 왜 — 관찰된 문제

| # | 문제 | 근거 |
|---|---|---|
| 1 | 새 호출에 axios 를 써서 **번들 회귀를 세 번** 냈다(`/investments` · `/home` · `/onboarding`). 세 회고가 모두 "lint 규칙으로 올린다"를 Action 으로 적었다 | `FE-REQ-010` · `FE-REQ-012` 회고, 루트 `F000-invite-onboarding` 회고 |
| 2 | 한 화면에 HTTP 경로가 둘이다 — 코치 슬라이스는 `apiFetch`, 시세 슬라이스는 axios | `F004-fe-coach-panel` 회고 |
| 3 | 병합 · 파싱에 상시 테스트가 없다. `apps/web` · `@repo/core` 에 러너가 없어서다. RN 도 같은 병합이 필요하다 | `FE-REQ-034` 회고 §4 |
| 4 | 규칙 문서가 코드와 어긋났다 — `api-convention.md` 가 없는 `src/api` · `client.get` 을 예시로 들고, 트레이딩 차트를 `next/dynamic` 으로 적었다 | 이 REQ 에서 발견 |

## Requirements

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `marketApi` 조회 6개를 전부 `apiFetch` 로. **실패 계약 유지** — 2xx 가 아니면 던진다. 에러는 `status` 를 든다(`MarketApiError`) | Must |
| FR-2 | `toggleWatchlistApi` POST · DELETE 를 `apiFetch` 로. 토큰 · `Content-Type: application/json` 을 직접 붙인다 | Must |
| FR-3 | `apps/web` 에서 `axios` import 를 `no-restricted-imports` 로 막는다. 메시지가 대안(`apiFetch`)과 근거를 말한다 | Must |
| FR-4 | `apps/web` 의존성에서 `axios` 를 지운다 | Must |
| FR-5 | `candleTimeMs` · `toKstTimestamp` · `mergeRealtimeCandle` 을 `@repo/core/market` 으로. 앱 타입에 기대지 않는다(`KstCandle`) | Must |
| FR-6 | `@repo/core` 에 vitest · turbo `test` 태스크 · 루트 `pnpm test` | Must |
| FR-7 | 병합 · 파싱 단위 테스트 — KST 고정(다른 시간대에서도), 같은 봉 갱신 · 시가 유지 · 거래량 max, 다음 봉 붙이기 · 창 고정, 옛 봉 · NaN · 빈 배열, 변화 없으면 같은 배열 | Must |
| FR-8 | 규칙 반영 — `canvas.md`(측정 도구가 요소 핸들을 쥐면 누수처럼 보인다), `ssr.md` · `performance.md`(데이터 뒤 `next/dynamic` 잎은 Suspense 300ms), `api-convention.md` · `streaming-ssr.md` · `performance-frontend.md` 의 낡은 문구 | Must |

## Non-functional

- 화면 동작 · 요청 모양 변화 0(메서드 · 경로 · 본문 · 상태 코드)
- First Load JS 악화 0. axios 가 든 청크가 클라이언트 산출물에서 사라진다

## 범위 밖

| 항목 | 사유 |
|---|---|
| `apiFetch` 위 공통화(토큰 · 에러 정규화 · 타임아웃) | 호출 모양이 셋 이상 겹칠 때. 지금은 슬라이스마다 `*ApiError` 하나 |
| RN 이 `@repo/core/market` 을 쓰는 것 | RN 시세 화면에 실시간 봉이 아직 없다 |
| `apps/web` 자체 테스트 러너 | 옮길 순수 함수가 `@repo/core` 로 갔다. 앱 안 순수 함수 테스트가 필요해질 때 |
| BFF · 서버 규칙 문서 정리 | 영역이 다르다 — 별도 PR |

## Changelog

- 2026-09-22 신설 · 구현
