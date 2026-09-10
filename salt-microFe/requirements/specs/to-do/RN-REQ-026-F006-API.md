---
id: RN-REQ-026
feature: F006
area: rn
kind: API
title: "F006 코치 대화 & 3탭 IA — 모바일 API 호출 계약 정의 (집계 1콜 · SSE)"
priority: critical
labels: [rn, api, react-query, sse, aggregate, offline]
created: 2026-09-09
---

## Summary

모바일은 **홈을 집계 1콜**로 받고(RSC 없음), 대화는 **SSE를 직접 구현**한다(`EventSource`가 기본 내장이 아니다).

## 호출 배치

| 화면 요소 | 호출 | 방식 |
|---|---|---|
| 홈 5블록 | **`GET /api/app/home`** | React Query, `staleTime: 1m` |
| 알림 | (홈 응답에 포함) | — |
| 온보딩 상태 | (홈 응답에 포함) | — |
| 대화 목록 | `GET /api/app/coach/conversations` | React Query, `staleTime: 5m` |
| 메시지 목록 | `GET /api/app/coach/conversations/:id/messages` | `useInfiniteQuery` (역순) |
| **메시지 전송** | `POST /api/app/coach/messages` | mutation, **재시도 0회** |
| **SSE 구독** | `GET /api/app/coach/messages/:id/stream` | **직접 구현 스트림** |
| 대화 삭제 | `DELETE /api/app/coach/conversations/:id` | mutation |

## Requirements

### A. 홈 집계

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 홈은 **집계 1콜**이다. 블록별로 5번 부르지 않는다 | Must |
| FR-2 | 알림·온보딩 상태가 홈 응답에 포함된다. 별도 호출 0건 | Must |
| FR-3 | `staleTime: 1m`. 자주 보는 화면이다 | Must |
| FR-4 | Pull-to-refresh가 `refetch`를 부른다 | Should |
| FR-5 | 백그라운드 복귀 시 stale이면 재조회 | Must |
| FR-6 | **mutation 0건**(읽기 전용) | Must |

### B. SSE 직접 구현

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | **`EventSource`가 RN에 기본 내장되어 있지 않다.** 폴리필 또는 `fetch` + `ReadableStream`을 쓴다 → **착수 전 방식 확정** | Must |
| FR-11 | 직접 구현이면 **`Authorization` 헤더로 토큰**을 보낸다. 웹의 쿠키 제약이 없다 | Must |
| FR-12 | `Last-Event-ID` 헤더로 재연결한다 | Must |
| FR-13 | **재연결을 직접 구현**한다. 백오프 1s → 2s → 4s, 3회 실패 시 중단 | Must |
| FR-14 | `AppState`가 백그라운드면 **스트림을 닫는다.** 복귀 시 재연결 | Must |
| FR-15 | 이벤트 파싱(`event:`/`data:` 라인)을 직접 한다. **부분 라인 버퍼링**을 처리해야 한다 | Must |
| FR-16 | 언마운트·취소 시 닫고 서버로 종료를 전파한다 | Must |
| FR-17 | 스트림당 하나의 연결. **중복 구독 0건** | Must |

### C. 메시지 전송

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `POST /messages` mutation. **재시도 0회** — 재시도하면 메시지가 두 개 생긴다 | Must |
| FR-21 | 201의 `messageId`로 스트림을 연다 | Must |
| FR-22 | 전송 실패 시 입력을 보존한다 | Must |
| FR-23 | **오프라인이면 전송하지 않는다.** 버튼 비활성 + 사유 | Must |
| FR-24 | 스트림 완료 후 메시지 목록을 갱신한다(무효화 또는 로컬 반영) | Must |

### D. 메시지 목록

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `useInfiniteQuery` **커서 페이징, 역순**(최신부터) | Must |
| FR-31 | 페이지 크기 30 | Must |
| FR-32 | offset 0건 | Must |
| FR-33 | `FlatList inverted`와 함께 쓴다 | Must |

### E. 오프라인 persist

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 홈과 최근 대화를 persist한다 | Must |
| FR-41 | **토큰은 secure store**, 캐시는 `AsyncStorage` | Must |
| FR-42 | persist 크기를 제한한다. 대화가 길면 커진다 → **최근 1개 대화의 최근 30건**까지 | Must |
| FR-43 | 오프라인에서 조회는 캐시를 반환하고 `dataUpdatedAt`을 배너에 쓴다 | Must |
| FR-44 | **`mutationCache` 재생 0건** | Must |
| FR-45 | 로그아웃 시 persist 캐시를 전부 지운다 | Must |

### F. 에러 처리

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 스트림 `message.error` → `fallbackText` 렌더. 오류 화면 0건 | Must |
| FR-51 | `429`(동시 스트림) → "잠시 후 다시 시도하세요" | Must |
| FR-52 | `401` → refresh → 실패 시 로그인 | Must |
| FR-53 | **오프라인과 서버 장애를 구분**한다 | Must |
| FR-54 | HTTP → 문구 매핑은 `shared/i18n` | Must |
| FR-55 | 서버 에러 원문을 화면에 노출하지 않는다 | Must |

### G. 타입

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | 뷰모델·SSE 이벤트 타입을 `packages/core`에서 **웹과 공유** | Must |
| FR-61 | SSE 이벤트를 discriminated union으로 | Must |
| FR-62 | `CardViewModel`이 F004와 같은 타입이다 | Must |
| FR-63 | 게이트를 discriminated union으로 강제한다 | Must |
| FR-64 | 홈 금액이 `number | null`이다 | Must |
| FR-65 | `any` 0건 | Must |

## Acceptance Criteria

- [ ] 홈이 **집계 1콜**로 렌더된다 (요청 1건)
- [ ] 알림·온보딩이 홈 응답에 포함된다
- [ ] `staleTime`이 명시되어 있다
- [ ] 백그라운드 복귀 시 stale이면 재조회된다
- [ ] **홈에 mutation이 0건이다**
- [ ] **SSE 구현 방식이 확정되고 동작한다**
- [ ] `Authorization` 헤더로 토큰이 전달된다
- [ ] `Last-Event-ID`로 재연결된다
- [ ] 재연결 백오프가 동작하고 3회 실패 시 중단된다
- [ ] **백그라운드에서 스트림이 닫히고 복귀 시 재연결된다**
- [ ] 부분 라인 버퍼링이 처리된다 (이벤트가 쪼개져 와도 정상 파싱)
- [ ] 언마운트·취소 시 닫히고 종료가 전파된다
- [ ] 중복 구독이 0건이다
- [ ] **`POST /messages` 재시도가 0건이다** (메시지 중복 0건)
- [ ] 전송 실패 시 입력이 보존된다
- [ ] 오프라인에서 전송 버튼이 비활성이다
- [ ] 스트림 완료 후 목록이 갱신된다
- [ ] 메시지 목록이 역순 커서 페이징이고 offset이 0건이다
- [ ] `FlatList inverted`와 함께 동작한다
- [ ] 홈·최근 대화가 persist된다
- [ ] **토큰이 secure store에 있고 `AsyncStorage`에 0건이다**
- [ ] persist 크기가 제한된다
- [ ] `dataUpdatedAt`이 배너에 쓰인다
- [ ] **`mutationCache` 재생이 0건이다**
- [ ] 로그아웃 시 캐시가 전부 지워진다
- [ ] `message.error`에서 `fallbackText`가 렌더된다
- [ ] `429`·`401`이 처리된다
- [ ] **오프라인과 서버 장애가 구분된다**
- [ ] 타입이 `packages/core`에서 오고 discriminated union이다
- [ ] 게이트가 타입으로 강제된다
- [ ] `any` 0건

## Dependencies

- **선행:** `BFF-REQ-028`(계약) · `RN-REQ-001`(`packages/core`) · `RN-REQ-022`(F004 타입)
- **규칙:** `api-convention.md` · `rn-architecture.md`

## Open Questions

- **RN SSE 구현 방식(FR-10).** `react-native-sse` 폴리필이 가장 빠르지만 유지보수 상태를 확인해야 한다. `fetch` + `ReadableStream`은 RN의 네트워킹 구현에 따라 지원이 갈린다 → **착수 전 필수 조사.**
- persist에 대화를 넣으면 **오프라인에서 과거 대화를 볼 수 있지만** 크기가 커진다. 최근 1개 대화 30건이 적절한지 측정 필요.
- 홈 집계 1콜이 450ms인데 `staleTime: 1m`이면 자주 재조회된다. 데이터 사용량 측정 필요.
