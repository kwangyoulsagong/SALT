---
id: BFF-REQ-027
feature: F006
area: bff
kind: FUNC
title: "F006 코치 대화 & 3탭 IA — BFF 조립 로직 정의 (SSE 중계 · 홈 블록 격리)"
priority: critical
labels: [bff, sse, streaming, home, allsettled]
created: 2026-09-09
---

## Summary

BFF의 F006 작업은 둘이다: **① SSE 중계**(변형 없이, 취소 전파) **② 홈 5블록 조립**(블록 격리, 웹/모바일 이원 계약).

## SSE 중계 — BFF는 통로다

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | BFF는 **중계자**다. 토큰을 저장하거나 변형하지 않는다 | Must |
| FR-2 | 이벤트 이름과 페이로드를 **화면 계약으로 정규화**한다. 서버 이벤트 이름을 그대로 쓰되 필드명만 뷰모델에 맞춘다 | Must |
| FR-3 | **카드는 `message.card` 단일 이벤트**로 통과시킨다. 쪼개지 않는다 | Must |
| FR-4 | **클라이언트 연결 종료를 서버로 전파**한다: `req.on('close')` → `upstream.destroy()` + `controller.abort()` | Must |
| FR-5 | 전파하지 않으면 **유령 LLM 호출**이 서버 CPU와 비용을 먹는다 | Must |
| FR-6 | `ping`을 그대로 통과시키거나 BFF가 생성한다. **15초** | Must |
| FR-7 | **압축을 끈다.** gzip 버퍼링이 토큰을 모아 버린다 | Must |
| FR-8 | `X-Accel-Buffering: no`를 설정한다 | Must |
| FR-9 | `Last-Event-ID`를 서버로 전달한다. 재연결 멱등의 근거다 | Must |
| FR-10 | **동시 스트림 상한**을 둔다. 초과 시 429 | Must |
| FR-11 | 스트림 오류 시 `message.error` + `fallbackText`를 그대로 전달한다. **BFF가 문구를 만들지 않는다** | Must |
| FR-12 | SSE 요청·응답 본문을 **로깅하지 않는다** | Must |

## 홈 5블록 조립

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 블록 함수 5개를 **개별 export**한다: `totalAsset` · `weeklyPlan` · `coach` · `taxDeadline` · `invoice` | Must |
| FR-21 | 집계는 그 함수들을 **`Promise.allSettled`** 로 묶은 얇은 껍데기다 | Must |
| FR-22 | 웹은 **블록별 엔드포인트**, 모바일은 **집계 1콜**. 두 형태가 **같은 함수**를 쓴다 | Must |
| FR-23 | 블록 실패 시 `status: 'unavailable'` + `degradedBlocks[]` | Must |
| FR-24 | **금액 블록 실패 시 `0`을 내려보내지 않는다.** `null` | Must |
| FR-25 | 서버 `/api/home`이 이미 조립하므로 **BFF가 5번 부를지 1번 부를지** 결정한다 → **집계는 서버 1회, 블록별은 서버 블록 엔드포인트 1회씩** | Must |
| FR-26 | AI 추천 블록의 **`renderable`·`blockedReason`을 그대로 전달**한다. BFF가 판정하지 않는다 | Must |
| FR-27 | `fxBasisCode: 'current_rate'`를 그대로 전달한다. 화면이 툴팁으로 세금 기준과 구분을 알린다 | Must |
| FR-28 | `disclaimer`를 전달한다 | Must |
| FR-29 | 알림은 `messageCode` + `params`다. **완성 문장을 만들지 않는다** | Must |
| FR-30 | 홈을 **캐시하지 않는다** | Must |

## 대화 목록·메시지

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 대화 목록·메시지 목록을 **커서 페이징**으로 중계한다 | Must |
| FR-41 | 메시지 목록은 **역순**(최신부터) | Must |
| FR-42 | `cardPayload`를 그대로 전달한다. **게이트 필드를 채우지 않는다** | Must |
| FR-43 | 삭제는 사용자 요청 시에만 중계한다 | Must |

## 패널 배치

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | `treeJson`을 **검증하지 않는다.** 프론트 `layoutTree`가 소유한 형식이다 | Must |
| FR-51 | 크기 상한 16KB. 초과 시 413 | Must |
| FR-52 | 저장 실패해도 **화면이 기본 배치로 동작**해야 한다. BFF가 오류를 강조하지 않는다 | Must |

## 하지 않는 것

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | **LLM을 부르지 않는다** | Must |
| FR-61 | **토큰을 변형하지 않는다.** 후처리는 서버가 한다 | Must |
| FR-62 | **게이트를 판정하지 않는다** | Must |
| FR-63 | **문구를 만들지 않는다** | Must |
| FR-64 | **금액을 계산하지 않는다** | Must |
| FR-65 | 대화 내용을 저장하지 않는다 | Must |
| FR-66 | **주문을 중계하지 않는다** | Must |

## Acceptance Criteria

- [ ] SSE가 변형 없이 중계된다
- [ ] **카드가 단일 이벤트로 통과한다** (쪼개짐 0건)
- [ ] **클라이언트 종료가 서버로 전파되고 LLM이 취소된다** (서버 로그 확인)
- [ ] `ping`이 15초 주기로 온다
- [ ] **SSE에 압축이 걸리지 않고 `X-Accel-Buffering: no`가 있다**
- [ ] `Last-Event-ID`가 서버로 전달된다
- [ ] 동시 스트림 상한 초과 시 429다
- [ ] `message.error` + `fallbackText`가 그대로 전달된다
- [ ] SSE 본문이 로그에 0건이다
- [ ] 블록 함수 5개가 개별 export된다
- [ ] `Promise.all`이 0건이다
- [ ] 웹 블록별·모바일 집계가 같은 함수를 쓴다
- [ ] 블록 하나 실패 시 그것만 `unavailable`이고 나머지가 정상이다
- [ ] 금액 블록 실패 시 `null`이고 `0`이 0건이다
- [ ] AI 추천의 `renderable`·`blockedReason`이 그대로 전달된다
- [ ] `fxBasisCode`가 전달된다
- [ ] `disclaimer`가 전달된다
- [ ] 알림이 `messageCode` + `params`이고 완성 문장이 0건이다
- [ ] 홈이 캐시되지 않는다
- [ ] 대화·메시지 목록이 커서 페이징이고 메시지가 역순이다
- [ ] `cardPayload`가 그대로 전달되고 게이트 필드가 채워지지 않는다
- [ ] `treeJson`이 검증되지 않고 16KB 초과 시 413이다
- [ ] BFF에 LLM 호출·토큰 변형·게이트 판정·문구 생성·금액 계산 코드가 0건이다
- [ ] 대화 내용이 BFF에 저장되지 않는다
- [ ] 주문 중계 경로가 0건이다

## Dependencies

- **선행:** `BFF-REQ-006`(SSE 기반) · `SRV-REQ-029`(서버 계약)
- **짝:** `BFF-REQ-028`(API) · `029`(UPSTREAM) · `030`(PERF)
- **규칙:** `streaming-sse.md` · `bff-architecture.md`

## Open Questions

- 홈 집계를 **서버 `/api/home` 1회**로 받을지 **BFF가 블록별 5회**로 조립할지. 서버가 이미 `homebriefing` 조합 컨텍스트를 갖고 있으므로 **서버 1회가 맞다** — 그러면 BFF의 `allSettled`는 서버 응답의 블록별 `status`를 전달하는 역할만 한다.
- 그 경우 **웹 블록별 엔드포인트**는 서버 블록 엔드포인트를 1:1 프록시한다.
- `ping`을 BFF가 생성할지 서버 것을 통과시킬지. **서버 것을 통과**시키면 서버-BFF 구간 유휴도 방지된다.
