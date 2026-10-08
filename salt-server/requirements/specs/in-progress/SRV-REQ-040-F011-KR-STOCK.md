---
id: SRV-REQ-040
feature: F011
area: server
kind: FUNC
title: "F011 국내 주식 — KIS 조회 연동 · 마스터 · 달력 · 일봉 · 현재가 · 실시간 체결 · /api/market/kr"
priority: high
created: 2026-10-07
source: pm/requirements/specs/in-progress/FEATURE-011-kr-stock-kis.md
---

## Summary

국내 주식을 코인처럼 보려면 서버 DB 에 시세 · 일봉 · 5분봉이 먼저 쌓여야 한다. 슬라이스 0 · 1 은 그 재료를 만든다 —
한국투자증권(KIS) Open API 를 **조회 TR 만** 부르는 클라이언트, 종목 마스터 · 개장일 달력 · 일봉 2년 · 1분 현재가 · WS 실시간 체결 ·
5분봉 집계, 그리고 저장값만 읽는 `/api/market/kr/*`. 화면은 없다(BFF 슬라이스 2 · 화면 슬라이스 3).

사용자 요구(2026-10-07): "국내 주식도 실시간 워커", "국내 주식이랑 비트코인 다 같은 기능", "최적화까지 다 해서 성능 개선".

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | `market/infrastructure/KisClient`(REST) · `KisRealtimeClient`(WS). 키는 `salt-server` env 만 | 완료(`ee38042` · `7689823`) |
| FR-2 | 접근 토큰 DB 캐시(`external_api_tokens`) · 만료 10분 전 갱신 · `EGW00133` 이면 살아 있는 토큰 재사용 · 재시작이 발급을 늘리지 않음 | 완료(`ee38042`) |
| FR-3 | 조회 TR 허용 목록(`FHKST01010100` · `FHKST03010100` · `FHKST03010200` · `CTCA0903R` · `H0STCNT0`). `U` 로 끝나는 TR · 계좌 · 체결통보 거부. 레포 전체 주문 · 계좌 TR 문자열 0건 테스트(`git grep`) | 완료 |
| FR-4 | 페이서 3건/s(`KIS_REQUESTS_PER_SECOND`, 실측 처리량 상한 약 2건/s — `89ff9d9`) · 동시 6 · `EGW00201` 만 재시도(업무 오류는 HTTP 500 이어도 재시도 안 함) · 초과 시 프로세스 감속 1→8초 | 완료 |
| FR-5 | axios 원본 오류(요청 헤더에 시크릿)를 밖으로 내보내지 않고 `KisApiError` 로 정제 · 토큰 · 키 · 승인키 마스킹 | 완료 |
| FR-6 | 키 없으면(빈 값 포함) 워커 미등록 · `/api/market/kr/*` 503 `KR_STOCK_DISABLED`(Shared Kernel `ErrorKind.Unavailable` 신설, `d6f9ce6`). 빈 값이 기동을 막던 것 수정(`89ff9d9`) | 완료 · 실측 |
| FR-10 | 종목 마스터 `.mst` 매일 07:30 KST · 4,400종목 배치 upsert · 사라진 종목 `delisted_at`. 반쪽 마스터(< 500)면 중단 | 완료 |
| FR-11 | 유니버스 = **보유 → 관심 → 주권 시총 상위 N**(`KIS_UNIVERSE_TOP_N`=50, 우선주 제외) — 보유는 `portfolio` 공개 API `heldSymbols("kr_stock")` 를 조립 지점이 넣는다(`KrHeldCodesSource`, `market` 이 `portfolio` 표를 읽지 않는다) | 완료(`422bc14`, 슬라이스 3b) |
| FR-12 | WS 41 슬롯 — 보유 → 관심 → 시총 순(슬라이스 3b). 나머지는 1분 폴링. 42번째는 `OPSP0008 MAX SUBSCRIBE OVER`(실측) → 구독에서 빼고 폴링 | 완료(`7689823`) |
| FR-13 | `GET /api/market/kr/search?q=` 마스터 전체 · 코드 접두 · 이름 부분 일치 · 시총 순 20건 | 완료 |
| FR-14 | 개장일 달력 — KIS 휴장일 조회 1순위, **이 키로 거부(EGW02004)** 라 일봉 역산(지난날) + 평일 09:10 당일 봉 관측(오늘). 미래는 `calendarKnown=false` | 부분(미래 휴장) |
| FR-20 | 일봉 수정주가 2년 백필(140일 페이지) · 평일 15:45 확정 · 마지막 저장일부터 다시 받아 미확정 봉 덮어씀 | 완료 |
| FR-21 | 5분봉 — 정규장 체결 5분 집계(15:30 종가 체결은 15:25 봉) · 1초 배치 · 재시작 병합 · 평일 15:40 · 20:40 KIS 일별 1분봉으로 오늘 덮어쓰기 + 지난 30일 빈 날 백필(회차 1,200 호출). 보관은 코인과 같은 30일(기획의 1년 → 정정) | 완료(`89ff9d9`) |
| FR-23 | 현재가 필드(상하한 · 기준가 · 시총 원 · 상태 · 경고 · PER/PBR/EPS/BPS · 52주 · 외국인 소진율) — 빈 값으로 덮지 않음 | 완료 |
| FR-24 | 실시간 체결(정규장 09:00~15:30 것만) → 현재가 1초 반영 · SSE `GET /api/market/kr/stream`(사용자 JWT + 소유자, `event: status` · `tick` · 15초 하트비트) | 완료 |
| FR-25 | WS 08:30~**16:00** KST 개장일만(시간외 단일가 16:00~18:00 은 시간외 값이 현재가를 덮어 뺐다 — FR-27 과 함께 슬라이스 6) · 백오프 1→60초 · 재접속 2회째부터 승인키 재발급 | 완료(`2eb3f85`) |
| FR-26 | 장 상태 KST(pre_open · regular · closing_auction · after_hours_close · after_hours_single · closed · holiday) · `lastCloseAt` · `nextOpenAt` · `calendarKnown` | 완료 |
| FR-29 | 당일 시가 · 고가 · 저가 — `kr_stock_quotes.open/high/low_price`(nullable). KIS 현재가 `stck_oprc` · `stck_hgpr` · `stck_lwpr`(0 은 null) · 실시간 `H0STCNT0` 7 · 8 · 9 필드(틱은 null 로 덮지 않음). 응답 `openPrice` · `highPrice` · `lowPrice` | 완료(`f136b6d`, 슬라이스 3 — 화면이 코인과 같은 5열) |
| FR-30 | `GET /api/market/kr/assets` `sort`(`""`·`all`·`trade_value`·`change`·`price`·`name`) · `order`(`asc`·`desc`) · `period`(`""`·`realtime`·`1d`·`7d`·`1m`·`3m`·`6m`·`1y`) — **코인과 같은 값**. 정렬은 offset/limit 전 유니버스 전체. `periodChange` = 현재가 / N거래일 전 일봉 종가 −1(1 · 5 · 21 · 63 · 126 · 250), 실시간은 `changeRate`(코인과 같음), 없으면 null · `change` 정렬은 null 마지막 | 완료(`f136b6d`) |
| FR-31 | 관심 종목 `assetType: kr_stock` — 소유자만 · 마스터에 있는 코드만(이름은 마스터), 비소유자 · 없는 코드 같은 404 · 중복 409. 목록 가격은 `kr_stock_quotes`, 비소유자 목록엔 국내 주식 행 없음. 업비트 구독 심볼(`distinctSymbols("crypto")`)엔 안 들어감 | 완료(`f136b6d`) |
| FR-32 | 로고(F011 FR-47) — **종목마다 출처를 판정해 저장**(`ResolveKrStockLogos`, 매일 07:50 · 부팅): logo.dev 후보 도메인(DART 홈페이지 — 키 있을 때만) → 티커 → 둘 다 흐리면 `none`(화면 이니셜). 선명도 = 경계에서 1px 안에 바뀌는 몫의 중앙값, 기준 0.6. 출처만 저장(`kr_stock_master.logo_source` 등, 마이그레이션 `20261008120000_kr_stock_logo_source`)하고 주소는 읽을 때 지금 키(`KR_LOGO_DEV_TOKEN`, `pk_` 만)로 만든다. 크기 128px. FMP 제외(LS ELECTRIC 에 건물 사진). 국내 증권 · 포털 앱 이미지 서버 금지 | 완료(`aa9b1c3` · `0022da5` · `58f0c33`) — 50종목 티커 43 · 없음 7. DART(`DART_API_KEY`)는 코드만 있고 사용자가 쓰지 않기로(2026-10-08) |
| FR-40~46(서버 몫) | 상태 배지 · 상하한 도달 · 지연(`stale` = 시세 시간대 3분 초과) · 호가 단위 — 서버 판정, 원 정수 | 완료 |
| FR-90 | 연속 5회 실패면 회차 중단 · 실패 종목은 이전 값 유지 | 완료 |
| FR-92 · 94 | `session.provider { status, since, lastSuccessAt, realtime }` · 10분 TR 별 호출/실패/초과 · 오늘 토큰 발급 로그(3회 초과 경고) | 완료(`89ff9d9`) |
| FR-93 | WS 30초 무응답 재접속 · 3회 실패 `degraded` → 폴링이 받음. 실패 횟수는 첫 메시지에서 비운다(접속만 받고 끊는 연결 버그 수정) | 완료 · 가짜 서버 테스트 |
| FR-33 | 거래 입력 `POST /api/portfolio/transactions` `assetType`(`crypto` · `kr_stock`, 기본 `crypto` — 기존 호출 무변경). 국내 주식은 소유자 · 마스터에 있는 6자리 코드만(`market` 공개 API `krStockListing` — 관심 종목 추가와 같은 404 · 503). 단가가 호가 단위 배수가 아니어도 받는다(F011 FR-42). 매도 보유 확인 · 재계산은 그 자산군. `DEFAULT_ASSET_TYPE` 상수 삭제(`SRV-REQ-006` 체크리스트 §6 의 "주식이 들어오면" 조건) | 완료(`422bc14`) |
| FR-34 | 국내 주식 보유 평가 — 서버가 가진 `kr_stock_quotes` 로 **읽어서** 평가(`KrStockQuoteSource` ACL). 기록 · 수정 · 삭제 직후 그 보유 · 시세 회차(`kr-quote-poll`) 뒤 전체(`RevalueKrStockHoldings`, 쿼리 3) · 부팅. 시세 없는 보유는 건드리지 않음(FR-90). BFF 업비트 반영(`/internal/update-prices`)은 `crypto` 만 | 완료(`422bc14`) |
| FR-35 | `GET /api/market/kr/assets?codes=`(쉼표 · 최대 100 · 형식 검증) — 보유 요약 이름 · 로고. 유니버스가 100을 넘으면 첫 페이지에 보유가 없을 수 있다 | 완료(`13cde7e`) |
| FR-36 | 장 밖에도 **시세가 한 번도 없는 유니버스 종목**은 현재가를 받는다(시간외 단일가 중 제외) — 밤에 처음 기록한 보유가 아침까지 평가 0 으로 남던 것(통합 확인에서 발견) | 완료(`2449834`) |
| FR-60~66 | 지표 · 판정 · 성적표 자산군 분리 · 사이즈 계산 · 리스크 예산 · 계획 연결에 국내 주식 | 슬라이스 4 |

## 계약

- 새 경로 `/api/market/kr/{session, assets, search, stream, :code, :code/chart}` — 전부 인증 · 소유자 전용, 비소유자 404 하나(존재도 알리지 않는다)
- 기존 응답 무변경. `MarketAsset` · 코인 경로 무변경(시세를 `kr_stock_quotes` 에 따로 둔 이유 — `DB-REQ-033`)
- `ErrorKind.Unavailable`(503) — Shared Kernel 값 추가. 기존 값 매핑 무변경
- BFF 짝 `BFF-REQ-040`(슬라이스 2) — 아직 소비처 없음
- 슬라이스 3b(2026-10-08): 거래 입력 `assetType`(선택 · 기본 crypto) · `assets?codes=` 추가. 기존 응답 무변경. 소비처 `BFF-REQ-040` FR-15 · 16. 마이그레이션 없음
- 슬라이스 3(2026-10-08): `assets` 쿼리 3개 · 시세 행 `openPrice` · `highPrice` · `lowPrice` · `periodChange` 추가(기존 필드 무변경) · 관심 종목 DTO `assetType` 에 `kr_stock`. 마이그레이션 `20261008100000_kr_stock_quote_ohlc`(`DB-REQ-033`). 소비처 `BFF-REQ-040` FR-11~13 · `FE-REQ-041`

## 기획 정정

| 기획 | 정정 | 이유 |
|---|---|---|
| `MarketAsset` 확장 | `kr_stock_quotes` 별도 표 | 코인 경로가 자산군을 안 거른다(상폐 처리가 6시간마다 국내 주식을 끔 · 업비트에 6자리 코드 · 비소유자 시장표 노출) |
| SSE 내부 토큰 | 사용자 JWT + 소유자 판정 | 기존 SSE 와 같은 방식 · 새 비밀값 없음. 소유자 전용이라 BFF 가 소유자 연결에 붙어 받으면 된다 |
| 휴장일 = KIS 조회 | 일봉 역산 + 오늘 관측 + KIS 시도 | 이 앱 키로 `CTCA0903R` 가 `EGW02004` |
| 5분봉 1년 백필 | 30일 | 5분봉 정리가 자산군 구분 없이 30일을 지운다 — 코인과 같은 보관 |
| 유니버스에 보유 | 슬라이스 3b | `kr_stock` 보유 행이 생길 수 없었다(입력 DTO 미지원) — 3b 에서 입력과 함께 |
| 보유 평가는 BFF 가 밀어 넣는다(코인과 같게) | 서버가 저장 시세로 읽어서 평가 | 국내 주식 시세는 서버가 이미 갖는다 — BFF 를 거쳐 되돌려 받을 이유가 없다 |

## 하지 않는 것

주문 · 계좌 · 잔고 · 체결통보 TR. 미국 주식. 호가 · 투자자별 · 시간외 단일가(슬라이스 6).

## Changelog

- 2026-10-07: 초판 · 슬라이스 0 · 1(FR-1~27 · 40~46 · 90~94)
- 2026-10-08: FR-32 — 로고 주소를 서버가 정한다(`aa9b1c3`, 사용자 "베스트 케이스로"). 테스트 648/648(로고 2 · 관심 kr 로고 기대값 갱신)
- 2026-10-08: FR-29~31 — 화면을 코인과 같게(사용자 "똑같은 화면이고 데이터만 다른거지"): 당일 시가/고가/저가 · 정렬/순서/기간 · 관심 종목 `kr_stock`(`f136b6d`). 휴장일 TR 거부 문구가 "실전투자 도메인은 모의투자 앱키로 호출하실 수 없습니다"로 확인 — **앱 키는 모의투자용**(슬라이스 1 의 추정이 사실)
- 2026-10-08: FR-32 로고 크기 64 → 128px — 사용자 "화질 구린것도 있네". 64px 원본이 40px 미리보기 아이콘(레티나 80px)에서 흐렸다. 128 은 실제 고해상도 원본(파일 2.5~3배, 업스케일 아님). logo.dev 키 적용 후 유니버스 51/51 응답
- 2026-10-08: FR-32 판정형으로 개정 — 사용자 "lg 전자 ls electronic은 여전히 흐려". logo.dev 티커 원본이 작은 종목(16~32px 를 키운 것)이 있다. 51종목 실측: 흐린 7 = 선명도 0.27~0.44, 선명 44 = 0.70 이상(사이 빔) → 기준 0.6. 단순 축소 · 복원 오차는 효성중공업 "H" 오탐으로 버림. 받다가 실패하면 판정 미룸(일시 장애가 30일 동안 로고를 지우지 않게). FMP 제외. DART 도메인 조회(LG전자 `lg.com` 은 선명 확인)는 사용자가 하지 않기로 — 키 없으면 건너뛴다. 테스트 661/661(선명도 · PNG 디코더 · 판정 4). `58f0c33`
- 2026-10-08: 슬라이스 3b — FR-11 보유 · FR-33~36(거래 입력 국내 주식 · 저장 시세 평가 · `codes` 필터 · 시세 없는 종목 채우기). 테스트 676/676. 실제 유스케이스 · 로컬 DB 통합 확인 9단계(소유자 매수 → 평가 3×266,250 = 798,750 · 비소유자 · 없는 코드 · 형식 404 · 유니버스 첫 순위 · 초과 매도 · `codes` · 요약 · 정리 0건)
