---
id: RN-REQ-006
feature: F000
area: rn
kind: API
title: "F000 정리·편집 — 모바일 API 호출 계약 정의"
priority: high
labels: [rn, api, react-query, websocket, secure-store]
created: 2026-09-09
---

## Summary

모바일 F000의 API 호출. **RSC가 없으므로 전부 React Query**이고, WS는 클라이언트 구독이다. 오프라인 persist와 secure store 분리가 웹과 다른 점이다.

## 호출 배치

| 화면 요소 | 호출 | 방식 |
|---|---|---|
| 시세 목록 | `GET /api/app/market/overview?...` | React Query, `staleTime: 30s` |
| 실시간 가격 | **WebSocket** `ws://…:4002` | 클라이언트 구독 |
| 차트 | `GET /api/app/market/:symbol/chart?period=minute` | React Query, `staleTime: 1m` |
| 심리·스마트머니 | `GET /api/app/market-intelligence/:symbol/dashboard` | React Query, `staleTime: 5m` |
| 뉴스 | `GET /api/app/news?symbol=&limit=5` | React Query, `staleTime: 10m` |
| 관심 종목 | `GET /api/app/watchlist` + mutation | React Query |
| 보유 요약 | `GET /api/app/portfolio/summary` | React Query, `staleTime: 1m` |
| 알림 | `GET /api/app/alerts?limit=20` | React Query, `staleTime: 1m` |
| 온보딩 상태 | `GET /api/app/onboarding/status` | React Query |
| 초대 확인 | `GET /api/app/onboarding/invite/check?code` | 디바운스 query |
| 초대 수락 | `POST /api/app/onboarding/invite` | mutation |
| 목표 | `GET/POST /api/goals` | query + mutation |

## Requirements

### A. React Query 설정

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `staleTime`을 **전부 명시**한다. 기본값 0이면 포커스마다 재요청한다 | Must |
| FR-2 | `refetchOnAppFocus`를 켠다. 다만 `staleTime`이 지난 것만 재조회 | Must |
| FR-3 | mutation은 **재시도하지 않는다** | Must |
| FR-4 | `invite/accept` mutation은 특히 재시도 금지(코드 소진) | Must |
| FR-5 | 조회 훅은 `entities/*/api/`, mutation 훅은 `features/*/api/` | Must |
| FR-6 | 긴 요청에 `AbortSignal` 연결 | Must |

### B. 오프라인 persist와 secure store 분리

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 쿼리 캐시를 `AsyncStorage`에 persist한다 | Must |
| FR-11 | **토큰은 secure store**다. 두 저장소를 혼동하지 않는다 | Must |
| FR-12 | persist 대상을 제한한다: 시세 목록·보유 요약·알림·온보딩 상태. **차트·뉴스는 persist하지 않는다**(크고 자주 바뀐다) | Must |
| FR-13 | 오프라인에서 조회는 캐시를 반환하고 `dataUpdatedAt`을 배너에 쓴다 | Must |
| FR-14 | **`mutationCache` 재생(오프라인 큐)을 쓰지 않는다** | Must |
| FR-15 | 로그아웃 시 persist된 캐시를 **전부 지운다** | Must |

### C. WebSocket

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | WS 구독은 `entities/market/api/`의 훅으로 감싼다. 화면이 소켓을 직접 만들지 않는다 | Must |
| FR-21 | **앱 상태(`AppState`)에 따라 연결/해제**한다. 백그라운드에서 끊는다 | Must |
| FR-22 | 메시지를 **프레임 단위로 버퍼링**해서 상태에 반영한다 | Must |
| FR-23 | 구독 심볼을 화면이 보는 것으로 제한한다 | Must |
| FR-24 | 언마운트 시 구독 해제 | Must |
| FR-25 | 재연결 백오프(1s → 2s → 4s, 최대 30s) | Must |
| FR-26 | WS 메시지 타입을 `packages/core`에서 공유한다. BFF가 소유한 계약이다 | Must |
| FR-27 | 캔들 메시지를 차트에 반영한다 | Must |

### D. 초대·온보딩

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `invite/check`는 **디바운스 300ms**. 타이핑마다 부르지 않는다 | Must |
| FR-31 | `invite/accept` 성공 시 토큰을 **secure store에 저장**하고 쿼리 캐시를 초기화한다 | Must |
| FR-32 | 실패 `403` + `reasonCode` 3종을 각각 다른 문구로 | Must |
| FR-33 | `onboarding/status`가 단계를 결정한다. 프론트가 판단하지 않는다 | Must |
| FR-34 | 온보딩 완료 후 홈 쿼리를 무효화한다 | Must |

### E. 에러 처리

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | **오프라인과 서버 장애를 구분**한다. 다른 안내 문구 | Must |
| FR-41 | `401` → refresh 시도 → 실패 시 로그인 | Must |
| FR-42 | `403 INVITE_*` → 각각 다른 문구 | Must |
| FR-43 | `410` → **개발 환경에서 콘솔 경고**. 동면 경로를 부르고 있다는 신호 | Should |
| FR-44 | HTTP → 문구 매핑은 `shared/i18n`. `shared/api`가 정규화 | Must |
| FR-45 | 서버 에러 원문을 화면에 노출하지 않는다 | Must |

### F. 타입

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 뷰모델·WS 타입을 `packages/core`에서 웹과 공유 | Must |
| FR-51 | `period`·`assetType`·`alertKind`를 `enum`으로. 리터럴 union 금지 | Must |
| FR-52 | `any` 0건 | Must |

## Acceptance Criteria

- [ ] `staleTime`이 전부 명시되어 있다
- [ ] `refetchOnAppFocus`가 켜져 있고 stale만 재조회한다
- [ ] mutation 재시도가 0건이다
- [ ] 조회·mutation 훅이 레이어 규칙에 맞는 위치에 있다
- [ ] 쿼리 캐시가 `AsyncStorage`에 persist된다
- [ ] **토큰이 secure store에 있고 `AsyncStorage`에 0건이다**
- [ ] persist 대상이 제한된다 (차트·뉴스 제외)
- [ ] 오프라인에서 캐시가 반환되고 `dataUpdatedAt`이 쓰인다
- [ ] **오프라인 mutation 큐가 0건이다**
- [ ] **로그아웃 시 persist 캐시가 전부 지워진다**
- [ ] WS 구독이 훅으로 감싸져 있다
- [ ] **백그라운드에서 WS가 끊기고 복귀 시 재연결된다**
- [ ] WS 메시지가 프레임 단위로 버퍼링된다
- [ ] 구독 심볼이 화면이 보는 것으로 제한된다
- [ ] 언마운트 시 구독이 해제된다
- [ ] 재연결 백오프가 동작한다
- [ ] WS 타입이 `packages/core`에서 온다
- [ ] 캔들 메시지가 차트에 반영된다
- [ ] `invite/check`가 디바운스된다 (타이핑 5회 → 요청 1회)
- [ ] `invite/accept` 성공 시 토큰이 secure store에 저장되고 캐시가 초기화된다
- [ ] 실패 `reasonCode` 3종이 각각 다른 문구다
- [ ] 온보딩 단계가 서버 응답으로 결정된다
- [ ] **오프라인과 서버 장애가 다른 안내로 구분된다**
- [ ] `401`에서 refresh → 실패 시 로그인
- [ ] `410` 수신 시 개발 콘솔 경고가 나온다
- [ ] 서버 에러 원문이 화면에 0건이다
- [ ] 뷰모델·WS 타입이 `packages/core`에서 온다
- [ ] 리터럴 union 0건, `any` 0건

## Dependencies

- **선행:** `BFF-REQ-008`(계약) · `RN-REQ-001`(`packages/core`)
- **규칙:** `api-convention.md` · `rn-architecture.md`

## Open Questions

- persist에 시세 목록을 넣으면 **오래된 가격이 보인다.** `dataUpdatedAt` 배너로 완화하지만, 시세는 persist하지 않는 것이 더 정직할 수 있다 → 사용성 판단 필요.
- WS 재연결 백오프 상한 30s가 적절한가. 시세 화면에 있는 동안은 더 짧아야 할 수 있다.
- `packages/core`에 WS 타입을 두려면 BFF가 그 패키지를 참조해야 한다(`BFF-REQ-006` Open Question).
