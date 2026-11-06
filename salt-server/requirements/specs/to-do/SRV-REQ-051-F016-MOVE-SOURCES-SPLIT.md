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
| FR-10 | **코인 쪽** — 기존 `NewsArticle`(코인 태그) · 업비트 마켓 상세 유의/주의 플래그(공식 `market/all` 상세 — 수집 워커에 칸 추가) |
| FR-11 | 소유자 판정 — 국내 경로는 기존 `assertViewer`. 코인은 로그인 사용자 |
| FR-12 | 신선도 — 원천별 마지막 수집 시각을 `ops/salt.sh status` 신선도 쿼리에(`OPS-002` · `workers-external.md`) |

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
