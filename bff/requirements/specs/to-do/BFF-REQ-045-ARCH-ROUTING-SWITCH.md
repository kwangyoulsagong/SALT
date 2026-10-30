---
id: BFF-REQ-045
area: bff
kind: ARCH
title: "스트랭글러 장치 — 경로별 라우팅 스위치 · 골든 JSON 계약 테스트 · 그림자 실행 · 이중 토큰 검증"
priority: high
created: 2026-10-30
source: requirements/decisions/ADR-006-server-msa-kotlin.md
---

## Summary

BFF 는 Node 로 남고(`ADR-006`), 서버 이전의 **안전장치**가 된다. 프론트 계약은 바뀌지 않고, 뒤의 서버만 경로 단위로 넘어간다.

## FR

| FR | 내용 |
|---|---|
| FR-1 | 라우팅 표 — 서버 경로 prefix → `legacy`(Express :4000) \| `platform`(Kotlin) \| `shadow`. 설정 파일 하나 + 재시작 없이 재로딩. 되돌리기 = 값 하나 |
| FR-2 | 골든 JSON — BFF 가 부르는 서버 API 전부의 요청/응답 녹화 도구. 시간 · ID 같은 변동 필드 정규화 규칙 |
| FR-3 | 그림자 실행 — `shadow` 경로는 legacy 응답을 돌려주고 같은 요청을 platform 에 비동기로 보내 차이를 기록(쓰기 경로는 그림자 금지 — 읽기만) |
| FR-4 | 차이 리포트 — 경로별 일치율 · 첫 차이 필드. 1주 무차이가 스위치 조건 |
| FR-5 | 이중 토큰 검증 — S3 기간 옛 HS · 새 RS(JWKS) 모두 받음. JWKS 캐시 · 키 교체 |
| FR-6 | 서비스 주소 — 서비스별 base URL(Compose 이름). S0~S2 는 전부 같은 platform 주소 |
| FR-7 | 추적 ID 생성 · 전달(OpenTelemetry) |
| FR-8 | S7 — 동면 410 응답을 BFF 로 옮긴다 |

## Acceptance Criteria

- [ ] 스위치 값 하나로 legacy ↔ platform 전환, 재시작 없음
- [ ] 그림자 경로에서 쓰기 요청이 platform 으로 가지 않음(테스트)
- [ ] 골든 JSON 녹화 · 재생 · 정규화 테스트

## 계약 영향

- 프론트 계약 무변경(이 REQ 의 합격 기준). 서버 `SRV-REQ-043` · `049`

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
