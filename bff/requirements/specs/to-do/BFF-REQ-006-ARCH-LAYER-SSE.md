---
id: BFF-REQ-006
area: bff
kind: ARCH
title: "BFF 레이어 정리 + SSE 스트리밍 기반 — 뷰모델 소유권을 명시한다"
priority: critical
labels: [architecture, sse, streaming, viewmodel, refactoring]
created: 2026-09-09
---

## Summary

BFF의 책임을 **"프록시"에서 "화면 계약의 소유자"** 로 명시한다. 조합 응답을 `Promise.allSettled` 기반 **블록 격리** 구조로 바꾸고, 코치 대화를 위한 **SSE 중계 기반**을 만든다. 웹(블록별)과 모바일(집계 1콜) **두 형태를 같은 서비스 함수에서** 만든다.

## 왜 지금 구조를 바꾸는가 — 관찰된 문제 4개

### 문제 1 — 홈 조립이 `Promise.all`이고 뷰모델이 없다

```ts
// 현재 services/app-home.service.ts
const [dashboard, topInsights, unreadNotifications, marketOverview] =
  await Promise.all([...]);
return { dashboard: dashboard.data, topInsights: ..., ... };
```

- **`Promise.all`은 하나가 실패하면 전부 버린다.** F006 FR-5는 "블록 하나가 실패해도 나머지가 렌더된다"를 요구한다.
- 반환이 **서버 응답을 그대로 담은 봉투**다. 화면 계약이 아니다. 프론트가 `dashboard.data.xxx`를 파고들어야 한다.
- `/dashboard`와 `/investment-insight/top`은 **동면 대상**(`SRV-REQ-007` FR-12·13)이다. 즉 이 조립은 곧 깨진다.

### 문제 2 — 새 화면 5개의 뷰모델이 정의되지 않았다

F001 청구서 · F002 세금 콕핏 · F003 주간 적립 · F004 코치 상세 · F006 홈·대화. PM 기획서에 뷰모델 타입이 이미 적혀 있는데(`InvoiceViewModel` · `TaxCockpitViewModel` · `WeeklyPlanViewModel` · `CoachDetailViewModel` · `HomeViewModel`) **그것을 누가 소유하는지가 정해지지 않았다.**

프론트가 소유하면 서버 응답 변화가 화면 전체로 번진다. **BFF가 소유하는 것이 이 계층이 존재하는 이유다.**

### 문제 3 — 스트리밍 경로가 없다

코치 대화가 제품의 핵심이 되었다(2026-09-09 결정). LLM 토큰을 흘려보내야 하는데 BFF에 **SSE 경로가 없다.** 지금 있는 것은 시세용 WebSocket 하나다.

### 문제 4 — 컨트롤러가 조립을 한다

`app.controller.ts`가 서비스를 부르고 응답 모양을 만든다. 조합 로직이 컨트롤러와 서비스에 흩어져 있어 **같은 뷰모델을 두 곳에서 만들 위험**이 있다 — 웹 블록별과 모바일 집계가 그 위험이다.

---

## SSE 후보 4개를 비교했다

| | A. WebSocket 확장 | **B. SSE** | C. 폴링 | D. 스트리밍 SSR |
|---|---|---|---|---|
| 단방향 서버→클라 | 과하다(양방향) | **✓ 정확히 맞는다** | ✗ | ✓ (첫 페인트만) |
| 토큰 단위 스트리밍 | ✓ | **✓** | ✗ | 첫 페인트 이후 불가 |
| 자동 재연결 | 직접 구현 | **✓ 내장** | 해당 없음 | 해당 없음 |
| 프록시 친화 | 업그레이드 핸드셰이크 필요 | **✓ HTTP** | ✓ | ✓ |
| 기존 자산 재사용 | **이미 있다** (시세 WS) | 새로 만든다 | — | `FE-REQ-008` |
| RN 지원 | ✓ | **✓** | ✓ | ✗ RSC 없음 |

### A를 버린 이유 — 가장 아까웠던 후보

시세용 WebSocket(`ws://…:4002`)이 이미 돌고 있다. 거기에 대화를 얹으면 인프라를 재사용한다.

**안 되는 것:** 한 소켓에 성질이 다른 두 스트림이 섞인다. 시세는 **구독 기반·유실 허용·초당 수십 회**이고 대화는 **요청 기반·유실 불가·순서 보장 필요**다. 재연결 정책이 정반대다 — 시세는 재연결 후 최신 값만 받으면 되지만, 대화는 **재연결 후 같은 메시지를 두 번 생성하면 안 된다**(비용이 두 배가 되고 답이 달라진다).

**우리에게 안 맞은 결정적 이유:** 시세 구독 정책(`limit=100`)은 **변경 금지 목록**이다. 그 소켓의 핸들러·매니저를 건드리면 동작이 확인된 화면이 위험해진다. **분리하면 그 위험이 0이다.**

### C를 버린 이유
토큰 단위 스트리밍이 안 된다. 첫 토큰 1s 예산을 지키더라도 그 뒤가 뚝뚝 끊긴다. 대화가 제품의 핵심인데 체감이 가장 나쁜 선택이다.

### D를 버린 이유
스트리밍 SSR은 **첫 페인트**를 흘린다. 첫 페인트 이후 계속 흐르는 것은 그 기능이 아니다. `FE-REQ-008`이 대화 화면의 첫 페인트를 담당하고, **그 이후는 SSE**다. 둘은 경쟁이 아니라 역할 분담이다.

### B가 우리에게 맞은 이유

1. **단방향이고 HTTP 위에 있다.** 사용자가 보내는 것은 메시지 하나뿐이고 그건 평범한 POST다. 양방향 소켓이 필요 없다.
2. **시세 WebSocket을 건드리지 않는다.** 변경 금지 목록을 침범하지 않는다.
3. **RN에서도 같은 방식으로 소비한다.** RSC가 없는 모바일이 웹과 같은 스트림을 쓴다.

---

## Requirements

### A. 레이어 경계

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | **라우터는 path와 middleware 연결만** 한다. 조립·변환 코드를 두지 않는다 | Must |
| FR-2 | **컨트롤러는 요청 파싱 · 서비스 호출 · 응답 변환만** 한다. 서버를 두 번 부르고 있으면 그 조합은 서비스의 일이다 | Must |
| FR-3 | **서비스가 뷰모델을 만든다.** 뷰모델 정의는 서비스 파일에 있고, 그 타입을 `packages/core`로 export해 프론트가 공유한다 | Must |
| FR-4 | **BFF는 금액을 계산하지 않는다.** 금액을 바꾸는 `if`가 생기면 서버 계약이 부족하다는 신호이고, 서버에 필드를 추가한다 | Must |
| FR-5 | **BFF에 DB를 붙이지 않는다.** 상태가 필요하면 서버에 둔다 | Must |

### B. 블록 격리 조립

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 조합 응답은 **`Promise.allSettled`** 를 쓴다. `Promise.all` 사용을 **ESLint로 금지**한다(조합 서비스 파일 대상) | Must |
| FR-11 | 블록별 `status: 'ok' \| 'unavailable'`과 최상위 `degradedBlocks: string[]`을 준다 | Must |
| FR-12 | **금액 블록 실패 시 0을 내려보내지 않는다.** `null` + `status: 'unavailable'`. 0은 "잔액이 0원"으로 읽힌다 | Must |
| FR-13 | 서버가 `degraded: true` / `degradedReasons[]` / `reconciliation`을 주면 **지우지 않고 전달**한다. 잔차·결측을 숨기지 않는다 | Must |
| FR-14 | 서버 호출마다 **타임아웃**을 준다. 블록 예산보다 짧게. 타임아웃된 블록은 `unavailable` | Must |
| FR-15 | 재시도는 **조회에만 최대 1회**. mutation은 재시도하지 않는다(중복 생성) | Must |

### C. 웹/모바일 이원 계약

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 홈 블록 함수 5개를 **개별 export**한다: `totalAsset` · `weeklyPlan` · `coach` · `taxDeadline` · `invoice` | Must |
| FR-21 | 웹용 **블록별 엔드포인트**를 만든다: `GET /api/app/home/total-asset` 등 5개 | Must |
| FR-22 | 모바일용 **집계 엔드포인트**는 블록 함수를 `allSettled`로 묶은 **얇은 껍데기**다: `GET /api/app/home` | Must |
| FR-23 | 두 형태가 **같은 블록 함수**를 쓴다. 뷰모델 정의가 두 곳에 있으면 안 된다 | Must |
| FR-24 | 같은 원칙을 세금 콕핏·청구서에도 적용한다(D-Day/요약은 즉시, 솔버/보정은 별도 블록) | Should |

### D. SSE 중계

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `POST /api/app/coach/messages`로 메시지를 보내고 `GET /api/app/coach/stream?messageId=`로 SSE를 받는다. 또는 POST 응답 자체를 SSE로 준다 — **둘 중 하나를 확정한다**(Open Question) | Must |
| FR-31 | 이벤트 계약: `message.start` · `message.delta` · `message.card` · `message.done` · `message.error` · `ping`. 상세는 `streaming-sse.md` §3 | Must |
| FR-32 | **추천 카드는 `delta`로 흘리지 않는다.** `message.card`로 완성 객체를 한 번에 준다 — 3종 세트 렌더 게이트(`renderable`)가 부분 상태에서 판정되면 안 된다 | Must |
| FR-33 | **취소 전파**: 클라이언트 연결 종료(`req.on('close')`)를 서버로 전파해 LLM 호출을 끊는다. 안 하면 유령 호출이 CPU와 비용을 먹는다 | Must |
| FR-34 | 헤더: `Content-Type: text/event-stream` · `Cache-Control: no-cache` · **`X-Accel-Buffering: no`**. **압축을 끈다** | Must |
| FR-35 | **하트비트 `ping`을 15초 주기**로 보낸다. 프록시가 유휴 연결을 끊는다 | Must |
| FR-36 | 재연결 시 **같은 메시지를 두 번 생성하지 않는다.** `messageId` 멱등 또는 `Last-Event-ID` | Must |
| FR-37 | 동시 스트림 상한을 두고 초과 시 거부한다. 사용자 ≤10명이므로 상한은 넉넉하게 | Should |
| FR-38 | **프롬프트·응답을 원문 로깅하지 않는다.** 토큰 수와 지연만 남긴다 | Must |

### E. 동면 경로 정리

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | `/api/app/feed` route와 `app-feed.service.ts` 등록을 제거하고 **410 Gone + 1회 로그**로 1주 유지 | Must |
| FR-41 | proxy에서 `/api/missions*` · `/api/users/points/*` · `/api/users/achievements` · `/api/dashboard` 제거 + 410 | Must |
| FR-42 | `app-alerts.service`를 **알림 2종**(세금 D-Day · 지표/추천 갱신)으로 축소 | Must |
| FR-43 | proxy에서 `POST /api/auth/register` 제거. **초대 코드 검증 route로 대체** | Must |
| FR-44 | 차트 프록시의 `period` 계약을 `minute`으로 정정한다 (현재 프론트가 `miniute`를 보낸다) | Must |

## Non-Functional

| 구분 | 요구사항 |
|---|---|
| 성능 | `performance-bff.md` 예산. **BFF가 얹는 지연 20ms 이하**. 홈 집계 400ms |
| 동작 동일성 | 기존 엔드포인트(`/api/app/portfolio` · `ai-coach` · `profit-plan` · `signal-performance` · `trade-preflight` · `behavior-coach` · `market`)의 응답이 **하위 호환**이어야 한다. 필드 추가는 허용, 제거·이름 변경은 프론트 동시 변경 |
| 보안 | 응답에 토큰·거래소 키·계좌 식별자를 담지 않는다. LLM 프롬프트에 계좌 식별자를 넣지 않는다 |
| 관측성 | 블록별 `unavailable` 발생률 · 서버 호출 지연 분포 · 타임아웃 발생률 · SSE 첫 토큰 지연 · 동시 스트림 수 |

## Acceptance Criteria

- [ ] `grep -rn "Promise.all(" bff/src/services` = 0 (조합 서비스에서)
- [ ] 홈 블록 함수 5개가 개별 export되고, 집계 엔드포인트가 그것을 `allSettled`로 묶는다
- [ ] 블록 하나를 강제 실패시키면 **그 블록만** `status: 'unavailable'`이고 나머지 4개가 정상이다
- [ ] 금액 블록 실패 시 값이 `null`이고 `0`이 아니다
- [ ] 서버가 준 `degraded`·`degradedReasons`·`reconciliation`이 응답에 그대로 있다
- [ ] 서버 호출 전부에 타임아웃이 설정되어 있다
- [ ] SSE로 `message.delta`가 흐르고 첫 토큰이 1s 이내에 온다
- [ ] `message.card`가 완성 객체로 한 번에 오고 `renderable` 필드를 갖는다
- [ ] 클라이언트 연결을 끊으면 **서버 LLM 호출이 취소된다** (서버 로그로 확인)
- [ ] `ping`이 15초 주기로 온다
- [ ] SSE 응답에 압축이 걸리지 않고 `X-Accel-Buffering: no`가 있다
- [ ] 재연결 시 같은 `messageId`가 두 번 생성되지 않는다
- [ ] 로그에 프롬프트·응답 원문이 0건이다
- [ ] 동면 경로가 **410 Gone**을 반환한다
- [ ] 알림 응답의 `kind`가 2종뿐이다
- [ ] `POST /api/auth/register` 경로가 없다
- [ ] 차트 프록시가 `period=minute`으로 서버를 부른다
- [ ] 기존 엔드포인트 응답 스냅샷이 하위 호환이다
- [ ] `npm run build` 통과

## Trace

| FR | 산출물 | 검증 |
|---|---|---|
| FR-1~5 | `routes`/`controllers`/`services` 경계 | 코드 리뷰 + grep |
| FR-10~15 | 조합 서비스 | 블록 강제 실패 5케이스 |
| FR-20~24 | 블록 함수 + 두 엔드포인트 | 응답 비교 (블록별 합 == 집계) |
| FR-30~38 | SSE 라우트·컨트롤러 | 스트림 캡처 + 취소 로그 |
| FR-40~44 | route 제거 + 410 | 응답 코드 확인 |

## Dependencies

- **선행:** 없음. 블록 함수 구조는 서버 변경 없이 만들 수 있다
- **연동:** `SRV-REQ-007`(동면) — FR-40~43이 서버 route 해제와 짝. **프론트 → BFF → 서버 순서**
- **연동:** `FE-REQ-008`(스트리밍 SSR) — FR-21이 웹 블록별 호출을 소비한다
- **후속:** F001~F007의 모든 BFF REQ가 이 구조를 전제한다

## Open Questions

- **SSE 시작 방식.** ① `POST`로 메시지를 만들고 `GET`으로 스트림을 여는 2단계 ② `POST` 응답을 바로 SSE로 주는 1단계. ①은 재연결이 쉽고(같은 `messageId`로 다시 붙는다) ②는 왕복이 하나 줄고 첫 토큰이 빠르다. **재연결 멱등(FR-36)이 ①에서 훨씬 단순하므로 ①이 기본안**이지만 첫 토큰 예산 측정 후 확정.
- 홈 블록별 엔드포인트 5개가 각각 인증을 통과하므로 **토큰 검증이 5회** 일어난다. 사용자 ≤10명이면 무시할 수 있지만, 서버 부하 측정 후 캐시 여부 결정.
- `packages/core`로 뷰모델 타입을 export하는 방법. BFF는 `salt-microFe` workspace 밖에 있다 — **별도 npm 패키지로 만들지, 타입만 복사하고 계약 테스트로 검증할지** 결정 필요.
- 세금 zone이 별도 도메인이면 BFF CORS 설정이 zone 2개를 허용해야 한다.
