---
id: FE-REQ-012
feature: F000
area: fe
kind: API
title: "F000 정리·편집 — 웹 API 호출 계약 정의 (period 정정 · 동면 호출 제거)"
priority: high
labels: [fe, api, fsd, cleanup, websocket]
created: 2026-09-09
---

## Summary

F000의 API 작업은 **① 동면 호출 제거 ② `period` 오타 정정 ③ 신규 5개 연결 ④ 문구 상수를 i18n으로 분리** 넷이다.

## 호출 배치

| 화면 요소 | 호출 | 방식 |
|---|---|---|
| 실시간 테이블 | `GET /api/app/market/overview?...` | 서버 컴포넌트 |
| 실시간 가격 | **WebSocket** `ws://…:4002` | 클라이언트 구독 |
| 차트 프리뷰 | `GET /api/app/market/:symbol/chart?period=minute` | 클라이언트(종목 전환) |
| 심리·스마트머니 | `GET /api/app/market-intelligence/:symbol/dashboard` | 클라이언트 |
| 뉴스 프리뷰 | `GET /api/app/news?symbol=&limit=5` | 클라이언트 |
| 관심 종목 | `GET /api/app/watchlist` | 서버 컴포넌트 + mutation |
| 홈 "주식" 섹션 | `GET /api/app/portfolio/summary` | 서버 컴포넌트 |
| 알림 | `GET /api/app/alerts?limit=20` | 서버 컴포넌트 |
| 온보딩 상태 | `GET /api/app/onboarding/status` | 서버 컴포넌트 |
| 초대 확인 | `GET /api/app/onboarding/invite/check?code` | 클라이언트(디바운스) |
| 초대 수락 | `POST /api/app/onboarding/invite` | mutation |
| 목표 저장 | `POST /api/goals` | mutation |
| 종목 검색 (2026-09-21) | `GET /api/app/search?q=&assetType=&limit=20` | 클라이언트(디바운스 · 취소) |
| 북마크 목록 (2026-09-21) | `GET /api/app/news/bookmarks?page=&limit=10` | 클라이언트(관심 종목 탭 블록) |
| 북마크 토글 (2026-09-21) | `POST` · `DELETE /api/app/news/:id/bookmark` | mutation |
| 알림 (개정 2026-09-21) | 위 `GET /api/app/alerts` — `kind` **1종** | — |

## Requirements

### A. `period` 정정 — 프론트가 먼저

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `constants/api.ts`의 `period=miniute` → **`period=minute`** 로 고친다 | Must |
| FR-2 | 유효값 4종(`minute`·`day`·`week`·`month`)을 **`shared/config`의 enum**으로 정의한다. 문자열 리터럴을 URL에 박지 않는다 | Must |
| FR-3 | **프론트가 먼저 배포**된다. 그 뒤 서버가 오타를 422로 거부한다. 순서를 뒤집으면 차트가 깨진다 | Must |
| FR-4 | `grep -rn "miniute"` = 0 | Must |

### B. 동면 호출 제거

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 미션·포인트·업적·피드·대시보드·랭킹 호출과 훅·쿼리 키를 **전부 제거**한다 | Must |
| FR-11 | `POST /api/auth/register`·`PATCH /api/users/password`·`DELETE /api/users/account` 호출을 제거한다 | Must |
| FR-12 | **410 응답을 받는 코드가 0건**이어야 한다. BFF 410 로그로 1주 검증 | Must |
| FR-13 | 제거된 쿼리 키를 `queryKeys.ts`에서도 지운다 | Must |

### C. WebSocket

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 시세 WS 구독은 **클라이언트 컴포넌트**에서만. 서버 컴포넌트에서 소켓을 열지 않는다 | Must |
| FR-21 | 구독 정책(`limit=100`)을 **바꾸지 않는다** | Must |
| FR-22 | 메시지 수신을 `@repo/ui/useThrottle`로 조절한다. 초당 수십 회 setState 금지 | Must |
| FR-23 | 마지막 수신 시각을 상태에 저장한다(`FE-REQ-011` FR-10) | Must |
| FR-24 | 언마운트 시 구독을 해제한다. **유령 구독 0건** | Must |
| FR-25 | 재연결 로직을 둔다. 끊김 상태를 화면에 표시한다 | Must |
| FR-26 | 캔들 메시지(`type: "candle"`)를 차트에 반영한다. **기존 동작을 유지**한다 | Must |

### D. 신규 연결

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 뉴스 조회 훅을 `entities/news/api/`에 둔다. 종목 전환 시 재조회 | Must |
| FR-31 | 관심 종목 조회는 서버 컴포넌트, 추가/제거는 `features/toggle-watchlist`의 mutation | Must |
| FR-32 | `portfolio/summary`를 서버 컴포넌트에서 조회한다 | Must |
| FR-33 | `onboarding/status`를 서버 컴포넌트에서 조회한다. **온보딩 미완료면 홈 대신 온보딩을 렌더** | Must |
| FR-34 | `invite/check`는 클라이언트 + **디바운스 300ms** | Must |
| FR-35 | `invite/accept`는 mutation. **재시도 0회** | Must |
| FR-36 | 목표 저장(`POST /api/goals`)이 실제로 연결되는지 검증한다. 끊겨 있으면 잇는다 | Should |

### D-2. 2026-09-21 추가 — 검색 · 북마크 · 뉴스 필드 · 목표 수량

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | 검색 훅은 `features/search-asset/api/`. 쿼리 키에 `q` · `assetType` 을 포함하고 `staleTime` 30s. `AbortSignal` 연결 (D8) | Must |
| FR-61 | `features/toggle-watchlist` 가 `409` + `code: 'TRACKED_ASSET_LIMIT'` 을 **정규화된 에러 코드**로 구분한다(`{ status: 409, code, retriable: false }`). 문구는 `shared/i18n` (D8) | Must |
| FR-62 | watchlist · search 성공 무효화 대상: `watchlist` · `search` 쿼리 키 둘 다 (D8) | Must |
| FR-63 | 뉴스 뷰모델 타입에 `sentiment` · `symbols` · `isBookmarked?` 를 추가한다. `sentiment` 는 enum 으로(FR-51) (기본안 — 감사 문서 B11) | Must |
| FR-64 | 북마크 훅: 조회는 `entities/news/api/`, 토글은 `features/toggle-news-bookmark/api/`. mutation **재시도 0회** (D5) | Must |
| FR-65 | 북마크 · 검색은 **인증 필수** 경로다. 로그인 전에는 호출하지 않는다(401 을 만들지 않는다) (D5 · D8) | Must |
| FR-66 | 목표 생성 본문 타입을 금액 · 수량 **판별 유니온**으로 둔다(`goalType` 판별자). 서버 422 코드(`GOAL_TARGET_INVALID` · `GOAL_QUANTITY_NO_SAVINGS`)를 i18n 키로 매핑 (기본안 — 감사 문서 B5) | Should |

### E. 에러 처리와 문구 분리

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | `HTTP_ERROR_MESSAGE`·`TOAST_MESSAGES`·`ERROR_MESSAGE`를 **`shared/i18n`으로 옮긴다** | Must |
| FR-41 | `shared/api`가 에러를 정규화한다: `{ status, code, retriable }` | Must |
| FR-42 | 문구 매핑은 `shared/i18n`이 한다. `shared/api`가 문장을 만들지 않는다 | Must |
| FR-43 | `410` 응답을 받으면 **개발 환경에서 콘솔 경고**를 낸다. 잔여 호출을 개발 중에 발견하기 위함 | Should |
| FR-44 | 서버 에러 원문을 화면에 노출하지 않는다 | Must |

### F. 타입

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 뷰모델 타입은 `packages/core`에서. 프론트 재정의 0건 | Must |
| FR-51 | `period`·`assetType`·`alertKind`·**`newsSentiment`**(2026-09-21)를 **`enum`** 으로. 리터럴 union 금지. `alertKind` 는 1종(개정 2026-09-21) | Must |
| FR-52 | `any` 0건 | Must |
| FR-53 | WS 메시지 타입을 `packages/core`에서 공유한다. BFF `types/websocket.types.ts`가 소유한 계약이다 | Must |

## Acceptance Criteria

- [ ] **`grep -rn "miniute" apps/` = 0**
- [ ] `period` 유효값이 `shared/config`의 enum이다
- [ ] `period=minute` 요청이 200이다
- [ ] 동면 API 호출·훅·쿼리 키가 0건이다
- [ ] `register`·`password`·`account` 호출이 0건이다
- [ ] **BFF 410 로그 1주 검증 결과 잔여 호출이 0건이다**
- [ ] WS 구독이 클라이언트 컴포넌트에서만 일어난다
- [ ] 구독 정책 `limit=100`이 유지된다
- [ ] WS 메시지가 throttle된다
- [ ] 언마운트 시 구독이 해제된다 (유령 구독 0건)
- [ ] WS 끊김이 화면에 표시되고 재연결이 동작한다
- [ ] 캔들 메시지가 차트에 반영된다 (기존 동작 유지)
- [ ] 뉴스가 종목 전환 시 재조회된다
- [ ] 관심 종목 조회가 서버 컴포넌트, 추가/제거가 mutation이다
- [ ] `portfolio/summary`가 서버 컴포넌트에서 조회된다
- [ ] 온보딩 미완료 시 홈 대신 온보딩이 렌더된다
- [ ] `invite/check`가 디바운스된다 (타이핑 5회 → 요청 1회)
- [ ] `invite/accept`가 재시도되지 않는다
- [ ] 목표 저장이 `POST /api/goals`까지 연결된다 (E2E 1건)
- [ ] 문구 상수가 `shared/i18n`으로 옮겨졌고 `constants/api.ts`에 0건이다
- [ ] `shared/api`가 에러를 정규화하고 문장을 만들지 않는다
- [ ] `410` 수신 시 개발 콘솔 경고가 나온다
- [ ] 서버 에러 원문이 화면에 0건이다
- [ ] 뷰모델·WS 타입이 `packages/core`에서 온다
- [ ] 리터럴 union 0건, `any` 0건

**추가 2026-09-21**

- [ ] 검색 요청이 디바운스 · 취소되고 쿼리 키에 `q` 가 있다
- [ ] `409 TRACKED_ASSET_LIMIT` 이 정규화된 코드로 구분된다
- [ ] ★ 성공 시 `watchlist` · `search` 쿼리가 함께 무효화된다
- [ ] 뉴스 타입에 `sentiment`(enum) · `symbols` · `isBookmarked?` 가 있다
- [ ] 북마크 mutation 재시도 0건, 로그인 전 북마크 · 검색 호출 0건
- [ ] 목표 생성 본문이 판별 유니온이고 422 코드가 i18n 으로 매핑된다

## Dependencies

- **선행:** `BFF-REQ-008`(계약) · `FE-REQ-009`(FSD)
- **순서:** FR-1~4는 **서버보다 먼저 배포**된다
- **규칙:** `api-convention.md` · `event-bus.md`(제거 대상) · `microfrontend.md`

## Open Questions

- WS 메시지 타입을 `packages/core`에 두면 BFF가 그 패키지를 참조해야 한다. **BFF가 `salt-microFe` workspace 밖**이므로 `BFF-REQ-006` Open Question과 같은 문제다.
- 목표 저장이 실제로 끊겨 있는지. **검증이 먼저**이고 끊겨 있으면 FR-36이 Must로 올라간다.
- `410` 콘솔 경고를 프로덕션에서도 낼지. 개발만이 기본안.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | **WS 절(C)을 구현하고 `in-progress` 로 옮겼다.** 닫힌 것: FR-24(참조 카운트 구독 — 언마운트 시 `unsubscribe`·`unsubscribe_candle` 전송, 브라우저 실측) · FR-25(재연결 3s→30s 백오프 + 끊김 표시) · FR-26(캔들 동작 유지). FR-21(`limit=100`)은 건드리지 않았다. **남은 것**: A·B·D·E·F절과 FR-22(`useThrottle` — 이미 rAF 로 묶여 있어 필요성부터 판정) · FR-23. 근거: `requirements/reports/checklists/F000-realtime-reliability.md` |
| 2026-09-21 | **스토리보드 갭 감사 반영.** 호출 배치에 검색 · 북마크 목록 · 북마크 토글 추가, 알림 `kind` 1종 표시. 신규 D-2절 FR-60~66(검색 훅 · `409 TRACKED_ASSET_LIMIT` 정규화 · 무효화 · 뉴스 필드 · 북마크 훅 · 인증 전 호출 금지 · 목표 판별 유니온). FR-51 에 `newsSentiment` enum. 근거: `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` |
