# FEATURE-011: 국내 주식 시세 · 분석 연동 (한국투자증권 Open API)

## TL;DR

- 국내 주식을 **시세 · 차트 · 지표 · 코치 판정 대상**으로 더한다. **거래 연동이 아니다** — 계좌 · 주문 · 잔고 · 출금 API 는 호출 경로 자체를 만들지 않는다(마스터 인덱스 §6-2, 글로벌 플랜 1-2). 거래는 지금처럼 수동 입력(`PortfolioTransaction`).
- 소스는 한국투자증권(KIS) Open API 하나다. 2026-09-27 실전 도메인에서 토큰 발급 · 현재가(삼성전자 286,500원) · 승인키 · WebSocket 구독 성공을 확인했다. 지금 레포에 있는 것은 `salt-server/src/shared/config/env.ts` 의 env 4개뿐이다.
- 유니버스는 **전 종목 마스터를 받되, 시세는 보유 ∪ 관심 ∪ 시가총액 상위 N** 만 모은다. 초당 20건 한도 안에서 일봉은 기간별 시세로 백필하고, 5분봉은 우리가 실시간 · 1분 조회로 **누적**한다(KIS 분봉은 당일만 준다).
- 지표 · 판단 · 성적표는 **자산군을 분리해 채점**한다 — 코인 표본과 섞지 않는다. `COACH_EXCLUDED` 의 `kr_stock` 은 일봉 120 거래일 · 지표 · 라이브 표본 20 이 찼을 때 **장기 모드부터** 연다.
- 장 시간 밖엔 실시간이 없다. 화면은 "정규장 아님 · 마지막 체결 15:30" 을 숨기지 않는다. 원화 정수 · 호가 단위 · 상하한가 · 거래정지 · 관리종목을 그대로 보인다.
- 전망(`salt-forecast`)은 별도 슬라이스 — 주식은 거래일만 있으므로 주 격자 · 휴장일 · `available_at = 장 마감` 처리가 먼저다.

## 배경과 문제

- 사용자 요구(2026-09-27): 국내 주식도 코인처럼 보고 싶다. 키는 이미 받았다.
- FEATURE-008 은 2026-09-23 "BTC 만 하기도 벅차" 로 미국 주식을 TBA, 국내 주식도 TBA 로 뒀다. F008 리서치가 남긴 열린 질문 "국내 투자자별 수급 — 증권사 API 는 계좌가 필요, 계좌 연동 없음과 충돌" 은 **KIS Open API 가 조회 전용 앱 키로도 동작하는 것이 확인돼** 닫을 수 있다 — 단, 앱 키 발급에 계좌 개설이 필요하다는 사실은 남는다(§KIS 사실).
- 현황(코드 근거):
  - 코치는 국내 주식을 통째로 제외한다 — `salt-server/src/coach/domain/policy/coachDetail.ts` `COACH_EXCLUDED = [{ assetType: "kr_stock", reasonCode: "no_realtime_data" }]`, 화면 문구 `salt-microFe/apps/web/src/entities/coach/model/messages.ts` `"kr_stock:no_realtime_data"`. 같은 파일 `toDetailAssetType` 은 DB enum `stock` 을 **미국 주식으로 읽는다**.
  - 시세는 업비트뿐 — `salt-server/src/market/infrastructure/UpbitClient.ts`, `SyncMarketData.ts`(5m 288 · 1d 120 캔들 수집, 1d 는 2년 백필), `RefreshTechnicalIndicators.ts`(m5 · h1 · d1 지표, h1 은 5m 을 묶어 만든다), 워커 `salt-server/src/workers/market.worker.ts`(market-sync 6시간 · price-update 1분 · price-history 5분 · indicators 2분).
  - 실시간은 BFF 가 업비트 WebSocket 에 직접 붙는다 — `bff/src/services/upbit-ws.service.ts`(`wss://api.upbit.com/websocket/v1`). BFF 는 외부 키를 갖지 않는 구조라 KIS 는 이 자리에 못 들어간다.
  - 웹은 `/investments`(시장표 · 요약 띠 `MARKET_SUMMARY_SYMBOLS`) · `/investments/[symbol]`(상세) — `salt-microFe/apps/web/app/investments/**`, `src/pages/investments/**`. 심볼은 업비트 티커(`BTC`).
  - DB — `salt-server/prisma/schema.prisma` `AssetType { crypto, stock }`, `MarketAsset`(symbol @id · market · 24h 필드), `PriceHistory`(symbol · assetType · timeframe · unique(symbol, timeframe, timestamp)), `TechnicalIndicator`(Timeframe enum m1~d1). Shared Kernel `salt-server/src/shared/domain/AssetType.ts` 는 `crypto | kr_stock | us_stock` 세 값이고 DB enum 을 넓히는 일은 `DB-REQ-003` 이 미뤄 뒀다.
  - 전망 — `salt-forecast/src/salt_forecast/ingest/upbit.py` 는 업비트 일봉만, `available_at = 봉 마감(다음 날 00:00 UTC)`. 주 격자는 월요일 as_of(F010 슬라이스 0, `008b3bd`). 거래일 · 휴장일 개념이 없다.
  - env — `KIS_APP_KEY` · `KIS_APP_SECRET`(선택) · `KIS_BASE_URL` · `KIS_WS_URL`(`2218d32`). 로컬 검증 스크립트 `salt-server/_probe-kis.ts` 는 커밋 대상이 아니다.

## 목표

1. `/investments` 에서 국내 주식을 코인과 같은 표 · 상세 · 차트 · 실시간(정규장) 으로 본다.
2. 국내 주식 일봉 · 5분봉 · 지표가 서버 DB 에 쌓여 코치 판정 · 성적표 · 전망의 **재료**가 된다.
3. 코치가 국내 주식을 **자산군 분리 채점** 으로 판단한다. 3종 세트 게이트 · 성적표 정의는 코인과 같다.
4. KIS 키 · 한도 · 장애를 서버 한 곳이 감당한다. BFF · 프론트에 키 0건.

### Non-Goals

- 주문 · 계좌 · 잔고 · 매수가능 · 체결통보(`H0STCNI0`) · 출금 — **영구 Non-Goal**. 코드 경로를 만들지 않고 테스트로 막는다(FR-3).
- 미국 주식 — F008 TBA 그대로.
- 국내 파생 · ETF 옵션 체인 · 공매도 잔고 — 이번 범위 밖(전망 슬라이스에서 재검토).
- 시세의 외부 재배포 · 공개 SEO 페이지 노출(§정책 · 약관 확인 전).

## 사용자 시나리오

1. `/investments` → 자산군 탭 **국내주식**. 시총 상위 · 보유 · 관심 종목이 원화 정수 가격 · 등락률 · 거래대금과 함께 보인다. 종목 아이콘 자리에 로고가 없으면 이니셜 배지.
2. 오후 2시(정규장) — 가격이 체결마다 움직인다(WS 41 슬롯 안 종목). 슬롯 밖 종목은 1분 갱신, 행에 "1분 지연" 배지.
3. 저녁 9시 — 표 머리에 `정규장 아님 · 마지막 체결 15:30 · 다음 개장 내일 09:00`. 시간외 단일가 종목은 16:00~18:00 값이 따로 한 줄.
4. `/investments/005930` 상세 — 현재가 · 전일 대비 · 상한가/하한가 · 기준가 · 52주 · 시총 · PER/PBR · 외국인 보유율 · 일봉 차트 · 5분봉(누적된 만큼, "N 거래일치") · 호가 10단계(Should).
5. 관리종목 · 거래정지 · 투자경고 종목은 가격 옆에 상태 배지. 거래정지면 실시간 자리 대신 "거래정지 · 마지막 체결 {일시}".
6. 코치 상세 — 처음엔 "국내주식은 일봉 120 거래일 · 지표 · 표본 20 이 차면 판단해요 (지금 일봉 63 · 표본 0)". 조건이 차면 장기 모드 판단 카드에 근거 · 적중률(국내주식 표본만) · 실패 사례 3종.
7. 거래 기록은 지금 폼 그대로 — 자산군 국내주식 · 6자리 코드 · 원화. 사이즈 계산 · 리스크 예산이 국내주식 보유를 포함한다.
8. KIS 가 죽거나 한도를 넘으면 표는 마지막 저장값 + `N분 전 시세` 배지. 코치 판정은 하루 넘게 오래된 재료면 `stale_data` 로 막힌다.

## 기능 요구사항

### A. 연동 기반 — 토큰 · 한도 · 보안

| ID | 요구사항 | 우선 | 상태 |
|---|---|---|---|
| FR-1 | 서버 `market` 컨텍스트에 `KisClient`(REST) · `KisRealtimeClient`(WS) 어댑터. 키는 `salt-server` env 만 읽는다. BFF · FE · `salt-forecast` 에 키 0건 | Must | 완료(S0·1) |
| FR-2 | 접근 토큰은 **1일 1회 발급 · 24시간 유효 · 재발급 분당 1회 제한** 을 전제로 DB 에 캐시한다(`ExternalApiToken`). 만료 10분 전 갱신, `EGW00133`(재발급 제한) 이면 캐시된 토큰을 그대로 쓴다. 프로세스 재시작이 발급을 늘리지 않는다 | Must | 완료(S0·1) |
| FR-3 | **주문 · 계좌 API 호출 경로 0건.** `KisClient` 는 TR ID **허용 목록**(조회 TR 만)으로만 호출하고, 코드 전체에 `TTTC` · `VTTC` · `TTTS` · `CTSC` 로 시작하는 TR ID 문자열이 0건임을 테스트가 검사한다 | Must | 완료(S0·1) |
| FR-4 | 호출 페이서: 앱 키 하나 · 초당 20건 한도의 **30%(6건/s) 를 우리 상한**으로 두고, 분당 예산을 작업별로 배분한다(§서버 §한도 예산). 한도 초과 응답(`EGW00201`) 은 지수 백오프 · 해당 작업만 멈춘다 | Must | 완료(S0·1) |
| FR-5 | 로그 · 에러 메시지에서 `appkey` · `appsecret` · `authorization` · `approval_key` 를 마스킹한다. 응답 원문을 로그에 남기지 않는다 | Must | 완료(S0·1) |
| FR-6 | 키가 없으면(`KIS_APP_KEY` 미설정) 국내 주식 기능 전체가 **꺼진 채 기동**한다 — 워커 미등록 · API 는 `503 kr_stock_disabled` · 화면은 탭 자체가 없다 | Must | 완료(S0·1) |

### B. 종목 마스터 · 유니버스

| ID | 요구사항 | 우선 | 상태 |
|---|---|---|---|
| FR-10 | KOSPI · KOSDAQ 종목 마스터(`.mst`) 를 매일 07:30 KST 내려받아 `KrStockMaster` 에 upsert — 코드 · 이름 · 시장 · 업종 · 상장주식수 · 관리 · 거래정지 · 투자경고 플래그. 상장폐지는 `delistedAt` | Must | 완료(S0·1) |
| FR-11 | 시세 수집 유니버스 = 보유(`PortfolioHolding` kr_stock) ∪ 관심(`InvestmentWatchlist`) ∪ **시가총액 상위 N**(기본 50, env `KIS_UNIVERSE_TOP_N`). 유니버스 종목만 `MarketAsset` 행을 갖는다 | Must | 부분(S0 — 보유는 S3) |
| FR-12 | WS 실시간 슬롯(세션당 41 건 — §KIS 사실) 은 보유 → 관심 → 시총 순으로 채우고, 나머지는 1분 폴링. 슬롯 배정은 유니버스가 바뀔 때 다시 계산 | Must | 완료(S0·1) |
| FR-13 | 종목 검색 `GET /api/market/kr/search?q=` — 마스터 전체(약 2,700)에서 이름 · 코드 부분 일치. 유니버스 밖 종목을 관심에 추가하면 다음 주기부터 수집 | Must | 완료(S0·1) |
| FR-14 | 휴장일을 KIS 휴장일 조회로 받아 `MarketHoliday` 에 저장(주 1회 + 부팅). 장 상태 계산 · 전망 거래일 격자가 같은 표를 본다 | Must | 부분(S0 — 미래 휴장 모름) |

### C. 시세 수집 — 일봉 · 분봉 · 실시간

| ID | 요구사항 | 우선 | 상태 |
|---|---|---|---|
| FR-20 | **일봉**: 기간별 시세(수정주가) 로 유니버스 종목당 2년(약 490 거래일) 백필 — 호출당 최대 100건이라 날짜 페이지네이션. 이후 매 거래일 15:45 KST 에 당일 봉 확정 저장. `PriceHistory(assetType=kr_stock, timeframe="1d")`, `timestamp = 거래일 00:00 KST` | Must | 완료(S0·1) |
| FR-21 | **5분봉**: 당일 분봉 TR(`FHKST03010200`) 은 30건 · 당일만이라 정규장 동안 WS 체결(슬롯 종목) 또는 1분 시세 조회(폴링 종목) 를 5분 버킷으로 **우리가 집계**해 `PriceHistory(timeframe="5m")` 에 저장한다. 장 마감 후 **일별 분봉 TR(`FHKST03010230`, 120건 · 최대 1년 보관)** 로 빈 버킷을 메우고, 같은 TR 로 유니버스 종목 5분봉을 **최대 1년 백필**한다(호출 수가 크므로 한도 예산 최하위, 야간에만) | Must | 완료(S1 — 30일 보관, 1년은 정정) |
| FR-22 | 1시간봉 지표(`h1`) 는 기존처럼 5m 을 묶는다. 누적 전엔 없다 — 화면 · 코치가 "N 거래일치" 로 안다 | Must | Draft |
| FR-23 | 현재가 조회 결과에서 `MarketAsset` 에 현재가 · 전일대비 · 등락률 · 누적거래량 · 거래대금 · 시총 · 상한가 · 하한가 · 기준가 · 종목상태 코드 · 거래정지 여부를 갱신. 코인의 24h 필드 의미와 다르므로 필드는 따로(§DB) | Must | 완료(S0·1) |
| FR-24 | 실시간 체결(`H0STCNT0`) 을 서버가 받아 `MarketAsset.currentPrice` 갱신 + 내부 SSE `GET /api/market/kr/stream` 으로 BFF 에 흘린다. BFF 는 기존 WS `price_update` 로 앱에 방송(코인과 같은 메시지 형태, `assetType: "kr_stock"` 추가) | Must | 완료(S0·1 서버 · S2 BFF 중계) |
| FR-25 | WS 세션은 08:30~18:00 KST 에만 유지(장전 동시호가 ~ 시간외 단일가). 끊기면 지수 백오프 재접속, 재접속 시 승인키 재발급 · 슬롯 재구독 | Must | 완료(S1 — 16:00 까지, 시간외 단일가는 FR-27 과 함께) |
| FR-26 | 장 상태 `session` 을 서버가 KST 시계 + `MarketHoliday` 로 계산한다: `pre_open`(08:30~09:00) · `regular`(09:00~15:30, 15:20~ `closing_auction`) · `after_hours_close`(15:40~16:00) · `after_hours_single`(16:00~18:00) · `closed` · `holiday`. 응답마다 `session` · `lastTradeAt` · `nextOpenAt` | Must | 완료(S0·1) |
| FR-27 | 시간외 단일가 현재가는 별도 필드(`afterHours.price` · `changeRate` · `at`) — 정규장 현재가 · 등락률과 섞지 않는다 | Should | Draft |
| FR-28 | 호가 10단계(매수 · 매도 잔량, 총잔량) — 상세 화면 Should. 실시간 호가(`H0STASP0`) 는 슬롯을 두 배로 먹으므로 **보유 종목만** | Should | Draft |
| FR-29 | 투자자별 매매동향(외국인 · 기관 · 개인 순매수) 일별 — 상세 Should. 전망 피처 후보는 채점이 정한다(F008 FR-54 와 같은 선) | Should | Draft |

### D. 화면 · 표시 규칙

| ID | 요구사항 | 우선 | 상태 |
|---|---|---|---|
| FR-40 | `/investments` 시장표에 자산군 탭(코인 · 국내주식). 국내주식 표: 이름 · 코드 · 시장 · 현재가(원 정수) · 등락률 · 거래대금 · 시총. 정렬 기본 시총 | Must | 완료(S3) — 자산군 탭 · 코인과 같은 5열 |
| FR-41 | 표 머리 **장 상태 줄**: 정규장이면 "실시간" · 아니면 "정규장 아님 · 마지막 체결 {HH:mm} · 다음 개장 {요일 HH:mm}". 휴장일은 사유 이름 | Must | 완료(S3) |
| FR-42 | 가격은 **원화 정수 · 천 단위 구분**. 호가 단위(가격대별 1 · 5 · 10 · 50 · 100 · 500 · 1,000원) 를 상세 머리에 표시. 거래 기록 폼 단가 입력은 호가 단위 배수가 아니어도 **막지 않고** 안내만(수동 입력 원칙) | Must | 완료(S3) — 호가 단위는 상세 머리. 거래 폼 안내는 3b |
| FR-43 | 상한가 · 하한가 도달 시 가격 옆 배지(`상`/`하`) · 상세에 상하한가 · 기준가 줄 | Must | 완료(S3) |
| FR-44 | 종목 상태 배지: 거래정지 · 관리종목 · 투자주의 · 투자경고 · 투자위험 · 단기과열. 거래정지면 실시간 자리 대신 마지막 체결 일시 | Must | 완료(S3) |
| FR-45 | 슬롯 밖(1분 폴링) 종목은 행에 "1분" 배지, KIS 장애 · 한도로 오래된 값은 "N분 전 시세" 배지 — `priceUpdatedAt` 기준으로 프론트가 **표시만** 한다 | Must | 완료(S3) |
| FR-46 | 상세 `/investments/[symbol]` 는 6자리 코드를 심볼로 그대로 쓴다. 차트 기간 선택에 5분봉이 누적 전이면 "N 거래일치" 안내, 일봉은 백필 즉시 | Must | 완료(S3) |
| FR-47 | 종목 아이콘: KIS 는 로고를 주지 않는다 → 이니셜 배지(시장 색) 를 기본으로, 로고 소스는 Open Question. 글자만 두지 않는다 | Must | 완료(S3) — 서버가 종목마다 판정한 logo.dev 로고(키 적용 · 128px), 흐린 원본 7종목은 이니셜. FMP 제외 |
| FR-48 | 요약 띠(`MARKET_SUMMARY_SYMBOLS`) 는 코인 그대로. 국내주식 요약(코스피 · 코스닥 지수) 은 서버 env `KIS_SUMMARY_INDICES` 로 따로 — Should | Should | Draft |

### E. 지표 · 코치 판정 · 성적표 — 자산군 분리

| ID | 요구사항 | 우선 | 상태 |
|---|---|---|---|
| FR-60 | `RefreshTechnicalIndicators` 가 `assetType` 별로 돈다. 국내주식 d1 은 거래일 봉만, h1 은 정규장 5m(09:00~15:30) 만 묶는다 — 시간외 봉은 지표에 넣지 않는다 | Must | Draft |
| FR-61 | 판단 · 스냅샷 · 성적표 그룹 키에 자산군을 넣는다 — `signalType = "kr_stock.<mode>.<action>"`. 코인 기존 행은 그대로(`"<mode>.<action>"`), 읽기가 접두 없음 = crypto 로 해석. **국내주식 적중률은 국내주식 표본만** 으로 센다 | Must | Draft |
| FR-62 | `COACH_EXCLUDED` 의 `kr_stock` 해제 조건(**종목별 · 모드별**): ① 일봉 ≥ 120 거래일 ② d1 지표 존재 ③ 그 모드 · 자산군 라이브 표본(`sample_origin = live`) ≥ 20. 전까지 `reasonCode` 를 `no_realtime_data` → `insufficient_history` 로 바꾸고 현재 수치(일봉 N · 표본 N) 를 응답에 넣는다 | Must | Draft |
| FR-63 | **장기 모드(30일) 부터** 연다. 단타 모드(채점 24시간) 는 주식에선 다음 거래일로 넘어가 의미가 다르다 — 단타 해제는 Open Question 이 닫힌 뒤 | Must | Draft |
| FR-64 | 채점 종가 조회는 거래일 기준 — 30일 뒤가 휴장이면 **직전 거래일 종가**. 왕복 수수료는 국내주식 값(위탁 수수료 + 매도 거래세 · 서버 상수 아닌 env `KR_STOCK_ROUND_TRIP_FEE_RATE`) | Must | Draft |
| FR-65 | 성적표 화면(성적 · 기저율 · 초과 적중률) 에 자산군 라벨 — 코인 성적 옆에 국내주식 성적을 나란히, 합산 숫자 없음 | Must | Draft |
| FR-66 | 재료가 1 거래일 넘게 오래됐으면(`priceUpdatedAt` · 마지막 일봉) 판단을 `stale_data` 로 막는다 — 3종 세트 게이트 앞단 | Must | Draft |

### F. 전망(`salt-forecast`) 확장 — 별도 슬라이스

| ID | 요구사항 | 우선 | 상태 |
|---|---|---|---|
| FR-80 | Python 은 KIS 를 직접 부르지 않는다 — 키 보유처를 한 곳으로. 서버가 채운 `price_history(kr_stock, 1d)` 를 읽어 `forecast` 스키마로 옮긴다. `available_at = 거래일 15:30 KST + 30분`(장 마감 정정 여유) | Must | Draft |
| FR-81 | 주 격자는 **주 첫 거래일** as_of(월요일 휴장이면 화요일). 기간 1~4주는 거래일 5 · 10 · 15 · 20일로 환산. `MarketHoliday` 를 같이 읽는다 | Must | Draft |
| FR-82 | 보정 · 채점 풀은 `kr_stock` 만으로 따로. 코인 풀과 섞지 않는다. 기준 모델 · 게이트 · `v_forecast_card` 계약은 F008 그대로 | Must | Draft |
| FR-83 | 화면은 F008 변동 범위 카드 재사용 — 소유자 전용 · 3종 세트. 국내주식 백테스트 라벨 · 라이브 52주 전 규칙 동일 | Must | Draft |

### G. 장애 · 한도 초과 degrade

| ID | 요구사항 | 우선 | 상태 |
|---|---|---|---|
| FR-90 | KIS REST 5회 연속 실패 → 그 작업 5분 정지(서킷). 응답은 마지막 저장값 + `stale: true` · `priceUpdatedAt`. 화면은 FR-45 배지. **빈 값으로 덮어쓰지 않는다** | Must | 완료(S0·1) |
| FR-91 | 한도 초과(`EGW00201`) → 작업 우선순위대로 줄인다: 실시간 유지 > 보유 · 관심 폴링 > 시총 상위 폴링 > 일봉 백필 > 부가(호가 · 투자자) | Must | Draft |
| FR-92 | 토큰 오류(401 · `EGW00121` 등) → 1회 재발급 시도, 실패면 국내주식 기능을 `degraded` 로 표시(`GET /api/market/kr/session` 에 `provider: { status, since }`) | Must | 완료(S1) |
| FR-93 | WS 30초 무응답(PINGPONG 누락) → 재접속. 재접속 3회 실패 → 슬롯 종목도 1분 폴링으로 내려간다 | Must | 완료(S0·1) |
| FR-94 | 관측: 작업별 호출 수 · 실패 수 · 429 수 · 토큰 발급 횟수(일) · WS 재접속 수 · 유니버스 크기 · 마지막 성공 시각을 로그 지표로. 토큰 발급이 하루 3회를 넘으면 경고 | Must | 완료(S1 — 로그) |

## 비기능 요구사항

| 구분 | 요구사항 |
|---|---|
| 성능 | 시장표(국내주식 50 행) 서버 p95 < 80ms(저장값 읽기, KIS 동기 호출 0건). 실시간 체결 → 화면 반영 < 1s(정규장). 일봉 백필 유니버스 100종목 < 5분 |
| 한도 | 우리 상한 6 req/s(한도의 30%). 정규장 정상 부하 ≤ 150 req/min(§서버 예산표). 어떤 상황에서도 20 req/s 를 넘기지 않는다(페이서가 강제) |
| 보안 | 키는 `salt-server` env 만. 토큰 · 승인키는 DB 캐시(평문, 소유자 1인 운영 — 암호화는 Open Question). BFF · FE 요청 · 응답에 KIS 원문 헤더 0건. 주문 TR 0건(FR-3 테스트) |
| 장애 처리 | FR-90~93. KIS 장애가 코인 시세 · 코치 · 전망을 막지 않는다(작업 격리) |
| 관측성 | FR-94. 마지막 성공 시각을 `session` 응답에 노출 |
| 접근성 | 상태 배지에 텍스트(색만으로 상 · 하 · 거래정지 구분 금지). 표는 `role="table"`, 실시간 갱신은 `aria-live` 없이(초당 갱신은 스크린리더 소음) |
| 반응형 | 모바일 폭에서 표 열 우선순위: 이름 · 현재가 · 등락률 → 거래대금 · 시총은 접힘 |
| 시간대 | 모든 장 상태 · 봉 경계는 KST. 저장은 UTC, 경계 계산만 KST |

## UX 상태

- **Loading**: 표 스켈레톤 50행 · 상세 머리 스켈레톤. 장 상태 줄은 먼저 온다(저장값).
- **Empty**: 유니버스 0(키 없음) → 탭 자체가 없다. 관심 · 보유 국내주식 0 → 시총 상위만 보인다.
- **Closed / Holiday**: 표 머리 장 상태 줄 + 마지막 체결 시각. 값은 회색 아님 — 정상 값이다.
- **Stale**: FR-45 배지. `provider.status = degraded` 면 표 머리에 "시세 제공 지연 중 · {since}".
- **Halted**: 거래정지 종목 행 — 가격은 마지막 체결, 실시간 점 없음, 배지.
- **Error**: 서버 5xx → 마지막 캐시(BFF) 또는 빈 상태 + 다시 시도. 503 `kr_stock_disabled` → 탭 숨김.
- **Unauthorized**: 국내주식 시세 API 는 로그인 필수(§정책). 비회원 SEO 페이지에 국내주식 0건.
- **Success**: 정규장 실시간 점 · 체결마다 값 갱신. optimistic update 없음(읽기 전용).

## 정책과 제약

- **주문 · 계좌 API 0건**(마스터 인덱스 §6-2). 허용 목록 밖 TR 은 컴파일 · 테스트에서 막힌다. 체결통보 · 잔고 · 매수가능 · 예약주문 전부 금지.
- 금액 계산은 서버(§6-3) — 등락 금액 · 시총 원 환산(억 → 원) · 호가 단위 · 상하한가 여부 전부 서버 필드. 프론트 상수 금지(메모리 규칙 "요약은 서버 소유").
- 추천 3종 세트 · 확신 표현 0건 · 소유자 전용 전망 — 코인과 같은 게이트, 표본만 분리.
- **시세 재배포**: KIS 시세는 KRX 정보이용 약관 아래 있고 제3자 재배포 · 파생 제공이 제한된다(§KIS 사실). 이 앱은 초대제(최대 10명) 로 로그인 사용자에게만 보인다. **공개 SEO 페이지 · 비회원 응답에 국내주식 시세를 넣지 않는다.** 약관 해석이 확정될 때까지 소유자 외 사용자 노출 여부는 Open Question — 기본은 **소유자 전용으로 시작**(전망과 같은 `FORECAST_OWNER_EMAILS` 판정 재사용).
- 참고 앱 이름은 문서 · 코드 · 커밋에 쓰지 않는다. 한국투자증권 · KIS 는 연동 대상이라 예외.
- 거래는 수동 입력 — 통제 · 차단 없음. 호가 단위 · 거래정지 는 **안내**지 입력 차단이 아니다.
- 탭 · 진입점은 `/investments`. 홈에 국내주식 진입점을 달지 않는다.

## KIS Open API 사실 (근거 등급)

등급 — **[공식]** KIS 포털 · 공식 GitHub(`koreainvestment/open-trading-api`) 원문 · **[실측]** 2026-09-27 우리 프로브 · **[중]** 유명 라이브러리 · 복수 출처 일치 · **[약]** 단일 출처 · 사전 지식(포털이 JS 렌더링이라 이번 조사에서 본문을 못 읽었다). **[약] 항목은 슬라이스 0 착수 전 포털 문서에서 재확인한다.**

| 주제 | 사실 | 등급 | 출처 |
|---|---|---|---|
| 도메인 | 실전 REST `https://openapi.koreainvestment.com:9443` · WS `ws://ops.koreainvestment.com:21000`, 모의 REST `:29443`(`openapivts`) · WS `:31000` | [공식] · [실측] | `examples_llm/kis_auth.py` · `legacy/websocket/python/ws_domestic_overseas_all.py` |
| 인증 | `POST /oauth2/tokenP` → `access_token` · `access_token_token_expired`(만료 일시). 헤더 `authorization: Bearer` · `appkey` · `appsecret` · `tr_id` · `custtype: P` · 연속조회 `tr_cont` | [공식] · [실측] | `kis_auth.py` |
| 토큰 한도 | "접근토큰은 **1분당 1회** 발급" (README). 공식 샘플은 토큰을 `~/KIS/config/KIS{YYYYMMDD}` 파일에 날짜별로 캐시하고 만료 전이면 재사용 | [공식] | https://github.com/koreainvestment/open-trading-api README · `kis_auth.py` |
| 토큰 유효 | 24시간 유효(`expires_in: 86400`) · 1일 1회 발급 권장 · 재발급 제한 오류 `EGW00133` · 폐기 `POST /oauth2/revokeP` · 6시간 내 재요청은 같은 토큰 반환(설) | [약] | 포털 "접근토큰발급(P)" — 미확인 |
| REST 한도 | 초당 건수 초과 오류 **`EGW00201`**. README "모의투자 계좌는 REST 호출 제한이 낮다". 공식 샘플 슬립 실전 `0.05s`(≈ 20건/s) · 모의 `0.5s`(≈ 2건/s) | [공식](코드) | README · `kis_auth.py` `_smartSleep` |
| REST 한도 수치 | 실전 20건/s · 모의 2건/s, **앱 키 단위**. 분당 · 일당 총량 제한은 문서에 없음 | [실측](반증) | 2026-10-07 경합 없는 상태에서 동시 1~6 · 1.8~10건/s 전부 **처리량 약 2건/s** 에서 막힘 — 모의 한도와 같다. 휴장일 거부 메시지("모의투자 앱키")와 함께 **이 앱 키가 모의투자용일 가능성** — 포털 확인 필요 |
| 장 마감 분봉 · 일봉 | 15:20~15:30 체결 없음(동시호가) · **15:30 에 종가 단일가 1분봉 하나**(10/6 삼성전자 142만 주). 그 15:30 1분봉은 장 마감 직후(15:38 · 15:57)에는 일별 분봉 TR 에 없었고 16:2x 에는 있었다 · 같은 시각 일봉 당일 종가(270,000)가 15:30 체결가(268,500)와 달랐다 — 당일 값 확정이 늦다 | [실측] | 2026-10-07 |
| API 별 권고 | 휴장일 조회(`CTCA0903R`)는 "가급적 **1일 1회** 호출" — API 별 빈도 권고가 따로 있다 | [공식] | `examples_llm/domestic_stock/chk_holiday/chk_holiday.py` |
| WS 승인 | `POST /oauth2/Approval` → `approval_key`. 구독 `{"header":{approval_key, custtype:"P", tr_type:"1"(등록)｜"2"(해제)}, "body":{"input":{tr_id, tr_key}}}`. 신규 예제 주석은 해제를 `"0"` 으로 적어 두 곳이 불일치 — 실측 | [공식] · [실측](등록) | `legacy/...all.py` · `examples_llm/domestic_stock/ccnl_total/ccnl_total.py` |
| WS keepalive | 서버가 `PINGPONG` 프레임을 보내면 같은 데이터로 pong | [공식] | `legacy/...all.py` |
| WS 한도 | 세션당 등록 **41건**(체결 + 호가 합산) · 앱 키당 세션 1개 | [실측] | 2026-10-07 41건 `SUBSCRIBE SUCCESS` · 42 · 43번째 `OPSP0008 MAX SUBSCRIBE OVER` |
| WS TR | `H0STCNT0` 체결(KRX) · `H0STASP0` 호가(KRX) · `H0STANC0` 예상체결 · `H0STOUP0` 시간외 체결 · `H0STOAA0` 시간외 호가 · 통합(KRX+NXT) `H0UNCNT0`. 체결통보 `H0STCNI0`(실전) · `H0STCNI9`(모의) 는 AES 암호화 · **우리는 쓰지 않는다** | [공식] | 위 파일 · `examples_llm/domestic_stock/` 목록 |
| WS 체결 레이아웃 | 구분자 **`^`**. `H0STCNT0` 필드: `MKSC_SHRN_ISCD(0)` · `STCK_CNTG_HOUR(1)` · `STCK_PRPR(2)` · `PRDY_VRSS_SIGN(3)` · `PRDY_VRSS(4)` · `PRDY_CTRT(5)` … `CNTG_VOL(12)` · `ACML_VOL(13)` · `ACML_TR_PBMN(14)` … `BSOP_DATE(33)` · `NEW_MKOP_CLS_CODE(34, 장운영구분)` · `TRHT_YN(35, 거래정지)` … `HOUR_CLS_CODE(43)` · `VI_STND_PRC`. 문서 "45개" 인데 이름은 46개 — 인덱스는 실측 확정. 한 프레임에 여러 건(`0｜H0STCNT0｜00N｜…`). 통합 `H0UNCNT0` 은 48개 | [공식] | `examples_llm/domestic_stock/ccnl_krx/ccnl_krx.py` · `ccnl_total.py` |
| 현재가 | `FHKST01010100` `GET /uapi/domestic-stock/v1/quotations/inquire-price`, `FID_COND_MRKT_DIV_CODE` = `J`(KRX) · `NX`(NXT) · `UN`(통합), ETN 은 코드 앞 `Q`. 응답에 `stck_prpr` · `prdy_ctrt` · `acml_vol` · `hts_avls`(시총, 억원) 확인 | [공식] · [실측] | `examples_llm/domestic_stock/inquire_price/inquire_price.py` · 프로브 |
| 현재가 필드(나머지) | `prdy_vrss` · `prdy_vrss_sign`(1 상한 2 상승 3 보합 4 하한 5 하락) · `acml_tr_pbmn` · `stck_mxpr`/`stck_llam`(상 · 하한가) · `stck_sdpr`(기준가) · `per` · `pbr` · `eps` · `bps` · `w52_hgpr`/`w52_lwpr` · `hts_frgn_ehrt`(외국인 소진율) · `temp_stop_yn` · `mrkt_warn_cls_code`(00 없음 01 주의 02 경고 03 위험) · `iscd_stat_cls_code`(51 관리 52 투자위험 53 투자경고 54 투자주의 55 신용가능 57 증거금100% 58 거래정지 59 단기과열) · `sltr_yn`(정리매매) | [약] | 포털 API 문서 — 미확인(공식 샘플엔 출력 필드 문서 없음) |
| 기간별 시세 | `FHKST03010100` `inquire-daily-itemchartprice` — `FID_PERIOD_DIV_CODE` D/W/M/Y · `FID_ORG_ADJ_PRC` 0 = 수정주가 1 = 원주가 · `FID_INPUT_DATE_1/2` · **한 번에 최대 100건** | [공식] | `examples_llm/domestic_stock/inquire_daily_itemchartprice/…py` |
| 당일 분봉 | `FHKST03010200` `inquire-time-itemchartprice` — **최대 30건 · 당일 분봉만(전일 미제공)** · `FID_INPUT_HOUR_1` | [공식] | `…/inquire_time_itemchartprice/…py` |
| 일별 분봉 | `FHKST03010230` `inquire-time-dailychartprice` — `FID_INPUT_DATE_1` · `FID_INPUT_HOUR_1` · **최대 120건 · 최대 1년 보관** · `FID_FAKE_TICK_INCU_YN`. → 5분봉 백필은 이 TR 로 최대 1년까지 가능하다(FR-21 의 "당일만" 은 30건 TR 이야기, 이 TR 로 보정 · 백필한다) | [공식] | `…/inquire_time_dailychartprice/…py` |
| 일자별 시세 | `FHKST01010400` `inquire-daily-price`(30건) | [공식](폴더) · [약](건수) | 디렉터리 |
| 호가 | `FHKST01010200` `inquire-asking-price-exp-ccn` | [공식](폴더) · [약](tr_id) | 디렉터리 |
| 투자자별 | `FHKST01010900` `inquire-investor` | [공식](폴더) · [약](tr_id) | 디렉터리 |
| 업종 지수 | `FHPUP02100000` `inquire-index-price` · `FHPUP02120000` `inquire-index-daily-price` | [공식](폴더) · [약](tr_id) | 디렉터리 |
| 휴장일 | `CTCA0903R` `GET /uapi/domestic-stock/v1/quotations/chk-holiday` — `BASS_DT` · 연속키 `CTX_AREA_NK/FK` · 영업일 · 거래일 · 개장일 · 결제일 여부. **2026-10-07 이 앱 키로 `EGW02004`("실전투자 도메인은 모의투자 앱키로 호출할 수 없습니다") 거부** — 같은 키로 현재가 · 일봉 · 분봉 · WS 는 된다. `tr_cont` 헤더와 무관 | [공식] · [실측](거부) | `chk_holiday.py` · 슬라이스 0 |
| 오류 응답 | KIS 는 업무 오류도 **HTTP 500** + `rt_cd != "0"` · `msg_cd` 로 준다(`EGW02004` · `EGW00201` 둘 다 500) | [실측] | 슬라이스 0 |
| 당일 분봉 | `FHKST03010200` 1분봉 30건 — 우리 5분 집계와 종가 대조 10종목 30봉 차이 0.0000% | [실측] | 슬라이스 1 |
| 시간외 단일가 | `FHPST02300000` `inquire-overtime-price` | [공식] | `…/inquire_overtime_price/…py` |
| 순위 | 거래량 순위 `FHPST01710000` `volume-rank` · 시총 상위 `FHPST01740000` `/ranking/market-cap` — 공식 예제 폴더에 **없음**. 확인 전엔 시총 상위 N 을 **마스터 파일의 상장주식수 × 기준가**로 우리가 계산한다 | [약] | 미확인 |
| 종목 마스터 | `https://new.real.download.dws.co.kr/common/master/kospi_code.mst.zip` · `kosdaq_code.mst.zip`, `cp949`, 앞부분(단축코드 · 표준코드 · 한글명) + 뒤 228바이트 고정폭 65필드(그룹 · 시총규모 · 업종 · KOSPI200 · **거래정지 · 관리종목 · 시장경고** · 기준가 · 상장주수 · 액면가 · PER/PBR/EPS …). 갱신 주기 미문서(매 영업일 장전으로 알려짐) | [공식](파서) · [약](갱신 주기) | `stocks_info/kis_kospi_code_mst.py` |
| NXT | 시세 REST · WS 에 `NX` · `UN`(통합) 옵션이 있다 — 넥스트레이드 가격이 노출된다. 프리 08:00~08:50 · 애프터 15:30~20:00 | [공식](옵션) · [약](시간) | `inquire_price.py` · `ccnl_total.py` |
| 장 시간 | 정규장 09:00~15:30 · 장전 동시호가 08:30~09:00 · 장마감 동시호가 15:20~15:30 · 장후 시간외종가 15:40~16:00 · 시간외 단일가 16:00~18:00(10분 단위) | [약] | KRX 규정 — 이번 조사 미확인 |
| 호가 단위 · 가격제한 | 2023-01-25 개편: < 2,000원 1원 · 2,000~5,000 5원 · 5,000~20,000 10원 · 20,000~50,000 50원 · 50,000~200,000 100원 · 200,000~500,000 500원 · ≥ 500,000 1,000원. 가격제한폭 ±30% | [약] | KRX 규정 — 미확인 |
| 이용 조건 | 앱 키 발급에 한국투자증권 **계좌 + HTS ID 가 필요**(설정에 계좌 8+2 자리 필수). 조회만 해도 계좌는 있어야 한다 — 우리는 계좌 번호를 **서버 설정에도 넣지 않는다**(조회 TR 은 계좌 번호가 필요 없다) | [공식] | README · `kis_auth.py` |
| 재배포 약관 | 시세 재배포 · 제3자 제공 금지, KRX 정보이용계약 필요 여부, 소유자 외 초대 사용자에게 보여도 되는지 — **원문 미확인**. 알려진 바로는 "본인 투자 목적" 만 허용 | [약] | 포털 약관 — 미확인. **Open Question 1** |
| 주문 TR(차단용) | 규약: `tr_id` 가 **`U` 로 끝나면 주문 · 등록**, `R` 은 조회. 현금 매수 `TTTC0012U`(구 `TTTC0802U`) · 매도 `TTTC0011U`(구 `TTTC0801U`) · 정정취소 `TTTC0013U` · 잔고 `TTTC8434R` · 매수가능 `TTTC8908R`, 모의 `VTTC*`, 해외 `TTTT*`/`VTTT*`. → FR-3 허용 목록은 `FH*` · `CTCA*` · `H0*`(체결통보 `H0STCNI*` 제외) 만, **`U` 로 끝나는 TR 은 전부 차단** | [중](규약) · [약](개별 ID) | 공식 GitHub 전반 |
| 라이브러리 | `python-kis`(MIT, 2.1.3, 시세 전용 사용 가능 · 토큰 저장) · `pykis`(Apache-2.0, 비공식). 우리는 TypeScript 서버라 **직접 구현**, 참고만 | [중] | https://github.com/Soju06/python-kis · https://github.com/pjueon/pykis |
| 공식 레포 라이선스 | `koreainvestment/open-trading-api` 에 LICENSE 파일 없음(404) — 코드 복사 금지, 구조 참고만 | [공식] | https://github.com/koreainvestment/open-trading-api |

이번 조사에서 **못 연 것**: 포털 API 문서 · FAQ · 약관 원문(JS 렌더링). 위 [약] 전부가 그 안에 있다. 슬라이스 0 착수 전 사용자가 로그인한 브라우저로 원문을 확인해 이 표의 등급을 올린다.

## 화면/프론트엔드 영향

| App | Route/Component | 변경 내용 |
|---|---|---|
| `apps/web` | `/investments` `widgets/market-board` | 자산군 탭 · 국내주식 표 · 장 상태 줄 · 상태 배지 · "1분" · "N분 전" 배지 |
| `apps/web` | `/investments/[symbol]` `widgets/symbol-analysis` | 6자리 코드 라우트 · 상하한가 · 기준가 · 종목 상태 · 호가(Should) · 투자자(Should) · 5분봉 누적 안내 |
| `apps/web` | `entities/market` | `KrStockQuote` 타입 · 세션 · 이니셜 아이콘 · 원화 정수 포맷터(표시만) |
| `apps/web` | `features/manage-watchlist` · `features/record-transaction` | 종목 검색(마스터) · 자산군 `kr_stock` · 호가 단위 안내 |
| `apps/web` | `entities/coach` messages | `insufficient_history` · `stale_data` 문구, 성적표 자산군 라벨 |
| `apps/mobile` | — | 이번 범위 밖(웹 계약 확정 뒤) |

영역 REQ: `FE-REQ-041-F011-KR-STOCK`. FSD 슬라이스 이름은 서버 컨텍스트 `market` 과 같다.

## BFF/API 영향

서버 `/api/market/kr/*` ↔ BFF `/api/app/market/kr/*`. BFF 는 뷰모델 조립 · 인증만, 재계산 없음. **캐시 없음**(2026-10-08 정정 — 초안은 정규장 1s · 그 외 60s. 응답이 소유자 판정에 걸려 공유 캐시는 비소유자에게 새고 토큰별 캐시는 히트가 없다. 서버가 저장값을 80ms 안에 준다). 모든 BFF 응답 `data` 는 `status: ok｜disabled(키 없음 → 탭 숨김)｜unavailable` 을 단다. 404(소유자 아님)는 그대로(`BFF-REQ-040`).

| Method | 서버 Path | BFF Path | Auth | Request | Response | Status |
|---|---|---|---|---|---|---|
| GET | `/api/market/kr/session` | `/api/app/market/kr/session` | 필수 | — | `{ session, now, lastCloseAt, nextOpenAt, calendarKnown, provider: { status, since, lastSuccessAt, realtime: { state, lastTickAt } } }` — 휴장 사유 이름은 아직 없다 | 완료(S2) |
| GET | `/api/market/kr/assets?limit=50&offset=` | `/api/app/market/kr/overview` | 필수 | `limit`(≤100) · `offset` — 정렬은 시총 고정 | `{ session, items: KrStockQuote[], nextOffset }` — 종목마다 `code · name · market · price · change · changeRate · volume(문자열) · tradeValue · marketCap · upperLimit · lowerLimit · basePrice · limitState · status[] · isHalted · feed: "realtime"｜"poll_1m"｜"stale" · priceUpdatedAt` | 완료(S2) |
| GET | `/api/market/kr/:code` | `/api/app/market/kr/:code` | 필수 | — | `{ session, quote: KrStockQuote, detail: { per, pbr, eps, bps, week52High, week52Low, foreignRate, tickSize } }` — `afterHours` 는 슬라이스 6 | 완료(S2) |
| GET | `/api/market/kr/:code/chart?period=1d｜5m&count=` | `/api/app/market/kr/:code/chart` | 필수 | 기간(1h 는 서버에 없다) · `count` ≤500 | `{ period, candles[], coverage: { from, to, tradingDays } }` | 완료(S2) |
| GET | `/api/market/kr/:code/orderbook` | `/api/app/market/kr/:code/orderbook` | 필수 | — | `{ asks[10], bids[10], totalAsk, totalBid, at }` | Should |
| GET | `/api/market/kr/:code/investors?days=20` | `/api/app/market/kr/:code/investors` | 필수 | — | `{ rows: [{ date, foreign, institution, individual }] }` | Should |
| GET | `/api/market/kr/search?q=` | `/api/app/market/kr/search` | 필수 | `q`(2자 이상) | `{ items: [{ code, name, market, inUniverse }] }` 최대 20 | 완료(S2) |
| GET | `/api/market/kr/stream` (SSE) | — (BFF 가 **WS 연결마다** 그 연결의 토큰으로 소비 → WS `price_update`) | 사용자 JWT · 소유자 | — | `event: status` 1회 · `event: tick` `[{ code, price, change, changeRate, volume, at }]` · 15초 하트비트 | 완료(S1 · S2) |
| POST | `/api/investment/watchlist` (기존) | 기존 | 필수 | `assetType: "kr_stock"` 허용 | 기존 | 변경 |
| GET | `/api/coach/detail` (기존) | 기존 | 필수 | — | `excluded[].reasonCode` 에 `insufficient_history` · `stale_data`, `progress: { dailyBars, liveSamples }` | 변경 |

WS `price_update` 메시지에 `assetType` 필드 추가(코인 `crypto` 기본) — 기존 소비처는 무시해도 깨지지 않는다. 국내 주식 구독은 `{ type: "subscribe", assetType: "kr_stock", symbols: ["005930"], token }` — 소유자 판정이 연결마다 필요해 토큰을 메시지에 싣는다(브라우저 WS 는 헤더를 못 단다 · 만료 뒤 새 토큰으로 다시 구독). 체결 `data` 는 `{ assetType, symbol, currentPrice, change24h(전일 대비 %), change24hAmount, timestamp }` · 500ms 묶음. 거부는 `error { assetType: "kr_stock", code }`(`KR_STOCK_NOT_AVAILABLE` · `KR_STOCK_DISABLED` · `HTTP_401` · `KR_STREAM_LIMIT`).

영역 REQ: `BFF-REQ-040-F011-KR-STOCK`.

## 서버/DB/Worker 영향

| Layer | 위치 | 영향 |
|---|---|---|
| Server | `market/infrastructure/KisClient.ts` · `KisRealtimeClient.ts` · `KisMasterFile.ts` | REST(허용 TR 만) · WS · `.mst` 파서. 페이서 · 서킷 · 마스킹 |
| Server | `market/application/SyncKrStockMaster.ts` · `SyncKrStockCandles.ts` · `PollKrStockQuotes.ts` · `AggregateKrMinuteBars.ts` · `ComputeKrMarketSession.ts` | 마스터 · 일봉 백필 · 폴링 · 5분 집계 · 장 상태 |
| Server | `market/presentation/krStock.routes.ts` | `/api/market/kr/*` |
| Server | `coach/domain/policy/coachDetail.ts` · `signalPerformance.ts` · `recommendationJudgment.ts` | `COACH_EXCLUDED` 조건부 · `signalType` 접두 · 거래일 채점 · 수수료 env |
| Server | `shared/config/env.ts` | `KIS_UNIVERSE_TOP_N` · `KR_STOCK_ROUND_TRIP_FEE_RATE` · `KIS_SUMMARY_INDICES`(Should) |
| DB | `AssetType` enum | `kr_stock` 값 추가(`ADD VALUE` — Postgres 에서 되돌릴 수 없다, 롤백은 미사용 상태로 두는 것). 기존 `stock` 은 미국 주식 의미 유지. Shared Kernel 세 값과 맞춘다 |
| DB | 신규 `KrStockMaster` | `code`(PK, 6자리) · `name` · `market`(KOSPI｜KOSDAQ) · `sectorCode` · `sharesOutstanding` · `isAdministrative` · `isHalted` · `warnLevel` · `listedAt` · `delistedAt` · `syncedAt`. index `(market, isHalted)` · 이름 trigram(검색) |
| DB | `MarketAsset` 확장(nullable) | `basePrice` · `upperLimit` · `lowerLimit` · `marketCap` · `statusCode` · `isHalted` · `feed` · `afterHoursPrice` · `afterHoursAt`. `symbol` = 6자리 코드, `market` = KOSPI｜KOSDAQ, `assetType = kr_stock`. 코인 24h 필드는 국내주식에서 null |
| DB | `PriceHistory` · `TechnicalIndicator` | 재사용. `assetType = kr_stock`, timeframe `5m` · `1d`(+ 지표 `h1` · `d1`). unique 키 그대로 |
| DB | 신규 `ExternalApiToken` | `provider`(PK) · `tokenType`(access｜approval) · `token` · `issuedAt` · `expiresAt`. 재시작이 발급을 늘리지 않는다 |
| DB | 신규 `MarketHoliday` | `market`("KRX") · `date`(PK 복합) · `name` · `source`. 전망(`salt-forecast`) 이 읽는다 |
| DB | `CoachRecommendationSnapshot` 등 판단 표 | 스키마 변경 없음 — `signalType` 값에 접두만. 인덱스 그대로 |
| Worker | `kr-master-sync` 07:30 KST 매일 · `kr-holiday-sync` 주 1회 + 부팅 | 멱등 upsert. 실패 시 이전 마스터 유지 |
| Worker | `kr-daily-candles` 15:45 KST 거래일 · 부팅 시 백필(빈 구간만) | 페이지네이션, 실패 지점부터 재개 |
| Worker | `kr-quote-poll` 매 1분, 08:30~18:00 KST 거래일만 | 슬롯 밖 종목. 정규장 밖엔 5분 간격으로 내린다 |
| Worker | `kr-realtime` 상주(08:30~18:00) | WS 세션 1개 · 41 슬롯 · 5분 버킷 집계 |
| Worker | `technical-indicators`(기존 2분) | `assetType` 루프 추가, 국내주식은 정규장 봉만 |

### 한도 예산 (정규장 정상 부하 · 유니버스 100종목 · WS 41)

| 작업 | 빈도 | 호출/분 |
|---|---|---|
| 슬롯 밖 현재가 폴링(59종목) | 1분 | 59 |
| 5분 버킷 보정(일별 분봉 TR) | 장 마감 후 1회/종목 | 0(장중) · 100(15:35 몰아서 · 페이서로 1분 분산) |
| 5분봉 1년 백필(일별 분봉 TR, 1분봉 120건/호출 ≈ 1거래일 = 4호출) | 최초 1회 · 야간 | 100종목 × 약 1,000호출 = 10만 호출 → 3 req/s 로 약 9시간, 며칠에 나눠서 |
| 호가(보유 ≤ 10) | 10초 | 60(Should · 켜면) |
| 투자자별(유니버스) | 일 1회 | 0(장중) |
| 일봉 확정 | 일 1회/종목 | 0(장중) |
| **합계(장중)** | | **≈ 60~120 / 분 ≈ 1~2 req/s** — 상한 6 req/s 의 1/3 |

백필(최초 1회): 100종목 × 5페이지 = 500 호출 → 6 req/s 로 약 1.5분.

영역 REQ: `SRV-REQ-040-F011-KR-STOCK` · `DB-REQ-033-F011-KR-STOCK`.

## 이벤트/상태 흐름

```
[07:30 KST] kr-master-sync → .mst 다운로드 → KrStockMaster upsert → 유니버스 재계산 → MarketAsset upsert · WS 슬롯 재배정
[08:30]     kr-realtime WS 접속(승인키) → 41 슬롯 구독 → 체결 tick
              → MarketAsset.currentPrice · 5분 버킷 → SSE /api/market/kr/stream → BFF → WS price_update → 화면
[매 1분]    kr-quote-poll(슬롯 밖) → inquire-price → MarketAsset 갱신(feed = poll_1m)
[15:30]     session = closed(정규장) → 15:35 당일 분봉 조회로 5m 버킷 보정 → 15:45 일봉 확정 → 지표 d1 · h1 갱신
[16:00~18]  시간외 단일가 → afterHours 필드만
[매 2분]    technical-indicators(kr_stock) → 코치 판단 재료
[코치 요청] COACH_EXCLUDED 조건 판정(일봉 · 지표 · 표본) → 통과면 장기 모드 판단 → signalType "kr_stock.long_term.<action>"
[전망 배치] salt-forecast ← price_history(kr_stock, 1d) + MarketHoliday → 주 첫 거래일 격자 → forecast(kr_stock 풀)
[장애]      429/5xx → 서킷 → stale 응답 · 배지 → 우선순위대로 축소(FR-91)
```

## Trace Matrix

| 요구사항 | 화면/컴포넌트 | BFF/API | 서버/API | DB/Worker | 검증 |
|---|---|---|---|---|---|
| FR-1~6 | — | — | `KisClient` · `ExternalApiToken` | `ExternalApiToken` / 토큰 갱신 | 허용 TR 테스트 · 마스킹 테스트 · 키 없이 기동 |
| FR-10~14 | `features/manage-watchlist` 검색 | `/api/app/market/kr/search` | `/api/market/kr/search` | `KrStockMaster` · `MarketHoliday` / `kr-master-sync` · `kr-holiday-sync` | 재실행 행 수 동일 · 검색 p95 |
| FR-20~29 | 차트 · 상세 | `/api/app/market/kr/:code/chart` · WS | `/api/market/kr/:code/chart` · `/stream` | `PriceHistory` / `kr-daily-candles` · `kr-realtime` · `kr-quote-poll` | 백필 개수 · 5m 버킷 vs KIS 당일 분봉 대조 · 한도 로그 |
| FR-40~48 | `widgets/market-board` · `symbol-analysis` | `/api/app/market/kr/overview` · `/:code` | `/api/market/kr/assets` · `/:code` · `/session` | `MarketAsset` 확장 | Playwright route(정규장 · 폐장 · 거래정지 · stale) |
| FR-60~66 | 코치 상세 · 성적표 | 기존 `/api/app/ai-coach/detail` | `coachDetail` · `signalPerformance` | `TechnicalIndicator` · 판단 표 `signalType` 접두 | 해제 조건 단위 테스트 · 표본 분리 테스트 · 거래일 채점 테스트 |
| FR-80~83 | F008 변동 범위 카드 | 기존 | 기존 `/api/coach/forecast` | `forecast.*`(kr_stock 풀) / Python 배치 | 워크포워드 리포트(kr_stock) · 휴장 주 격자 테스트 |
| FR-90~94 | 배지 · 지연 줄 | `session.provider` | 서킷 · 페이서 | 로그 지표 | KIS 목 서버로 429 · 5xx · WS 끊김 시나리오 |

## 수용 기준

- [ ] 레포 전체에 주문 · 계좌 TR ID(`TTTC*` · `VTTC*` · `TTTS*` · `CTSC*`) 문자열 0건, `KisClient` 허용 목록 밖 TR 호출이 테스트에서 실패한다
- [ ] BFF · FE · `salt-forecast` 소스 · 로그에 `KIS_APP_KEY` · `appsecret` · 토큰 값 0건(grep + 로그 스냅샷)
- [ ] 서버 재시작 5회에 토큰 발급 1회(`ExternalApiToken` 재사용)
- [ ] 정규장 30분 실측에서 초당 호출 최대값 ≤ 6, 429 0건
- [ ] 유니버스 100종목 일봉 2년 백필 후 `PriceHistory(kr_stock, 1d)` 종목당 ≥ 480행, 휴장일 행 0건
- [ ] 5m 버킷과 KIS 당일 분봉의 종가 불일치 ≤ 0.1%(표본 10종목 × 1일)
- [ ] 21:00 KST 조회 시 `session = closed` · `lastTradeAt` 이 15:30 봉, 휴장일엔 `holiday` + 이름
- [ ] 거래정지 · 관리종목 · 상한가 종목이 배지와 함께 렌더되고 색만으로 구분하지 않는다
- [ ] 비회원 · 공개 SEO 응답에 국내주식 시세 0건. 소유자 전용 시작 시 비소유자 응답에 `kr` 항목 자체가 없다
- [ ] 코치 상세 — 조건 미달 종목은 `insufficient_history` + 수치, 충족 종목은 장기 모드 판단 + 3종 세트(국내주식 표본만). 코인 적중률 숫자가 변하지 않는다(회귀)
- [ ] KIS 목 서버 429 · 5xx · WS 끊김 시나리오에서 마지막 값 유지 · `stale` 배지 · 코인 시세 영향 0
- [ ] 키 없이 기동 → 워커 미등록 · `/api/market/kr/*` 503 · 탭 없음
- [ ] 마스터 인덱스 §6 공통 기준 전부(주문 경로 0 · 금액 서버 · 3종 · 확신 0 · 원장 3종 row 보존)

## 검증 계획

- 서버: `KisClient` 단위 테스트(허용 TR · 페이서 · 마스킹 · 토큰 캐시), KIS 목 서버(recorded fixtures) 로 degrade 시나리오, 거래일 채점 · `COACH_EXCLUDED` 조건 테스트, 기존 코인 성적표 스냅샷 회귀
- DB: 마이그레이션 up · `kr_stock` enum 값 추가 후 기존 `stock` 행 영향 0(count 비교), 원장 3종 row 보존
- 실측(정규장 1일): 호출/초 로그 · WS 재접속 수 · 5m 버킷 대조 · 체결 → 화면 지연
- BFF: 계약 테스트(`KrStockQuote` 모양 · 비소유자 필드 없음 · 캐시 TTL)
- FE: Playwright route 목으로 정규장 · 폐장 · 휴장 · 거래정지 · stale · 키 없음 6상태, 축소 모션 · 키보드 탭 이동
- Python: 휴장 주 격자 단위 테스트 · kr_stock 풀 워크포워드 리포트(코인 풀 수치 변화 0)

## Open Questions

- **재배포 약관 해석** — KIS 시세를 초대제 사용자 10명에게 보여도 되는가, 소유자 1인만인가. 확정 전 기본 = 소유자 전용. 닫히는 시점: 약관 원문 · 고객센터 확인 뒤(슬라이스 1 전)
- `AssetType` enum 에 `kr_stock` 을 더할지, `stock` 을 국내로 재해석하고 미국은 나중에 `us_stock` 을 더할지. 기본 = `kr_stock` 추가(Shared Kernel 과 일치, `toDetailAssetType` 의 `stock = 미국` 가정을 깨지 않음). `DB-REQ-003` 미결 사항을 여기서 닫는다
- WS 동시 등록 41건이 세션당인지 앱 키당인지, 세션 2개가 허용되는지 — 리서치 등급 [중]. 슬라이스 1 실측으로 닫는다
- 단타 모드(24시간 채점) 를 국내주식에 열 것인가 — 다음 거래일 같은 시각 채점으로 정의를 바꿀지, 장중 6.5시간 채점을 새 모드로 둘지. 장기 모드 라이브 표본이 쌓인 뒤
- 종목 로고 소스 — KIS 는 주지 않는다. 이니셜 배지로 시작(슬라이스 3). 2026-10-08 조사: ① 캐시 · 자체 호스팅을 약관이 허용하는 로고 API(무료 키 필요, 국내 코드 미검증) ② 키 없는 공개 이미지(15/15 코드 확인, 재사용 조건 불명확 — 소유자 전용엔 무난) ③ 국내 증권 · 포털 앱 이미지 서버는 **사용 금지**(허락 없는 자산). **2026-10-08 닫힘**: ① logo.dev(키 적용)만 쓰고 종목마다 선명도를 판정해 흐린 원본은 이니셜(`SRV-REQ-040` FR-32). ② FMP 는 엉뚱한 이미지(LS 에 건물 사진)로 제외. DART 도메인 조회는 사용자가 하지 않기로 — 흐린 7종목은 이니셜로 둔다
- 토큰 · 승인키 DB 평문 저장 — 소유자 1인 운영이라 허용하는지, `pgcrypto` 로 감쌀지
- 상세 라우트가 6자리 코드(`/investments/005930`)면 코인 티커와 한 라우트에서 자산군을 어떻게 판별하나 — 기본: 숫자 6자리 = 국내주식(서버 `MarketAsset.assetType` 이 진실, 프론트는 조회 결과로 분기)
- 넥스트레이드(대체거래소) 프리 · 애프터마켓 시세를 KIS 가 어떤 TR 로 주는지 — 확인 전엔 KRX 정규장만. 통합 시세(`UN`) 를 쓰면 등락률 기준이 달라진다
- 수정주가 vs 원주가 — 일봉은 수정주가로 받아 지표 · 전망에 쓰고, 화면 "그날 실제 가격" 은 원주가가 맞다. 둘 다 저장할지(열 추가) 수정주가만 둘지. 기본 = 수정주가만, 상세엔 라벨
- 투자자별 매매동향 · 업종 지수를 전망 피처로 넣는 시점 — F008 FR-54 대로 채점이 정한다. 수집만 먼저 할지(이력이 늦을수록 손실) 는 FC 슬라이스에서
- `KrStockMaster` 약 2,700행 검색 — Postgres `pg_trgm` 을 켤 것인가, 서버 메모리 인덱스로 할 것인가

## 슬라이스 순서

| # | 영역 | REQ | 내용 | 끝나면 되는 것 |
|---|---|---|---|---|
| 0 ✅ 2026-10-07 | 서버 · DB | `SRV-REQ-040-F011-KR-STOCK` · `DB-REQ-033-F011-KR-STOCK` | `KisClient`(허용 TR · 페이서 · 마스킹 · 토큰 캐시) · 마스터 · 휴장일 · 유니버스 · 일봉 백필 · 현재가 폴링 · 장 상태 · `/api/market/kr/*` 읽기 · enum `kr_stock` · 새 표 3 · `MarketAsset` 확장 | 화면 없음. DB 에 국내주식 일봉 2년 · 현재가(1분) 가 쌓인다. 주문 TR 0건 테스트가 통과한다 |
| 1 ✅ 2026-10-07 | 서버 | `SRV-REQ-040-F011-KR-STOCK` | WS 실시간 · 41 슬롯 배정 · 5분 버킷 집계 · 장 마감 보정 · SSE `/stream` · 서킷 · degrade · 관측 | 정규장에 체결이 DB 와 SSE 로 흐른다 |
| 2 | BFF | `BFF-REQ-040-F011-KR-STOCK` | `/api/app/market/kr/*` 뷰모델 · SSE 소비 → WS `price_update`(`assetType`) · 소유자 판정 통과(캐시는 버림) — **완료 2026-10-08** | 앱이 받을 계약이 선다 |
| 3 ✅ 2026-10-08 | FE · BFF · 서버 · DB | `FE-REQ-041-F011-KR-STOCK` · `BFF-REQ-040` FR-11~13 · `SRV-REQ-040` FR-29~31 · `DB-REQ-033` | 제목 아래 자산군 탭(코인 · 국내 주식) — **코인과 같은 화면, 데이터만 다르다**(표 · 필터 · 미리보기 · 관심 종목) · 장 상태 줄 · 배지 · 상세 · 차트. 계약 확장: 당일 OHLC · 정렬/기간 · 관심 종목 `kr_stock` — **완료 2026-10-08** | 사용자가 본다 |
| 3b | FE · 서버 | 각 REQ 개정 | 거래 기록 · 보유 `kr_stock`(포트폴리오 평가를 `kr_stock_quotes` 로) · 유니버스 보유 · 호가 단위 안내 · 상태 6종 화면 고정 응답 검증 · 로고 | 국내 주식 거래를 기록한다 |
| 4 | 서버 | `SRV-REQ-040-F011-KR-STOCK` | 지표 `assetType` 분리 · `signalType` 접두 · `COACH_EXCLUDED` 조건부 해제(장기) · 거래일 채점 · 수수료 env · 성적표 자산군 라벨(BFF · FE 짝) | 국내주식 코치 판단 — 표본 20 뒤 |
| 5 | Python · DB | `FC-REQ-009-F011-KR-STOCK` | `price_history` → `forecast` 적재 · 거래일 격자 · `available_at` · kr_stock 보정 · 채점 풀 · 기준 모델 | 국내주식 변동 범위(소유자 전용) — 라이브 26주 뒤 재평가 |
| 6 | 서버 · BFF · FE | 각 REQ 개정 | 호가 · 투자자별 · 시간외 단일가 · 코스피 · 코스닥 요약(Should) | 부가 정보 |

영역 REQ 파일은 각 슬라이스 착수 때 쓴다 — 지금은 번호만 예약.

## 변경 이력

| 날짜 | 변경 |
|---|---|
| 2026-10-08 | **로고 품질** — 사용자 logo.dev 키 적용 · "화질 구린것도"(64 → 128px, `0022da5`) · "lg 전자 ls electronic은 여전히 흐려"(서버 선명도 판정, 흐린 7종목 이니셜, FMP 제외, `58f0c33`). DART 도메인 조회는 사용자 결정으로 하지 않음 |
| 2026-10-08 | **슬라이스 3 후속** — 사용자 "베스트 케이스로". 로고: 서버가 주소를 정한다(logo.dev 키 → FMP, `aa9b1c3`) · BFF 통과(`ad5217a`) · `AssetIcon` 실패 시 이니셜(`996633b`) · 화면 연결(`09659d7`). 고정 응답으로 장 마감 · 휴장 · 지연 · 키 없음 · 배지 · 거래정지 상세를 확인하며 4건 수정(첫 열 넓힘 · 밤 "1분" 배지 · 지연 줄 누락 · 장 상태 줄 대비). axe 는 기존 요소 색만 남음(설계 결정 유지). 깜빡임 빈도(`f3de5c1`). `FE-REQ-041` FR-14 · 15 |
| 2026-10-08 | **슬라이스 3 완료(FE · BFF · 서버 · DB)** — 사용자 "새 브랜치 파고 다음꺼 진행". 첫 판(세 번째 탭 · 다른 열 · 검색 상자)을 보고 사용자가 "실시간 차트에 국내주식 비트코인 이렇게 탭을 나눠야" · "똑같은 ui 똑같은 인터랙션" · "위에 투자분석 아래 탭 두개" · "똑같은 화면이고 데이터만 다른거지"로 고쳤다 → `/investments` 제목 아래 자산군 탭, 탭 아래는 코인과 같은 표 · 필터 · 미리보기 · 관심 종목. 같은 화면이 되도록 계약 확장: 당일 시가/고가/저가(마이그레이션 `20261008100000_kr_stock_quote_ohlc`) · `sort`/`order`/`period`(코인과 같은 값) · `periodChange` · 관심 종목 `kr_stock`. 기획 정정: 검색 상자 없음(코인 화면에 없다, BFF `/search` 는 남김) · 국내 주식 탭엔 목표 비중 · 요약 띠 숨김 · 거래 폼은 3b. 사실 확인: 휴장일 TR 거부 문구 "실전투자 도메인은 모의투자 앱키로 호출하실 수 없습니다" — **앱 키는 모의투자용**. 로고 소스 조사(OQ). `FE-REQ-041` · 루트 `requirements/specs/in-progress/F011-slice3-fe-kr-stock-slice.md` |
| 2026-10-08 | **슬라이스 2 완료(BFF, 화면 없음)** — 사용자 "다음꺼 진행". `/api/app/market/kr/{session,overview,search,:code,:code/chart}` 뷰모델(필드를 골라 옮김 · 계약 깨짐 → `unavailable` · 키 없음 → `disabled` · 404 그대로) · WS `assetType: "kr_stock"` 구독 → 연결별 서버 SSE → 500ms 묶음 `price_update`. 기획 정정 3: BFF 캐시 버림(소유자 판정) · SSE 내부 토큰 → 연결 토큰(구독 메시지) · 필드 이름은 서버 것(`lastCloseAt` · `nextOffset` · `week52High`). `BFF-REQ-040`. 루트 `requirements/specs/in-progress/F011-slice2-bff-kr-stock-slice.md` |
| 2026-10-07 | **슬라이스 1 후속("남은 것까지")** — 5분봉 장 마감 보정 · 30일 백필(1년 → 30일 정정, 코인과 같은 보관) · `session.provider` · 10분 지표 · WS 장애 경로(가짜 서버 테스트가 degraded 버그를 잡음) · 빈 키 기동 · 42번째 등록 거부 실측 · 처리량 약 2건/s 실측(모의투자 키 가능성). 범위 밖 발견 수정: 원시 SQL 9시간(게이지 성적 · 백분위 · 보관 정리) |
| 2026-10-07 | **슬라이스 0 · 1 완료(서버 · DB, 화면 없음)** — to-do → in-progress. 사용자 요구: 다음 = 슬라이스 0 · "실시간도 워커" · "비트코인과 같은 기능" · "최적화까지". 마스터 4,400 · 일봉 50종목 × 486 · 현재가 1분(실시간 슬롯은 5분 보충) · WS 41 슬롯 · 5분봉 집계(KIS 분봉과 종가 일치) · SSE · `/api/market/kr/*`(소유자 전용). 기획 정정 4: 시세 표를 `MarketAsset` 이 아니라 `kr_stock_quotes`(코인 경로가 자산군을 안 거름) · SSE 는 내부 토큰 대신 사용자 JWT + 소유자 · 휴장일은 KIS 거부라 일봉 역산 + 오늘 관측 · 유니버스 보유는 슬라이스 3. `SRV-REQ-040` · `DB-REQ-033`. 루트 `requirements/specs/in-progress/F011-slice0-1-kis-foundation-slice.md` |
| 2026-09-27 | 초안. 사용자 KIS 앱 키 발급 · 실전 도메인 검증(토큰 · 현재가 · 승인키 · WS 구독). 결정 10건: 거래 연동 아님 · 유니버스(보유 ∪ 관심 ∪ 시총 N) · 일봉 백필 + 5분봉 자체 누적 · 자산군 분리 채점 · 장 상태 표시 · 원화 · 호가 · 상하한가 · 거래정지 표시 · `COACH_EXCLUDED` 조건부 해제(장기 먼저) · 전망은 별도 FC 슬라이스 · 키 서버 전용 · degrade 규칙. REQ 번호 예약 `SRV-040` · `DB-033` · `BFF-040` · `FE-041` · `FC-009`. F008 "국내 주식 TBA" 를 이 문서가 잇는다 |
| 2026-09-30 | **to-do 로 되돌림(REQ 정리).** 기획서와 번호 예약만 있다 — 영역 REQ 미착수 |
