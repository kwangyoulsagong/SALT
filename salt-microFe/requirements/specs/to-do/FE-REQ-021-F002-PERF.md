---
id: FE-REQ-021
feature: F002
area: fe
kind: PERF
title: "F002 세금 마감 콕핏 — 웹 성능 정의"
priority: high
labels: [fe, performance, budget, streaming, slider, zone]
created: 2026-09-09
---

## Summary

세금 zone은 **hard navigation으로 진입**하고 **슬라이더가 60fps를 요구**한다. 두 가지가 이 화면의 성능 특성이다.

## 예산

| 지점 | 예산 | 비고 |
|---|---|---|
| **zone 진입(hard navigation)** | **1.5s** | 웹 예산에서 제외되지 않고 **별도 측정**한다. Vercel prefetch 시 개선 |
| D-Day 칩 페인트 | **300ms** | Suspense 밖. `deadlines` 100ms |
| 자산군 카드 완료 | 800ms | 블록별 Suspense |
| 화면 전체 완료 | 1.2s | |
| 손실수확 솔버 (버튼 → 결과) | **700ms** | BFF 600ms + 렌더 |
| **연말 시가 슬라이더** | **60fps** | 클라이언트 재계산 |
| 슬라이더 대조 (놓을 때) | 300ms | 비동기, 프레임 차단 없음 |
| 3열 비교표 리렌더 | 16ms | 슬라이더 1프레임 |
| zone 클라이언트 JS | **200KB gzip 이하** | 세금 전용 코드가 default zone에 실리지 않는다 |

## zone 진입 — 유일한 hard navigation

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | zone 진입 시간을 **별도 측정**하고 기록한다. 다른 예산과 섞지 않는다 | Must |
| FR-2 | 진입 링크에 로딩 상태를 준다. 1.5s 동안 아무 반응이 없으면 안 된다 | Must |
| FR-3 | Vercel 배포면 `PrefetchCrossZoneLinksProvider`로 prefetch한다. 자체 호스팅이면 그 완화가 없다 | Must |
| FR-4 | **세금 전용 코드(솔버 표시·환율 로직·3열·슬라이더)가 default zone 번들에 없음을 빌드마다 확인**한다. 있으면 zone 분리가 무의미하다 | Must |

## 스트리밍 — D-Day를 먼저 보여준다

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | D-Day 칩은 Suspense 밖. **300ms 이내 페인트** | Must |
| FR-11 | 자산군 카드 3개 + 증빙 + 환율함정을 각각 Suspense. **경계 5개 이하** | Must |
| FR-12 | **스켈레톤 높이 = 실제 카드 높이.** CLS를 만들면 스트리밍 이득이 상쇄된다 | Must |
| FR-13 | 블록 호출을 병렬로 띄운다. 서버 워터폴 0건 | Must |
| FR-14 | 이관 전/후 **첫 블록 페인트와 전체 완료 시각**을 측정해 기록한다. 스트리밍 이득이 없으면 1콜 집계로 되돌린다 | Must |

## 슬라이더 — 이 화면의 성능 급소

−40%~+80%를 실시간으로 훑고 3열 비교표를 매 프레임 갱신한다.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 슬라이더 조작 중 **서버 요청 0건** | Must |
| FR-21 | 재계산 함수는 **순수 함수**이고 `scenarioParams`만 입력으로 받는다 | Must |
| FR-22 | 3열 비교표를 슬라이더와 **같은 컴포넌트에 두지 않는다.** 슬라이더 값 변경이 카드 전체를 리렌더하면 안 된다 | Must |
| FR-23 | 표의 각 셀을 메모이제이션할지 **측정 후 판단**한다. 예방적으로 붙이지 않는다 | Should |
| FR-24 | 슬라이더 값 변경을 **`requestAnimationFrame`으로 묶는다.** 포인터 이벤트마다 setState하면 프레임이 밀린다 | Must |
| FR-25 | 대조 요청(`onChangeCommitted`)은 비동기이고 **프레임을 막지 않는다** | Must |
| FR-26 | `Decimal` 라이브러리를 쓰면 **번들 증가분을 측정**하고 기록한다. `number`로 충분한지 먼저 검토한다 | Must |
| FR-27 | 슬라이더 프레임을 Performance 패널로 측정하고 **60fps 유지를 기록**한다 | Must |

## 솔버 — 버튼으로 분리

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 솔버를 첫 페인트에 넣지 않는다. 버튼으로 시작 | Must |
| FR-31 | 실행 중 버튼을 `loading` 상태로. **`disabled`로 흐려지지 않는다** | Must |
| FR-32 | 후보 3개 렌더가 무겁지 않게 종목 목록을 접어서 보여준다 | Should |
| FR-33 | `AbortSignal`로 화면 이탈 시 취소한다 | Must |

## 번들

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | zone 클라이언트 JS **200KB gzip 이하** | Must |
| FR-41 | `"use client"` 경계를 잎에 한정한다. 3열 표는 서버 컴포넌트로 두고 **슬라이더와 그 결과 표시만** 클라이언트 | Must |
| FR-42 | `@repo/ui`는 subpath import이므로 쓴 것만 들어온다. barrel로 다시 묶지 않는다 | Must |
| FR-43 | 새 의존성(`Decimal` 등) 추가 시 **번들 증가분을 PR에 적는다** | Must |

## 접근성 성능

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 늦게 오는 블록에 `aria-busy`, 도착 시 해제 | Must |
| FR-51 | 슬라이더 조작 중 스크린리더가 **매 프레임 낭독하지 않게** `aria-live`를 쓰지 않는다. 놓을 때만 결과를 알린다 | Must |

## 관측성

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | 측정: zone 진입 시간, D-Day 페인트, 블록별 완료, 슬라이더 프레임, 솔버 지연, zone 번들 크기 | Must |
| FR-61 | 성능 수정 커밋에 before/after 수치를 남긴다 | Must |

## Acceptance Criteria

- [ ] zone 진입 시간이 **별도 측정·기록**되고 1.5s 이내다
- [ ] 진입 링크에 로딩 상태가 있다
- [ ] **세금 전용 코드가 default zone 번들에 0건이다** (번들 분석 첨부)
- [ ] D-Day 칩이 300ms 이내에 페인트된다 (측정값 기록)
- [ ] Suspense 경계가 5개 이하다
- [ ] 스켈레톤 높이가 실제 카드와 같다 (CLS 측정값 기록)
- [ ] 블록 호출이 병렬이다
- [ ] 첫 블록/전체 완료 시각이 기록되어 있다
- [ ] **슬라이더 조작 중 서버 요청이 0건이다** (네트워크 패널)
- [ ] **슬라이더가 60fps를 유지한다** (Performance 패널 측정값 기록)
- [ ] 슬라이더 값 변경이 카드 전체를 리렌더하지 않는다 (Profiler 확인)
- [ ] 슬라이더 값 변경이 `requestAnimationFrame`으로 묶인다
- [ ] 대조 요청이 프레임을 막지 않는다
- [ ] `Decimal` 사용 시 번들 증가분이 기록되어 있다
- [ ] 솔버가 버튼으로 시작하고 첫 페인트에 없다
- [ ] 솔버 버튼이 `loading`이고 흐려지지 않는다
- [ ] 솔버에 `AbortSignal`이 연결된다
- [ ] **zone 클라이언트 JS ≤ 200KB gzip** (측정값 기록)
- [ ] `"use client"`가 잎에 한정된다 (3열 표가 서버 컴포넌트)
- [ ] 늦게 오는 블록에 `aria-busy`가 있다
- [ ] 슬라이더 조작 중 스크린리더가 매 프레임 낭독하지 않는다
- [ ] 관측 항목 6종이 기록된다

## Dependencies

- **선행:** `FE-REQ-018`~`020` · `BFF-REQ-018`(BFF 성능)
- **규칙:** `performance-frontend.md` · `streaming-ssr.md`

## Open Questions

- 슬라이더 재계산에 `Decimal`이 필요한가. `number`로 원 단위까지 일치하는지 먼저 검증하고, 안 되면 `Decimal`을 넣고 번들 증가분을 기록한다.
- zone 진입 1.5s가 허용 가능한가. 자체 호스팅이면 prefetch 완화가 없으므로 **홈에서 세금 데이터를 미리 받아 요약을 보여주는 것**으로 체감을 줄이는 방안 검토.
- Vercel 배포 여부(`FE-REQ-007` Open Question)가 FR-3을 결정한다.
