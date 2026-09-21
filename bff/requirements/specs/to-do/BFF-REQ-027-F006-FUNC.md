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

> **2026-09-21 개정.** `ADR-002` — 홈 블록 함수는 **3개**(`totalAsset` · `weeklyPlan` · `coach`). 작업 4개를 추가했다: ③ 포지션 조립 ④ 거래 기록 **쓰기 중계**(서버에 이미 있는 `POST/PATCH/DELETE`를 연다) ⑤ 알림 읽음 · 안 읽은 수 ⑥ 설정 한 화면 조립. 근거: 스토리보드 갭 감사 D5 · D6 · D9 · B12 · B13 · B14 · B16.

## Summary

BFF의 F006 작업은 **① SSE 중계**(변형 없이, 취소 전파) **② 홈 3블록 조립**(블록 격리, 웹/모바일 이원 계약)에 2026-09-21 **③ 포지션 ④ 거래 쓰기 ⑤ 알림 ⑥ 설정**이 더해졌다.

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

## 홈 3블록 조립

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 블록 함수 3개를 **개별 export**한다: `totalAsset` · `weeklyPlan` · `coach`. **개정 2026-09-21** — `taxDeadline` · `invoice` 삭제(ADR-002 · D6) | Must |
| FR-21 | 집계는 그 함수들을 **`Promise.allSettled`** 로 묶은 얇은 껍데기다 | Must |
| FR-22 | 웹은 **블록별 엔드포인트**, 모바일은 **집계 1콜**. 두 형태가 **같은 함수**를 쓴다 | Must |
| FR-23 | 블록 실패 시 `status: 'unavailable'` + `degradedBlocks[]` | Must |
| FR-24 | **금액 블록 실패 시 `0`을 내려보내지 않는다.** `null` | Must |
| FR-25 | 서버 `/api/home`이 이미 조립하므로 **BFF가 3번 부를지 1번 부를지** 결정한다 → **집계는 서버 1회, 블록별은 서버 블록 엔드포인트 1회씩** | Must |
| FR-26 | AI 추천 블록의 **`renderable`·`blockedReason`을 그대로 전달**한다. BFF가 판정하지 않는다 | Must |
| FR-27 | `fxBasisCode`(`'current_rate'` 또는 `null`)를 그대로 전달한다. 화면이 환율 기준 툴팁을 띄운다. **개정 2026-09-21** — 세금 기준 비교 삭제(ADR-002) | Must |
| FR-28 | `disclaimer`를 전달한다 | Must |
| FR-29 | 알림은 `messageCode` + `params`다. **완성 문장을 만들지 않는다.** 홈 응답에는 목록이 아니라 `unreadAlertCount`만 싣는다 **(개정 2026-09-21, D6)** | Must |
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

## 포지션 조립 (2026-09-21 추가, B13)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-70 | `GET /api/app/portfolio`를 **포지션 세그먼트 뷰모델**로 바꾼다: 서버 `overview` · `risk`를 `allSettled`로 묶고 섹션별 `status`를 둔다. 레이더가 실패해도 Hero · 보유는 나온다 **(기본안 — 감사 문서 B13)** | Must |
| FR-71 | `GET /api/app/portfolio/performance?range=1w\|1m\|3m\|1y`를 서버 `7d\|30d\|90d\|1y`로 **이름만 매핑**한다. MDD를 그대로 전달한다 | Must |
| FR-72 | 레이더 축 `value` · `limit` · `breached`를 **그대로** 전달한다. BFF가 상한을 판정하지 않는다 | Must |
| FR-73 | 보유 행에 상세 분석 페이지 링크 키(`symbol`)만 싣는다. 세금 배지 필드 0건 (ADR-002) | Must |

## 거래 기록 쓰기 중계 (2026-09-21 추가, B14)

서버에 `POST/PATCH/DELETE /api/portfolio/transactions`가 **이미 있고** BFF에는 조회만 있었다. 원장 확장은 없다(ADR-002 §3).

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-80 | `GET/POST /api/app/portfolio/transactions` · `PATCH/DELETE /api/app/portfolio/transactions/:id` · `POST /api/app/portfolio/transactions/preview`를 연다 **(기본안 — 감사 문서 B14)** | Must |
| FR-81 | 미리보기의 평단 · 수량 · 총액을 **그대로** 전달한다. **BFF가 평단을 계산하지 않는다** — 공통 기준 ③ | Must |
| FR-82 | 서버 422(`INSUFFICIENT_QUANTITY` · 검증 실패)를 **코드 그대로** 전달한다. 문구는 화면이 매핑한다 | Must |
| FR-83 | 쓰기 성공 후 BFF 캐시가 있다면 **포지션 · 홈 총자산 캐시를 비운다.** 없으면 해당 없음 | Must |
| FR-84 | 쓰기 경로는 **재시도 0회**. 재시도하면 같은 거래가 두 번 생긴다 | Must |
| FR-85 | 이 경로가 **주문이 아님**을 경로 이름 · Swagger 설명에 명시한다. 거래소로 나가는 호출 0건 | Must |

## 알림 (2026-09-21 추가, D5)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-90 | `GET /api/app/alerts`를 **1종 목록**으로: `{ items: [{ id, messageCode, params, target, isRead, createdAt }], nextCursor }` | Must |
| FR-91 | `PATCH /api/app/alerts/:id/read` · `PATCH /api/app/alerts/read-all` · `GET /api/app/alerts/unread-count`를 서버 경로에 1:1로 연다 | Must |
| FR-92 | `target` 코드를 화면 경로로 바꾸지 않는다. 딥링크 해석은 프론트 · 모바일이 한다 | Must |
| FR-93 | 알림 생성 · 조건 알림 경로를 **열지 않는다** (B19) | Must |

## 설정 한 화면 조립 (2026-09-21 추가, D9 · B16)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-100 | `GET /api/app/settings`가 그룹별로 **`allSettled`** 조립한다: `plan`(적립 기본액 · 주간 환산 · 밴드 임계값 — F003) · `coach`(성향 · `defaultMode` · `notificationLevel` — F004) · `alerts`(`alertsEnabled`). 그룹마다 `status` | Must |
| FR-101 | 쓰기는 **소유자 경로로 보낸다**: 적립 기본액 → F003 BFF `PATCH /api/app/plan/settings`, 코치 → F004 BFF 성향 경로, 알림 → `PATCH /api/app/settings/alerts`(서버 `preferences`). 설정 전용 쓰기 집계 경로를 만들지 않는다 | Must |
| FR-102 | 밴드 임계값은 **읽기 전용 필드**로 싣는다. 쓰기 경로 0건 (D9) | Must |
| FR-103 | 월 → 주 환산 금액은 **F003 서버 값**을 싣는다. BFF가 나누지 않는다 | Must |
| FR-104 | 계좌 연결 · 세금 파라미터 · 보류 기능 토글 필드 0건 (ADR-002 · B19) | Must |

## 온보딩 (2026-09-21 추가, B12)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-110 | 온보딩 단계 키 `link_account` → **`first_holding`** 을 그대로 전달한다 — **BREAKING**, FE `OnboardingStepKey`와 같이 바뀐다 | Must |
| FR-111 | `POST /api/app/onboarding/steps/first-holding/skip`을 서버 경로에 1:1로 연다 | Must |
| FR-112 | 2단계 입력은 거래 기록 `POST`(FR-80)를, 3단계는 F003 적립 설정 쓰기를 **그대로 재사용**한다. 온보딩 전용 쓰기 경로 0건 | Must |

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
- [ ] 블록 함수 3개가 개별 export되고 `taxDeadline` · `invoice`가 0건이다
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
- [ ] 포지션 뷰모델이 섹션별 `status`를 갖고 레이더 실패가 Hero를 막지 않는다
- [ ] `range=1w|1m|3m|1y`가 서버 `7d|30d|90d|1y`로 매핑되고 MDD가 전달된다
- [ ] 거래 `GET/POST/PATCH/DELETE` · `preview`가 열려 있다
- [ ] BFF에 평단 계산 코드가 0건이다 (미리보기 값이 서버 값과 같다)
- [ ] 422 코드가 그대로 전달된다
- [ ] 거래 쓰기 재시도가 0회다
- [ ] 알림 목록 · 읽음 · 모두 읽음 · 안 읽은 수 경로가 있다. 생성 경로가 0건이다
- [ ] 설정 조립이 그룹별 `allSettled`이고 쓰기가 소유자 경로로 간다
- [ ] 밴드 임계값 쓰기 경로가 0건이다
- [ ] 온보딩 단계 키가 `first_holding`이고 건너뛰기 경로가 있다

## Dependencies

- **선행:** `BFF-REQ-006`(SSE 기반) · `SRV-REQ-029`(서버 계약)
- **짝:** `BFF-REQ-028`(API) · `029`(UPSTREAM) · `030`(PERF)
- **규칙:** `streaming-sse.md` · `bff-architecture.md`

## Open Questions

- 홈 집계를 **서버 `/api/home` 1회**로 받을지 **BFF가 블록별 5회**로 조립할지. 서버가 이미 `homebriefing` 조합 컨텍스트를 갖고 있으므로 **서버 1회가 맞다** — 그러면 BFF의 `allSettled`는 서버 응답의 블록별 `status`를 전달하는 역할만 한다.
- 그 경우 **웹 블록별 엔드포인트**는 서버 블록 엔드포인트를 1:1 프록시한다.
- `ping`을 BFF가 생성할지 서버 것을 통과시킬지. **서버 것을 통과**시키면 서버-BFF 구간 유휴도 방지된다.
- F004 BFF 성향 쓰기 경로 이름은 F004 REQ가 정한다. 이 REQ는 "소유자 경로로 보낸다"만 고정한다.
- 거래 목록 페이징: 서버는 `page`·`limit`이다. BFF가 커서로 감쌀지(다른 목록과 통일) 그대로 둘지 — 거래 수가 적어 **그대로가 기본안**.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | ADR-002 머리 배너. 개정: 홈 3블록(FR-20 · 25), FR-27(`fxBasisCode` nullable), FR-29(홈 알림 목록 → 안 읽은 수, D6). 추가: FR-70~73(포지션 B13) · FR-80~85(거래 쓰기 중계 B14) · FR-90~93(알림 D5 · B19) · FR-100~104(설정 D9 · B16) · FR-110~112(온보딩 B12, **BREAKING** 단계 키). 근거: `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` · `ADR-002` |
