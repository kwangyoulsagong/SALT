---
id: SRV-REQ-051
feature: F016
area: server
kind: FUNC
title: "market — 등락 원천 수집(국내 시황/공시 제목 · VI · 장운영 · 업종 지수 · 장중 수급) · 등락 분해 · 시장 상태 태그"
priority: high
created: 2026-11-06
source: pm/requirements/specs/in-progress/FEATURE-016-why-moved.md
---

## Summary

`FEATURE-016` 의 ①(숫자 분해) · ②(같은 날 사실) · 상태 태그 몫. 서비스 = **market**(Express — S5 전, `msa-services.md` §3 "이전 전 서비스 기능은 Express · 이전을 막는 의존 0").
원천은 KIS 조회 TR(모의 키로 2026-11-06 확인 — 리서치 §0-3)과 기존 코인 수집. LLM 0.

## 착수 전 네 질문(`msa-services.md` §1)

| 질문 | 답 |
|---|---|
| 서비스 | market |
| 단계 | Express(S5 전). 새 표는 S5 이전 때 Flyway 로 같이 옮긴다 |
| 표 주인 | 전부 market(`DB-REQ-041`). coach 의 `move_explanation` 은 `SRV-REQ-052` |
| BFF 계약 | 새 경로 · 기존 국내 시세 응답에 칸 추가(`BFF-REQ-051`) |

## FR

| FR | 내용 |
|---|---|
| FR-1 | **시황/공시 제목 수집** — KIS 종합 시황/공시(제목) `FHKST01011800` 을 추적 국내 종목(유니버스 · 관심)마다 장중 5분 · 장외 30분. 저장: 제공처 · 시각 · 제목 · 관련 종목 코드 · 대분류 코드 · 원천 일련번호(유일). **본문 0 · 링크 없음(원천에 없다)**. 광고성 거르기 규칙(제목 패턴 · 제공처 목록 — 서버 설정) · 보관 30일 |
| FR-2 | **VI 현황 수집** — `FHPST01390000` 시장 전체 한 번 호출 · 장중 1분. 발동 · 해제 시각 · 정적/동적 · 발동가 · 괴리율 · 횟수. 같은 (종목 · 발동 시각) 한 행 |
| FR-3 | **시장 조치(서킷브레이커 · 사이드카)** — 장운영정보 실시간(KRX) 필드 실측 후 수신(웹소켓 슬롯 하나). 실측 전 · 수신 실패 땐 추정: 지수 전일 대비 -8% 이하 + 지수 · 대형주 체결 멈춤 1분 → `kind=circuit_breaker, source=inferred`. 사이드카는 실측된 필드로만(추정 0) |
| FR-4 | **업종 지수** — 국내업종 현재지수(유니버스 종목의 `sector_code` 업종만) 장중 1분 · 일별 종가. 지수 3종(0001 · 1001 · 2001) 기존 그대로 |
| FR-5 | **장중 수급** — 종목별 투자자(외국인 · 기관 · 개인) · 프로그램 매매(체결) 장중 10분 — 유니버스만 · KIS 우선순위 맨 뒤(시세 먼저 — `FEATURE-011` FR-91) |
| FR-6 | **종목 상태 칸 넓히기** — 현재가 응답의 `vi_cls_code` · `ovtm_vi_cls_code` · `invt_caful_yn` · `mang_issu_cls_code` · `sltr_yn` · `short_over_yn` 를 `kr_stock_quotes` 에. 기존 `krStatusBadges` 를 VI · 투자유의 · 관리 · 정리매매 · 단기과열로 넓힌다 · **마지막 체결 시각** 칸(정지 · 단일가 때 표시용) |
| FR-7 | **등락 분해** `SplitDailyMove` — 국내: 시장 몫 = β_시장 × 지수 등락 · 업종 몫 = β_업종 × (업종 − 지수) · 고유 = 나머지. 코인: BTC 몫 = btc_beta × BTC 등락 · 고유 = 나머지. β 는 forecast export 뷰(`FC-REQ-027`) — 못 읽으면 β=1(시장 조정) + `method=market_adjusted` 라벨. 합 = 등락(반올림 전 정확히). 금액 아님 — %p |
| FR-8 | **카드 조건** — |등락| ≥ max(최소 %, k × σ60) 또는 오늘 VI · 시장 조치 · 정지 · 경보. k · 최소 % · σ 창은 서버 설정(값은 분포 보고 — `FEATURE-016` Q6) |
| FR-9 | **같은 날 사실 목록** `ListMoveFacts` — 시각순 · id · kind(news · disclosure · vi · market_action · halt · warn · flow · crypto_news · crypto_warning) · 출처 · 시각 · 제목/값. 원천 하나 실패 = 그 kind 만 `unavailable` |
| FR-10 | **코인 쪽** — 기존 `NewsArticle`(코인 태그) · 업비트 마켓 상세 유의/주의 플래그(공식 `market/all` 상세 — 수집 워커에 칸 추가) · ~~거래소 공지(비공식 공지 JSON)~~ **안 쓴다**(사용자 결정(2026-11-06): *"업비트 공지는 안한다"*) |
| FR-11 | 소유자 판정 — 국내 경로는 기존 `assertViewer`. 코인은 로그인 사용자 |
| FR-12 | 신선도 — 원천별 마지막 수집 시각을 `ops/salt.sh status` 신선도 쿼리에(`OPS-002` · `workers-external.md`) |

## 진행 — 단계 A done(2026-11-06)

| FR | 상태 | 구현 |
|---|---|---|
| FR-2 VI | done | `KisClient.viEventsPage` · `PollKrViEvents`(정규장 · 종가 단일가 매분, 한도 맨 뒤) · `kr_vi_event`. **실측: KIS 는 최근 30건 한 쪽만 준다**(연속 조회 머리 빈 값) — 1분에 30건 넘게 발동하면 앞쪽 종류 · 시각을 놓친다(칩은 현재가 `vi_cls_code` 로 선다) |
| FR-3 시장 조치 | 부분 | 서킷브레이커 **추정** done — `detectKrCircuitBreakers`(지수 분 기록이 60초 이상 같은 값 + 전일 대비 -8 · -15 · -20% 이하 · 1 · 2단계는 14:50 뒤 0) · `InferKrMarketActions`. ~~지수 · 대형주 체결 멈춤 1분~~ → 지수 분 기록 멈춤 1분(대형주 체결 칸이 폴링 종목엔 1분 오차라 지수만 — 2026-11-06 재생에서 같은 답). 장운영정보 실시간(feed) · 사이드카는 남음(발동일 실측) |
| FR-6 상태 칸 | done | 현재가 응답 필드 다섯 · `last_trade_at`(실시간 = 체결 시각 · 폴링 = 누적 거래량이 는 회차). `krStatusBadges` 에 `paused` · `vi` · `attention` · `liquidation`(+ 관리 · 단기과열 플래그). 응답의 `lastTradeAt` 은 값이 멈춘 이유가 있을 때만(`krVisibleLastTrade`) |
| 그 밖 | ~~단계 B~D~~ 단계 C · D | ~~FR-1 · 4 · 5(B)~~ · FR-7~10(C) · FR-11 기존 판정 그대로 · ~~FR-12 신선도(B 수집 워커와 함께)~~ |

루트 `requirements/specs/done/F016-A-market-status-tags-slice.md`

## 진행 — 단계 B done(2026-11-06)

| FR | 상태 | 구현 |
|---|---|---|
| FR-1 시황/공시 제목 | done(정정) | ~~종목마다 장중 5분 · 장외 30분~~ → **시장 전체 한 번**(종목 칸 빈 값 — 실측 40건/쪽) · KST 07~20시 2분 · 그 밖 30분 · 받은 마지막 게시 시각까지 쪽 넘김(5쪽 상한). 관련 종목 없는 제목은 버림 · 공시 = 제공처 이름에 "공시" · 광고성 `KR_NEWS_PROMO_PATTERNS`(표시만 뺌) · 30일 정리. `PollKrNewsTitles` · `GetKrStockNews` |
| FR-4 업종 지수 | done | 유니버스 종목의 `sector_code`(→ `krSectorIndexCodeOf`, `0000` · `x001` 제외) · 지수 TR 그대로 · ~~정규장 매분~~ ~~5분~~ 장중 :15 · :45 + 15:40 종가(cron — 매분 · 5분 판이 다음 분 현재가 폴링을 건너뛰게 했다, 측정 `c7ba1262`) · 최신 + 일별. `PollKrSectorIndices` |
| FR-5 장중 수급 | 부분 | **프로그램 매매 누적(체결, `FHPPG04650101`)만** — 유니버스 장중 10분(cron :x3 — 회차가 걸친 분에 실시간 슬롯 밖 폴링 종목 현재가가 한 번 건너뜀은 남음, 체크리스트) · 금액 원(실측) · 초과 한 건은 그 종목만 건너뛰고 연속 셋이면 양보(첫 판의 "초과 = 양보"가 장중 매 회차 0/50 — `13b5784e`). 외국인 · 기관 장중 추정(`FHPTJ04160001`)은 모의 키 거부(`OPSQ2001`) — 실전 키 때. `PollKrProgramFlows` · `GetKrIntradayFlows` |
| FR-12 신선도 | done | `ops/salt.sh status` 세 줄(시황 제목 6시간 ✗ · 프로그램 · 업종은 시각만) |
| 보존 | done | `PruneKrMoveSources` 평일 15:55 — 제목 30일 · 장중 수급 7일 · VI 30일(단계 A 가 남긴 것), 5,000행씩 |

- 허용 목록 TR 둘 더(`FHKST01011800` · `FHPPG04650101`). 새 경로 `GET /api/market/kr/:code/news` · `/:code/flows/intraday`(소유자 전용 · 저장값만)
- 부가 호출 사이 1초(`KR_SUPPLEMENT_SPACING_MS`) — 몰리면 KIS 초과 → 클라이언트 감속이 현재가까지 세운다(13:40 측정 폴링 종목 75~105초, `b36bd57a`)
- 업종 · 프로그램은 시세 사슬(`kr-quote-poll`)에 붙이지 않는다 — 사슬이 1분을 넘기면 사슬 끝 "10분 정각" 판정이 회차를 버렸다(12:00 0행, `158d5940`)
- 루트 `requirements/specs/done/F016-B-kr-news-flows-slice.md`

## 진행 — 단계 C done(2026-11-09)

| FR | 상태 | 구현 |
|---|---|---|
| FR-7 분해 | done | `domain/MoveSplit.ts` `splitDailyMove` — 시장 = β × 지수 · 업종 = β × (업종 − 지수) · 종목 = 등락 − 둘(뺄셈이 정의 · 합 = 등락). β 는 `forecast.v_move_beta_export`(7일 넘으면 없음) — 못 읽으면 β=1 `market_adjusted` · 코인 BTC 는 `benchmark`. 업종은 30분 박자라 장중 40분 안 · 같은 거래일 값만(`isUsableSectorQuote`). 지수가 다른 거래일이면 분해 없음 |
| FR-8 카드 조건 | done(정정) | `moveCardReasons` — \|등락\| ≥ max(`MOVE_CARD_MIN_RATE` 3, `MOVE_CARD_K` 2.5 × σ) 또는 그날 VI · 시장 조치 · 정지 · 경보. **σ 창은 서버 설정이 아니라 예측 배치 설정**(~~σ 창은 서버 설정~~ 정정 2026-11-09 — 요청 때 일봉을 집계하지 않으려 배치가 σ60 을 미리 낸다). k · 최소 % 는 분포로 정했다(체크리스트 — 종목당 한 달 약 0.7회). 표 행 `moveCard`(국내 표 · 코인 시장 개요)도 같은 판정(`moveCard.ts`) |
| FR-9 같은 날 사실 | done | `GetKrWhyMoved` — 시황/공시 제목 · VI(최근 하나) · 시장 조치 · 정지/경보 상태 · 프로그램 순매수(원). 원천 하나 실패면 그 kind 만 `unavailable` · 시각순 상한 30 |
| FR-10 코인 | done(정정) | `GetCryptoWhyMoved` — 그날(09:00 KST 뒤) 기사 제목 · 거래소 유의/주의. ~~업비트 마켓 상세 플래그를 수집 워커에 칸 추가~~ **새 열 대신 매일 스냅샷 `forecast.v_market_warning`**(같은 공식 원천 — 두 곳에 두지 않는다, 2일 넘으면 없음) |
| 지수 · 업종 일별 | done | KIS `FHKUP03500100`(허용 목록 +1) — 지수 셋 + 유니버스 업종 1년 · 매일 16:05 + 기동 때. 200행 미만이면 다시 거슬러 · 오늘 행은 16:00 뒤만 · 이름은 원천 값(`kr_index_name`). **업종 = 중분류 우선**(대분류 0027 제조업이 반도체 지배 — 동화약품 업종 β −3.5 → 중분류 0009 제약 0.40) |
| 부가 작업 실패 셈 | done | `SupplementFailures` 한 곳 — 업종 15:40 종가 회차가 초과 하나로 0행이던 것(11-06 서버 로그) · 프로그램 · 지수 일별 같은 규칙 |

- 경로 `GET /api/market/kr/:code/why-moved`(소유자) · `GET /api/investment/crypto/:symbol/why-moved`(로그인) — 저장값만 · Swagger `failOnErrors` 생성 확인
- 루트 `requirements/specs/done/F016-C-move-split-facts-slice.md`

## Acceptance Criteria

- [ ] 분해 합 = 등락 — 경계 표 테스트(β 없음 · 업종 없음 · 지수 실패 · 코인)
- [ ] 수집 워커 실호출(모의 키) — 시황 제목 · VI · 업종 · 수급 행 생김 · 중복 0(같은 원천 일련번호 · 발동 시각)
- [ ] 기사 본문 열 0 · 포털 검색 호출 0 · 주문/계좌 TR 0(허용 목록 테스트에 새 TR 넷)
- [ ] 정지 중 마지막 체결 시각이 응답에 · 1분 안
- [ ] KIS 처리량: 수집 추가 뒤 시세 갱신 지연 악화 0(장중 측정)

## 계약 영향

- DB `DB-REQ-041` · coach `SRV-REQ-052` · 예측 `FC-REQ-027`(β 뷰) · BFF `BFF-REQ-051` · 기존 국내 시세 응답 칸 추가(`SRV-REQ-040` · `BFF-REQ-040`)

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-06 | 신규(to-do) — 딥리서치 `requirements/reports/research/2026-11-06-why-moved.md` · `ADR-009` |
| 2026-11-06 | ~~사용자 결정 — 업비트 비공식 공지 사용(저빈도 · 차단 시 중단)~~ 곧이어 정정(아래) |
| 2026-11-06 | 사용자 결정(2026-11-06): *"업비트 공지는 안한다"* — FR-10 거래소 공지 뺌(공식 마켓 플래그만) |
| 2026-11-06 | 단계 B 확인 2회차 — 레이어 훅 사후 실행을 제대로 다시(첫 보고는 검사 없이 통과) · 단계 A 가 넘긴 VI 30건 초과를 셈(분당 최대 15 · 초과 0) · 로딩 상태 실화면 |
| 2026-11-06 | 단계 B done — FR-1(정정: 시장 전체 한 번) · FR-4 · FR-5 부분(프로그램만 — 외국인 · 기관 장중 원천 거부) · FR-12 · VI 보존 정리. 허용 목록 TR 둘 |
| 2026-11-06 | in-progress — 단계 A(FR-2 · FR-3 추정 · FR-6) done. FR-3 추정 근거를 "지수 분 기록 멈춤"으로 정정(진행 표). 허용 목록 TR 하나 더(`FHPST01390000`) |
| 2026-11-09 | 단계 C done — FR-7~10 · 지수 · 업종 일별 이력(새 TR 하나) · 업종 중분류 · 부가 작업 실패 셈 한 곳. FR-8 σ 창 · FR-10 코인 경보 원천 정정 |
