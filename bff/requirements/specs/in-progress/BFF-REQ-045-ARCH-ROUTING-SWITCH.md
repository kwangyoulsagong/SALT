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
| FR-7 | 추적 ID 생성 · 전달(OpenTelemetry) — **2026-11-03: W3C `traceparent` 생성 · 잇기 · 전달**(AsyncLocalStorage, 요청마다). OpenTelemetry SDK 로 BFF span 을 내보내는 건 수집처가 정해질 때(`OPS-001`) |
| FR-8 | S7 — 동면 410 응답을 BFF 로 옮긴다 |

## Acceptance Criteria

- [x] 스위치 값 하나로 legacy ↔ platform 전환, 재시작 없음 — 1초 안 반영 · 깨진 파일은 직전 표(테스트 + `backendApi` 흉내 서버 테스트, 2026-11-03)
- [x] 그림자 경로에서 쓰기 요청이 platform 으로 가지 않음(테스트 — POST · PUT · PATCH · DELETE 4종 platform 0건)
- [x] 골든 JSON 녹화 · 재생 · 정규화 테스트

## 계약 영향

- 프론트 계약 무변경(이 REQ 의 합격 기준). 서버 `SRV-REQ-043` · `049`

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-10-30 | 규칙 먼저 — `bff/.claude/rules/backend-integration.md` 에 "서버 MSA 이전 — BFF 가 스위치다" 절(라우팅 표 · 그림자 읽기만 · 골든 JSON · 추적 ID · 이중 토큰). 코드는 그대로 to-do |
| 2026-11-03 | **S0 구현**(`feat/srv-req-043-s0-platform`, 루트 `MONEY-S0-platform-slice.md`) — to-do → in-progress. 서버 호출 한 곳(`backendApi` 인터셉터)에 `services/server-routing/`: 표 ~~`src/config/server-routes.json`~~ `config/server-routes.json`(같은 날 src 밖으로 — dist · 이미지 같은 자리)(기본 `/platform` 만 platform — 화면 경로 전부 legacy 그대로) · FR-6 `PLATFORM_API_URL` · FR-3 · 4 그림자(GET · HEAD 만 · 스트림 제외 · 기록은 경로 · 상태 · 첫 차이 경로, 값 0 · `var/shadow/*.jsonl` · `npm run shadow:report`) · FR-2 골든(`GOLDEN_RECORD_DIR` · `npm run golden:replay`, 정규화 = 시각 · UUID · cuid · 추적 키, 숫자 그대로) · FR-7. 실측: BFF 클라이언트 → Compose platform 종단 같은 추적 ID · 나머지 경로 Express 그대로. 테스트 342 (+16). FR-5(S3) · FR-8(S7)은 그 단계 |
| 2026-11-03 | **코드 리뷰 뒤** `cc184c3a` — 골든이 로그인 응답 토큰을 남기던 것(`/auth/*` 녹화 0 · 비밀 키 값 가림) · 파일 이름 잘림 · 충돌(해시) · 녹화 주소 = axios 직렬화 · 비교 0건 게이트 실패 · 표 파일이 잠깐 사라져도 직전 표 · 그림자 동시 4 · 표본 · 비동기 쓰기. BFF 이미지(REST) · 기존 결함 빌드가 전역 tsc 에 기댐 → `typescript@5.8.2` 고정. 테스트 347 |
| 2026-11-03 | 커밋 대조 — `4bc746f1`(스위치) · `cc184c3a`(리뷰 6건 · 이미지) · `b308718e`(문서). 수용 기준 3/3, FR-5(S3) · FR-8(S7) 이 남아 in-progress |
| 2026-11-03 | MONEY-S1a — 이 REQ 에 걸린 몫(`3e5e0d42`): 라우팅 표에 첫 화면 경로 `/savings` → platform. 그림자 단계는 건너뜀 — 옛 경로를 Kotlin 으로 다시 만들지 않아 비교할 짝이 없다(`SRV-REQ-045` FR-1 정정). 되돌리기 = 표 한 줄은 그대로지만 데이터는 이미 savings 가 주인 |
| 2026-11-04 | 가계부 S1a(`MONEY-S1-household-entry`) — 라우팅 표 `/household` → platform(`b162ac6f`) |
