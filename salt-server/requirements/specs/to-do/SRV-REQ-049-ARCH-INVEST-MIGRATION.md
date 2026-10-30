---
id: SRV-REQ-049
area: server
kind: ARCH
title: "S4~S7 — 투자 서비스 이전(portfolio · market + 수집 워커 · coach) 과 Express 종료. 기능 추가 0"
priority: medium
created: 2026-10-30
source: requirements/decisions/ADR-006-server-msa-kotlin.md
---

## Summary

투자는 **동결**이다 — 이 REQ 는 동작을 바꾸지 않고 옮기기만 한다. 합격 기준은 골든 JSON · 그림자 실행 차이 0.

## FR

| FR | 내용 |
|---|---|
| FR-1 | S4 portfolio — 보유 재계산 · 평가 · 리스크 레이더. 그림자 비교에서 평가금 · 평단을 소수점까지 비교. `TransactionRecorded` 발행 |
| FR-2 | S5 market — 시세 · 캔들 · 검색 · 관심 종목 · 종목 뉴스 · 휴장일. 수집(KIS · 업비트)은 별도 프로세스 `market-ingest`(API 서버와 따로 죽고 산다 — 2026-10-09 · 10-20 국내 일봉 멈춤 의존을 끊는다). KIS 초당 약 2건은 Resilience4j 레이트 리미터. **조회 TR 만 · 주문 클라이언트 0** 테스트 유지 |
| FR-3 | S5 — `DailyCandleClosed` 발행 · export 뷰(`DB-REQ-036` FR-7) |
| FR-4 | S6 coach — 유스케이스 33개를 묶음별로. 판정 엔진은 백테스트 스크립트로 같은 입력 → 같은 출력 전수 비교. 근거 3종 렌더 게이트 · 판정 원장 불변 · 소유자 전용 전망 · 금지 표현 검증기 · LLM 비용 상한 · 신선도 게이트 그대로. `CoachExplainer` 포트 뒤 Spring AI, 금액 · 수량 프롬프트 0 |
| FR-5 | S6 — 해설 SSE 를 SseEmitter 로, BFF 중계 무변경 |
| FR-6 | S7 — launchd `com.salt.server` 내림 → Compose. 동면 410 응답은 BFF 로 옮긴 뒤 옛 서버에서 삭제. `salt-server/src/**` 삭제는 마지막 스위치 1주 뒤 |
| FR-7 | 단계마다 옛 코드 바로 삭제(이중 언어 기간 최소화). 단계별 체크리스트에 "삭제한 줄 수" 기록 |

## Acceptance Criteria

- [ ] 단계별 골든 JSON 차이 0 · 그림자 실행 1주 무차이
- [ ] 수집 프로세스 강제 종료 시 API 서버 정상 응답(`degraded` 만)
- [ ] 판정 엔진 백테스트 전수 동일
- [ ] 주문 경로 0 테스트 유지

## 계약 영향

- `BFF-REQ-045` · `DB-REQ-036` · `FC-REQ-025` · 투자 동결(FEATURE-015 배경)

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
