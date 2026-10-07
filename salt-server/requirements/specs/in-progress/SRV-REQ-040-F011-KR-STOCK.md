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
| FR-11 | 유니버스 = 관심(누구든) ∪ 주권 시총 상위 N(`KIS_UNIVERSE_TOP_N`=50, 우선주 제외). **보유는 슬라이스 3**(거래 입력이 `kr_stock` 을 받을 때) | 부분 |
| FR-12 | WS 41 슬롯 — 관심 → 시총 순. 나머지는 1분 폴링. 42번째는 `OPSP0008 MAX SUBSCRIBE OVER`(실측) → 구독에서 빼고 폴링 | 완료(`7689823`) |
| FR-13 | `GET /api/market/kr/search?q=` 마스터 전체 · 코드 접두 · 이름 부분 일치 · 시총 순 20건 | 완료 |
| FR-14 | 개장일 달력 — KIS 휴장일 조회 1순위, **이 키로 거부(EGW02004)** 라 일봉 역산(지난날) + 평일 09:10 당일 봉 관측(오늘). 미래는 `calendarKnown=false` | 부분(미래 휴장) |
| FR-20 | 일봉 수정주가 2년 백필(140일 페이지) · 평일 15:45 확정 · 마지막 저장일부터 다시 받아 미확정 봉 덮어씀 | 완료 |
| FR-21 | 5분봉 — 정규장 체결 5분 집계(15:30 종가 체결은 15:25 봉) · 1초 배치 · 재시작 병합 · 평일 15:40 · 20:40 KIS 일별 1분봉으로 오늘 덮어쓰기 + 지난 30일 빈 날 백필(회차 1,200 호출). 보관은 코인과 같은 30일(기획의 1년 → 정정) | 완료(`89ff9d9`) |
| FR-23 | 현재가 필드(상하한 · 기준가 · 시총 원 · 상태 · 경고 · PER/PBR/EPS/BPS · 52주 · 외국인 소진율) — 빈 값으로 덮지 않음 | 완료 |
| FR-24 | 실시간 체결(정규장 09:00~15:30 것만) → 현재가 1초 반영 · SSE `GET /api/market/kr/stream`(사용자 JWT + 소유자, `event: status` · `tick` · 15초 하트비트) | 완료 |
| FR-25 | WS 08:30~**16:00** KST 개장일만(시간외 단일가 16:00~18:00 은 시간외 값이 현재가를 덮어 뺐다 — FR-27 과 함께 슬라이스 6) · 백오프 1→60초 · 재접속 2회째부터 승인키 재발급 | 완료(`2eb3f85`) |
| FR-26 | 장 상태 KST(pre_open · regular · closing_auction · after_hours_close · after_hours_single · closed · holiday) · `lastCloseAt` · `nextOpenAt` · `calendarKnown` | 완료 |
| FR-40~46(서버 몫) | 상태 배지 · 상하한 도달 · 지연(`stale` = 시세 시간대 3분 초과) · 호가 단위 — 서버 판정, 원 정수 | 완료 |
| FR-90 | 연속 5회 실패면 회차 중단 · 실패 종목은 이전 값 유지 | 완료 |
| FR-92 · 94 | `session.provider { status, since, lastSuccessAt, realtime }` · 10분 TR 별 호출/실패/초과 · 오늘 토큰 발급 로그(3회 초과 경고) | 완료(`89ff9d9`) |
| FR-93 | WS 30초 무응답 재접속 · 3회 실패 `degraded` → 폴링이 받음. 실패 횟수는 첫 메시지에서 비운다(접속만 받고 끊는 연결 버그 수정) | 완료 · 가짜 서버 테스트 |
| FR-60~66 | 지표 · 판정 · 성적표 자산군 분리 | 슬라이스 4 |

## 계약

- 새 경로 `/api/market/kr/{session, assets, search, stream, :code, :code/chart}` — 전부 인증 · 소유자 전용, 비소유자 404 하나(존재도 알리지 않는다)
- 기존 응답 무변경. `MarketAsset` · 코인 경로 무변경(시세를 `kr_stock_quotes` 에 따로 둔 이유 — `DB-REQ-033`)
- `ErrorKind.Unavailable`(503) — Shared Kernel 값 추가. 기존 값 매핑 무변경
- BFF 짝 `BFF-REQ-040`(슬라이스 2) — 아직 소비처 없음

## 기획 정정

| 기획 | 정정 | 이유 |
|---|---|---|
| `MarketAsset` 확장 | `kr_stock_quotes` 별도 표 | 코인 경로가 자산군을 안 거른다(상폐 처리가 6시간마다 국내 주식을 끔 · 업비트에 6자리 코드 · 비소유자 시장표 노출) |
| SSE 내부 토큰 | 사용자 JWT + 소유자 판정 | 기존 SSE 와 같은 방식 · 새 비밀값 없음. 소유자 전용이라 BFF 가 소유자 연결에 붙어 받으면 된다 |
| 휴장일 = KIS 조회 | 일봉 역산 + 오늘 관측 + KIS 시도 | 이 앱 키로 `CTCA0903R` 가 `EGW02004` |
| 5분봉 1년 백필 | 30일 | 5분봉 정리가 자산군 구분 없이 30일을 지운다 — 코인과 같은 보관 |
| 유니버스에 보유 | 슬라이스 3 | `kr_stock` 보유 행이 생길 수 없다(입력 DTO 미지원) |

## 하지 않는 것

주문 · 계좌 · 잔고 · 체결통보 TR. 미국 주식. 호가 · 투자자별 · 시간외 단일가(슬라이스 6).
