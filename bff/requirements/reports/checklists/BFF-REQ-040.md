# BFF-REQ-040 체크리스트 — 국내 주식 화면 계약 · 실시간 중계 (2026-10-08)

| FR | 위치 | 결과 |
|---|---|---|
| FR-1 | `kr-stock.viewmodel.ts` `toKrMarketStatusVM` | 테스트 2(슬롯 수 안 옮김 · 모르는 장 상태 = 계약 깨짐) · 실서버 소유자 200(`pre_open` · `calendarKnown:false` · provider ok) |
| FR-2 | `toKrOverviewVM` | 테스트 4(필드 골라 옮김 · 모르는 배지 버림 · 가격 null/모르는 feed = 깨짐 · 금액 null 유지) · 실서버 50행 200 |
| FR-3 | `toKrDetailVM` · `toKrChartVM` · `toKrSearchVM` | 테스트 4 · 실서버 상세(`tickSize`) · 5분봉 3개 `tradingDays:1` · 검색 "삼성" 20건(`inUniverse`) |
| FR-4 | `kr-stock.controller.ts` | 실제 Express 앱 테스트 — 400 7경우(`..%2Fadmin` · 4자리 · `period=1h` · `count=501` · `limit=101` · `offset=-1` · `q=a`) 서버 호출 0 · 소문자 코드 대문자 · 기본값 |
| FR-5 | `app-kr-stock.service.ts` | 테스트 7 — ok · 503 꺼짐 → `disabled` 호출 1회 · 404 그대로 · 5xx 2회 뒤 `unavailable` · 계약 깨짐 `unavailable` · 경로/타임아웃 · 취소. 실서버 비소유자 404 `KR_STOCK_NOT_AVAILABLE` · 비회원 401 |
| FR-6 | `kr-stock.handler.ts` · `websocket/server.ts` | 실측: 소유자 `subscribed { assetType: kr_stock }` · 같은 연결의 코인 BTC 구독 그대로 |
| FR-7 | `kr-stream.manager.ts` | 테스트(구독 코드만 · 최신 하나로 묶음 · SSE 조각 끊김) · **실측 정규장 09:00~09:02(4분 30초)**: 국내 433건(005930 217 · 000660 216) · 코인 1,068건 동시 · 체결 시각(초 단위로 잘림) → 수신 p50 694ms · p95 1,178ms · 최대 1,694ms |
| FR-8 | 〃 | 테스트 — 404 · 401 · 503 꺼짐 1회만 열고 `error` code · 401 뒤 새 토큰으로 다시 엶 · 502/끊김 뒤 다시 엶. 실측 비소유자 `error KR_STOCK_NOT_AVAILABLE` 후 해제 |
| FR-9 | 〃 | 테스트 — 해제 · 구독 0 에서 upstream abort · 코드 101개 거부. 실측 로그 "해제 — 남은 중계 1" |
| FR-10 | `upbit-ws.service.ts` | 실측 코인 `price_update.data.assetType = "crypto"` |

## validate

- `npm test` 240 / 0 · `npm run build`(tsc) 통과. lint 스크립트 없음
- 실스택: 서버 4000(`tsx`) + BFF REST 4101 · WS 4102(기존 4001/4002 프로세스와 겹치지 않게 별도 포트)
- 지연: 시세 표 50행 40회 — BFF p50 7.7ms · p95 26.1ms / 서버 직접 p50 4.6ms · p95 22.0ms → BFF 가 얹는 지연 p95 +4ms(예산 20ms)
- 비밀값: 토큰은 로그 · 소켓 객체에 없다(`[kr-stream]` 로그는 연결 id · 코드 수 · status 만)

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 체결 → 화면 반영 < 1s(F011 비기능) | KIS 체결 시각이 초 단위라 p95 1,178ms 에 잘림 오차(최대 1s)가 섞인다. 화면 렌더까지는 못 쟀다 | `FE-REQ-041` 브라우저 실측 |
| 503 `KR_STOCK_DISABLED` 실서버 | 키 없는 서버를 따로 띄우지 않았다(워커가 같이 돈다) — 단위 테스트만 | 화면 슬라이스 "키 없음" 상태 실측 |
| 토큰 만료 중 스트림 | 서버가 열 때만 인증 — 만료 뒤에도 끊길 때까지 흐른다. 다시 열 때 401 로 멈추는 것은 테스트만 | 화면 슬라이스에서 재구독 흐름과 함께 |
| 비소유자에게 `subscribed` 가 먼저 간다 | 판정은 upstream 을 열 때 서버가 한다 — 응답 뒤 `error` 가 온다. 화면은 `error` 로 지운다 | `FE-REQ-041`(화면이 error 를 처리) |
| 업비트에 6자리 코드 → 거부 | 섞지 않는 근거로만 적었다. 실측 안 함 | 필요해지면(섞을 일이 없다) |
| 모바일 집계 1콜 · `@repo/core` 타입 | RN 범위 밖 · 타입은 FE 커밋 관례 | `FE-REQ-041` · F007 |
| 정규장 장시간(1시간+) 중계 안정성 | 실측 4분 30초 | FE 슬라이스 실측 |

## 슬라이스 3 추가(2026-10-08, `36ad645`)

| FR | 결과 |
|---|---|
| FR-11 | 컨트롤러 테스트(필터 통과 · 모르는 값 400 서버 호출 0) · 실서버 `sort=trade_value&order=desc&period=7d` 200 |
| FR-12 | 뷰모델 테스트 · 실서버 005930 `openPrice` 269,500 · `highPrice` 270,000 · `lowPrice` 266,500 |
| FR-13 | 뷰모델 테스트 · 화면 별 추가 → 관심 탭 1행(가격 서버 값) → 제거 |

`npm test` 242/242 · `npm run build` 통과. 앞 표의 "비소유자 `subscribed` 선응답" · "체감 지연"은 `FE-REQ-041` 이 받는다 — 비소유자는 탭이 없어 구독 자체를 하지 않는다(닫힘). 체감 지연 수치는 여전히 미측정(`FE-REQ-041` 체크리스트).


| FR-14 | 뷰모델 테스트(필드 있음 = 옮김 · 없음 = `null`) · 화면 로고 표시(`FE-REQ-041` FR-14) |

`npm test` 243/243 · `npm run build` 통과(`ad5217a`).

## 슬라이스 3b 추가(2026-10-08, `ba2ddc6`)

| FR | 결과 |
|---|---|
| FR-15 | 새 테스트 `trade-risk.controller.test.ts` 3 — 실제 Express 앱: `kr_stock` 통과 · 없으면 crypto · `us_stock` 400(서버 안 부름) · 국내 주식 + 손절가 400(서버 안 부름). 거래 응답 `assetType` 계약 검사 — 기존 고정값 4곳 갱신 |
| FR-16 | 새 테스트 `app-portfolio.test.ts` 3 — 국내 주식 없으면 호출 1 · `codes` 경로 · 이름/로고 · 실패면 코드 + `namesDegraded` · 금액 유지 |
| 게이트 | `npm test` 249/249 · `npm run build` 통과(BFF 에 lint 스크립트 없음) |

### 슬라이스 3b 미검증

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 실서버 경유 `POST /api/app/coach/trades` kr_stock | 4101 BFF 가 이 세션 전 코드로 떠 있고 재시작이 허용되지 않았다 — 경로는 실제 Express 앱 테스트, 서버 쪽은 유스케이스 통합 확인 | 다음 BFF 재시작 뒤 화면에서 1건 기록 |
