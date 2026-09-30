---
id: BFF-REQ-036
feature: F000
area: bff
kind: CHORE
title: "BFF 부채 정리 — 4xx 보존 일원화 · 동면 경로 410 · Upbit 지연 연결 · 규칙 4곳"
priority: medium
labels: [bff, error-handling, dormant, rules, tech-debt]
created: 2026-09-22
---

## Summary

BFF 회고 · 규칙 점검에서 모인 부채를 닫는다. 새 엔드포인트 · 새 뷰모델은 없다.

1. **서버 4xx 보존을 error middleware 한 곳으로** — 컨트롤러 8곳이 제각각 잡거나 500 으로 뭉갰다
2. **동면 경로 410** — `BFF-REQ-007` A절 · `BFF-REQ-008` FR-11 을 여기서 구현한다(본문은 그 두 REQ)
3. **규칙 문서가 코드와 반대로 말하는 곳 4개**를 맞춘다
4. **Upbit 소켓을 import 가 아니라 첫 구독 때 연다**

## 왜 — 관찰된 문제

| # | 문제 | 근거 |
|---|---|---|
| 1 | proxy · market · watchlist 가 `error.response` 를 각자 잡았고 옮기는 필드가 달랐다 — watchlist 는 `code` 를 잃었다 | 코드 대조 |
| 2 | alerts · home · portfolio · market(목록 · 종목)이 catch 에서 전부 500. **토큰 만료 401 이 "서버 오류"가 된다** | 실측 — 가짜 토큰 before 500 |
| 3 | `/api/missions*` 등이 규칙(§7 "410")과 달리 살아 있는 proxy 였다 | `BFF-REQ-007` 회고 |
| 4 | `proxyRequest` 에 "LLM 30s" 타임아웃 — 호출처(뉴스 · 초대)에 LLM 이 없다 | 코드 대조 |
| 5 | `performance-bff.md` §6 "화면이 보는 종목만"이 `bff-architecture.md` §8 "limit=100 변경 금지"와 반대로 읽혔다 | 규칙 대조 |
| 6 | `websocket-worker.md` "diff 구독" — Upbit 는 같은 연결의 새 요청이 이전 구독을 **대체**한다 | 2026-09-21 실측 |
| 7 | `upbit-ws.service` 가 생성자에서 연결 — 캐시만 읽는 REST 도 거래소 소켓을 열고, `app.ts` 를 import 하는 테스트가 끝나지 않는다 | 이 REQ 작업 중 발견 |

## Requirements

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 서버 4xx 는 error middleware 가 보존한다 — status · `code` · `message` · `errors` · `Retry-After`. 서버 4xx 본문 키가 이 넷이라 proxy 가 본문을 통째로 넘기던 것과 같다 | Must |
| FR-2 | 컨트롤러는 `next(error)` 만 한다. `error.response` 를 직접 잡거나 500 을 직접 쓰지 않는다(동면 `feed` 제외) | Must |
| FR-3 | `proxyRequest` 는 기본 타임아웃(10s) | Must |
| FR-4 | 동면 경로 — `BFF-REQ-007` FR-1~5 그대로 + `/api/users/dashboard`(`DORMANT_PATHS` 상수 · 마운트 지점당 1회 로그 · `410 { code: 'ENDPOINT_DORMANT', revivable: true }` · feed 파일은 남김) | Must |
| FR-6 | Upbit 소켓은 첫 `subscribe` 때 연다. `close()` 뒤에는 재연결하지 않는다 | Must |
| FR-5 | 규칙 4곳 — `backend-integration.md`(보존 위치) · `websocket-worker.md`(전체 집합 전송) · `performance-bff.md` §6(상위/하위 두 층) · `bff-architecture.md` §7(목록 위치 · 기한) | Must |

## Non-functional

- 2xx 응답 모양 변화 0
- 4xx 응답은 **status 가 맞아지는 것 외에** 본문 키 변화 없음(`success` · `code` · `message` · `errors`)
- 5xx 는 기존대로 500(502/504 구분은 보류 항목)

## 범위 밖

| 항목 | 사유 |
|---|---|
| 5xx → 502/504 구분 | 어느 status 로 줄지 별도 판단(보류 목록) |
| `app-home.service` 동면 소스 제거 | `BFF-REQ-007` B절 — F006 홈 블록과 순서 조율 |
| `getMarketSymbol` 컨트롤러 직접 호출 · `Promise.all` | `rest-contract.md` 위반이지만 소비처 확인 필요 |
| WS 가격 throttle | `performance-bff.md` §6 규칙 · 미구현 |

## Changelog

- 2026-09-22 신설 · 구현. 같은 날 FR-6(Upbit 지연 연결) 추가 — 범위 밖으로 적었다가 REST 동작 변화 0 을 확인하고 들였다
