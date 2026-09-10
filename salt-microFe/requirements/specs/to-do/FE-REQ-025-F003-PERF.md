---
id: FE-REQ-025
feature: F003
area: fe
kind: PERF
title: "F003 밸류에이션 밴드 적립 — 웹 성능 정의"
priority: high
labels: [fe, performance, streaming-ssr, plan]
created: 2026-09-09
---

## Summary

적립 숫자는 홈에서 **가장 먼저 보여야 하는 값**이다. 김프·실패 이력·밴드 표가 이 숫자를 기다리게 만들면 안 된다.

## 예산

| 지표 | 대상 | 목표 | 상한 |
|---|---|---|---|
| 홈 셸 TTFB | 홈 | 200ms | 400ms |
| 홈 ② 블록 도착 | 적립 숫자 | 700ms | 1.2s |
| 적립 상세 LCP | 상세 | 1.5s | 2.5s |
| 김프 게이지 도착 | 상세 | 1.2s | **차단 안 함** |
| 실패 이력 lazy fetch | 아코디언 | 400ms | 800ms |
| INP (체크 버튼) | 전역 | 100ms | 200ms |
| CLS | 홈·상세 | 0 | 0.1 |
| 라우트 JS (gzip) | 적립 상세 | 45KB | 70KB |

## Requirements

### A. 스트리밍 경계

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 홈 셸(탭바·헤더·블록 골격)은 **데이터 없이** 즉시 flush된다 | Must |
| FR-2 | ② 블록은 **독립 Suspense 경계**다. ①③④⑤ 지연이 ②를 막지 않는다 | Must |
| FR-3 | 적립 상세에서 **적립 숫자 + 자산 분해**가 첫 경계다 | Must |
| FR-4 | **김프 게이지는 별도 경계**다. 1.5s upstream 타임아웃이 숫자를 막지 않는다 | Must |
| FR-5 | 밴드 표의 **축·라벨은 정적 셸**로 먼저 그리고 현재 위치만 스트리밍한다 | Must |
| FR-6 | 실패 이력은 초기 페이로드에 넣지 않는다. 펼침 시 fetch | Must |
| FR-7 | 각 경계의 fallback은 **최종 레이아웃과 같은 높이**다. CLS 0 | Must |

### B. 렌더 게이트와 성능의 충돌 금지

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 게이트 판정은 **서버가 준 필드 읽기**뿐이다. 추가 fetch가 0건이다 | Must |
| FR-11 | `renderable: false`일 때 **실패 이력을 fetch하지 않는다** | Must |
| FR-12 | 게이트 때문에 스트리밍이 지연되면 안 된다. 게이트 판정은 O(1) | Must |

### C. 번들

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `BandTable`·`IndicatorTrackRecord`는 **클라이언트 번들에 없다**. RSC 또는 lazy | Must |
| FR-21 | 클라이언트 컴포넌트는 **체크 버튼·아코디언 토글·설정 폼**뿐이다 | Must |
| FR-22 | 차트 라이브러리를 적립 화면에 넣지 않는다. 게이지는 CSS/SVG | Must |
| FR-23 | 설정 폼은 상세 진입 시 로드하지 않는다. 편집 진입 시 lazy | Should |

### D. 캐시와 재검증

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 주간 계획은 `no-store`. 사용자별 데이터다 | Must |
| FR-31 | 실패 이력은 **변경이 드물다**. `revalidate: 3600` 허용 | Should |
| FR-32 | 체크 성공 시 계획·연속주차 태그만 `revalidateTag`. 홈 전체 무효화 금지 | Must |
| FR-33 | 브라우저 `localStorage`에 적립 금액을 캐시하지 않는다 | Must |

### E. 측정

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 경계별 도착 시각을 RUM으로 남긴다 (`block=plan`, `block=kimchi`) | Must |
| FR-41 | `plan_multiplier_blocked` 발생률을 대시보드에 노출한다 | Must |
| FR-42 | CI에서 적립 상세 라우트 JS 크기를 회귀 검사한다 | Must |
| FR-43 | Lighthouse CI: 적립 상세 Performance ≥ 90 (모바일 프로파일) | Should |

## 부하 시나리오

| 시나리오 | 조건 | 기대 |
|---|---|---|
| 김프 upstream 타임아웃 | 1.5s 후 실패 | 적립 숫자 **정상 도착**, 게이지만 미표시 |
| 지표 전체 실패 | `indicators: []` | 기본액 렌더, LCP 예산 유지 |
| 실패 이력 없음 | `renderable:false` | 추가 fetch 0건, 오히려 더 빠름 |
| 자산 20종 | `items.length=20` | 상세 LCP 2.5s 이내, 가상화 불필요 확인 |
| 느린 3G | 400kbps | 홈 셸 1s 이내 표시 |

## Acceptance Criteria

- [ ] 홈 셸이 데이터 없이 즉시 flush된다
- [ ] **② 블록이 독립 경계고 다른 블록 지연에 영향받지 않는다**
- [ ] 적립 상세에서 숫자 + 분해가 첫 경계다
- [ ] **김프 타임아웃(1.5s)이 적립 숫자 도착을 막지 않는다**
- [ ] 밴드 표 축이 정적 셸로 먼저 그려진다
- [ ] 실패 이력이 초기 페이로드에 없다
- [ ] **모든 fallback 높이가 최종과 같고 CLS가 0.1 이하다**
- [ ] 게이트 판정에 추가 fetch가 0건이다
- [ ] `renderable:false`에서 실패 이력 fetch가 0건이다
- [ ] `BandTable`·`IndicatorTrackRecord`가 클라이언트 번들에 없다
- [ ] 적립 화면에 차트 라이브러리가 없다
- [ ] 주간 계획이 `no-store`다
- [ ] 체크 성공 시 홈 전체가 무효화되지 않는다
- [ ] `localStorage`에 적립 금액이 저장되지 않는다
- [ ] 경계별 도착 시각 RUM이 수집된다
- [ ] CI 번들 회귀 검사가 동작한다
- [ ] 느린 3G에서 홈 셸이 1s 이내 표시된다

## Dependencies

- **선행:** `FE-REQ-008`(스트리밍 SSR) · `BFF-REQ-022`(BFF 예산)
- **짝:** `FE-REQ-022`(UI) · `023`(FUNC) · `024`(API)
- **규칙:** `performance-frontend.md` · `streaming-ssr.md`

## Open Questions

- 홈 ② 블록 700ms 목표는 BFF 300ms + 서버 계산 시간에 달려 있다. BFF 예산이 밀리면 FE 목표도 같이 밀린다 — 어디를 먼저 조일지.
- 실패 이력 `revalidate: 3600`은 사용자별이 아니라 지표별이므로 공유 캐시가 가능하다. BFF에서 캐시할지 Next 캐시에 둘지.
