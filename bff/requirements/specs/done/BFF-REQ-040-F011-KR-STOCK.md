---
id: BFF-REQ-040
feature: F011
area: bff
kind: API
title: "F011 슬라이스 2 — 국내 주식 화면 계약(/api/app/market/kr/*) · 실시간 체결 중계(서버 SSE → WS price_update)"
priority: high
created: 2026-10-08
source: pm/requirements/specs/in-progress/FEATURE-011-kr-stock-kis.md §BFF/API 영향 · §슬라이스 순서 2
---

## Summary

슬라이스 0 · 1 서버가 `/api/market/kr/*`(저장값 · 소유자 전용)와 체결 SSE 를 열었지만 소비처가 없었다. 앱이 받을 계약을 세운다:
REST 5경로 뷰모델과, 서버 SSE 를 연결별로 받아 코인과 같은 WS `price_update` 로 내려 주는 중계. 계산 · 판정 · 문구 없음.

## 결정

1. **BFF 캐시를 두지 않는다.** 기획의 "정규장 1s · 그 외 60s" 를 버렸다 — 응답이 소유자 판정에 걸려 있어 공유 캐시는 비소유자에게
   새고, 토큰별 캐시는 사용자 ≤10명에서 히트가 없다. 서버가 저장값을 80ms 안에 주고 실시간은 WS 가 준다(`performance-bff.md` §4)
2. **upstream SSE 를 연결마다 연다.** 서버 스트림은 사용자 JWT + 소유자(슬라이스 1 판단 8). 하나를 열어 뿌리면 비소유자 연결에 간다.
   상한 20 중계 · 연결당 100코드
3. **토큰을 구독 메시지에 싣는다**(`{ type: "subscribe", assetType: "kr_stock", symbols, token }`). 브라우저 WS 는 헤더를 못 단다.
   만료(401) 뒤 화면이 새 토큰으로 다시 구독하면 이어 붙는다. 연결 URL `?token=` 도 받는다(기존 계약). 토큰은 중계 맵 · 연결 클로저에만
4. **업비트 경로와 섞지 않는다.** 6자리 코드를 업비트 구독에 넣으면 요청이 통째로 거부될 수 있다(실측 안 함) — `subscribedSymbols` 를 쓰지 않는다
5. **503 `KR_STOCK_DISABLED` → 200 `{ status: "disabled" }`**(탭 숨김, 다시 시도 안 함). 404(소유자 아님) · 401 · 400 은 그대로.
   그 밖 5xx · 타임아웃 · 계약 깨짐은 200 `unavailable`. 0원으로 채운 표를 주지 않는다
6. 서버 필드 이름을 유지한다 — 기획의 `lastTradeAt` · `nextCursor` 는 서버 `lastCloseAt` · `nextOffset` 으로 정정(서버가 먼저 섰다)
7. 체결 `price_update.data` 는 코인과 같은 이름 — `changeRate → change24h` · `change → change24hAmount`. 업비트 `signed_change_rate`
   도 전일 종가 대비라 뜻이 같다. 코인 메시지에도 `assetType: "crypto"` 를 단다(추가 필드 — 옛 화면은 무시)
8. 웹 블록별(장 상태 줄 · 표)만. 모바일 집계 1콜은 RN 범위 밖(F011 §화면 영향)이라 만들지 않는다. `@repo/core` 타입은 화면 슬라이스(`FE-REQ-041`)와 같은 커밋으로

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | `GET /api/app/market/kr/session` → `{ status, session, now, lastCloseAt, nextOpenAt, calendarKnown, provider: { status, since, lastSuccessAt, realtime: { state, lastTickAt } } }`. 슬롯 수는 옮기지 않는다 | 완료 |
| FR-2 | `GET /api/app/market/kr/overview?limit(1~100, 50)&offset(0)` → `{ status, session, items: KrQuote[], nextOffset }`. 행: `code · name · market · price · change · changeRate · volume(문자열) · tradeValue · marketCap · basePrice · upperLimit · lowerLimit · limitState · status[] · isHalted · feed · priceUpdatedAt` | 완료 |
| FR-3 | `GET /api/app/market/kr/search?q(2~30자)` · `GET /:code`(+`detail` 8필드 · `tickSize`) · `GET /:code/chart?period(1d·5m)&count(1~500, 120)` → `{ candles[], coverage: { from, to, tradingDays } }` | 완료 |
| FR-4 | 형식 검증은 서버 DTO 와 같은 규칙으로 먼저 — 코드 `^[0-9A-Z]{6}$`(소문자는 대문자로), 범위 밖 400 · 서버를 부르지 않는다(경로 주입 차단) | 완료 |
| FR-5 | 실패 규칙(결정 5) · 800ms(차트 1,500ms) · 조회 재시도 1회 · 화면을 떠나면 upstream 취소. 뷰모델은 필드를 골라 옮기고 아는 열거값만(배지는 모르면 버림, 장 상태 · 시세 상태는 모르면 계약 깨짐) | 완료 |
| FR-6 | WS `subscribe` · `unsubscribe` 에 `assetType: "kr_stock"` — 응답 `subscribed` · `unsubscribed` 에도 `assetType`. 코드 형식 · 토큰 없음은 `error { assetType, code: INVALID_SYMBOLS · KR_STOCK_AUTH_REQUIRED }` | 완료 |
| FR-7 | 서버 `GET /api/market/kr/stream` 을 연결별로 열어 그 연결이 구독한 코드만, 같은 코드는 최신 하나로 **500ms 묶음** → `price_update { assetType: "kr_stock", symbol, currentPrice, change24h, change24hAmount, timestamp }` | 완료 |
| FR-8 | 열기 거부(4xx · 503 꺼짐)는 `error { assetType: "kr_stock", code }` 후 중계 해제 — 다시 열지 않는다. 5xx · 연결 실패 · upstream 끊김은 1 · 2 · 5 · 10 · 30초로 다시 연다. 하트비트 45초 무응답이면 끊긴 것 | 완료 |
| FR-9 | WS 연결 종료 · 하트비트 종료 · 프로세스 종료에서 upstream 을 끊는다(유령 스트림 0). 동시 중계 상한 20 · 연결당 100코드(`KR_STREAM_LIMIT`) | 완료 |
| FR-10 | 코인 `price_update.data.assetType = "crypto"` | 완료 |
| FR-11 | `/overview` `sort` · `order` · `period` — 서버와 같은 값(코인 문자열 `""` · `trade_value` · `7d` …)만, 모르는 값은 서버를 부르지 않고 400(`period=1w` 400 확인) | 완료(`36ad645`, 슬라이스 3) |
| FR-12 | `KrQuoteVM` `openPrice` · `highPrice` · `lowPrice`(numOrNull) · 목록 행 `periodChange` | 완료(`36ad645`) |
| FR-13 | 관심 종목 — `kr_stock` 행은 업비트 가격 캐시를 보지 않고 서버 값 그대로(`logoUrl` null) · POST `assetType` 통과 | 완료(`36ad645`) |
| FR-15 | 거래 기록 `POST /api/app/coach/trades` `assetType`(`crypto` · `kr_stock`, 없으면 crypto) 통과 · 모르는 값 400. **국내 주식 + 계획은 400** — 코치 계획 연결이 코인 원장만 본다(슬라이스 4), 조용히 버리면 손절가가 사라진다. 거래 응답 `assetType`(모르는 값은 계약 깨짐) | 완료(`ba2ddc6`, 슬라이스 3b) |
| FR-16 | 홈 보유 요약 — 국내 주식 보유가 있을 때만 서버 `/market/kr/assets?codes=` 로 이름 · 로고(코인 이름 조회와 같은 규칙: 실패 · 404 면 코드 + `namesDegraded`, 금액은 그대로) | 완료(`ba2ddc6`) |
| FR-14 | 시세 행 `logoUrl` 통과(서버가 정한 logo.dev · FMP 주소) — 필드가 없는 옛 서버 응답은 `null`(로고는 꾸밈이라 계약 깨짐으로 보지 않는다) | 완료(`ad5217a`) |
| FR-17 | 종목 판단 모드 블록에 `assetClass`(모르면 crypto) · `history`(모양이 틀리면 null — 문구가 숫자를 지어내지 않게) · `blockedReason` 에 `mode_not_open` · `insufficient_history`(서버 값 통과) | 완료(`c0d9aad`, 슬라이스 4) |
| FR-18 | 성적표 정규식이 `kr_stock.<mode>.<action>` 을 **조용히 버리던 것** — 접두를 받고 `assetClass` 는 그룹 키에서 정한다. 코치 상세 `excluded[].progress` · 추천 `assetType` `kr_stock` 타입 | 완료(`c0d9aad`) |
| FR-19 | 국내 주식 거래 + 계획 400 해제(FR-15 의 임시 막음) — 서버 계획 연결이 국내 주식 거래를 받는다. 사이즈 계산은 그대로 통과(자산군 · 수수료는 서버가 시세로 고른다) | 완료(`c0d9aad`) |

## 계약 변경

- **새 경로** `/api/app/market/kr/*` 5개(소비처 없음 — `FE-REQ-041` 이 첫 소비처)
- **슬라이스 3(2026-10-08)** — `/overview` 쿼리 3개 · 응답 필드 4개 추가(기존 필드 무변경) · 관심 종목 `kr_stock` 통과. 소비처 `FE-REQ-041`
- **WS 추가 필드** — 코인 `price_update.data.assetType`, 구독 메시지 `assetType` · `token`. 기존 메시지 그대로 동작(`assetType` 없으면 코인)
- 서버 계약 변경 없음(`openAuthStream` 이 GET 도 연다 — BFF 내부)
- **슬라이스 4(2026-10-08)** — 화면 계약 추가: 판단 모드 `assetClass` · `history`, 사유 2종, 성적표 그룹 `assetClass`, 상세 `excluded[].progress`. 거래 + 계획 400 해제(요청이 넓어졌다 — 기존 요청 무변경). 서버 짝 `SRV-REQ-040` FR-60~66 · 37 · 38, 소비처 `FE-REQ-041` FR-19~22

## Changelog

- 2026-10-08: 초판 · FR-1~10 완료
- 2026-10-08: FR-14 — `logoUrl` 통과(`ad5217a`). 테스트 243/243
- 2026-10-08: FR-11~13 — 화면을 코인과 같게(`FE-REQ-041`): 필터 · 당일 시가/고가/저가 · 기간 수익률 · 관심 종목 `kr_stock`. 첫 소비처가 생겨 미검증 "비소유자 subscribed 선응답"을 화면이 처리(탭 없음 · 거부 코드)
- 2026-10-08: 슬라이스 3b — FR-15 거래 기록 `assetType` · FR-16 보유 요약 국내 주식 이름 · 로고. 테스트 249/249(경로 3 · 요약 3 · 기존 거래 응답 고정값에 `assetType`)
- 2026-10-08: 슬라이스 4 — FR-17~19(판단 자산군 · 이력 · 사유 2종 · 성적표 접두 · 계획 400 해제). 테스트 251/251(모드 블록 국내 주식 1 · 성적표 1 · 계획 400 기대값을 201 로)
