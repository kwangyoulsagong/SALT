# BFF-REQ-046 — 셸 홈 요약 카드 — 체크리스트

스펙: `bff/requirements/specs/in-progress/BFF-REQ-046-F015-SHELL.md` · 2026-11-02
브랜치: `feat/fe-req-053-invest-zone-home-cards` (base `main` `166b6f49`) · 루트 슬라이스 `requirements/specs/done/MONEY-F1-invest-zone-home-cards-slice.md`

## 1. FR ↔ 구현

| FR | 구현 | 상태 |
|---|---|---|
| FR-1 | `services/app-home.service.ts`(`CARD_SOURCES` · `allSettled`) · `home-card.viewmodel.ts` | ✅ |
| FR-2 | `CONTRACT` 블록 ↔ `@repo/core/home` · `__tests__/home-card-contract.test.ts` | ✅ |
| FR-3 | `withinBudget` 800ms | ✅ |
| FR-4 | 투자 카드 — 보유 평가 + 손익률(숨김 끔) / 종목 수 | ✅(F003 · 도메인 선택은 없음) |
| FR-5~8 | — | 미착수(S3) |
| FR-9 | 옛 블록 응답 삭제(소비처 0) | ✅ |
| 추가 | 401 은 홈 401(`5b6d5320`) | ✅ |

## 2. 검증 (실행한 것만)

| 확인 | 결과 |
|---|---|
| `npm run build` · `npm test` | 통과 · 324 |
| 홈 테스트 | 10 — 카드 · empty · degraded · 800ms · 손익률(끔 · 음수 · 켬 · 설정 실패 · 통계 실패) · 401 |
| 변이 | 계약 필드 하나 → 대조 테스트 실패 · 숨김 판정 지움 → 실패 1 · 401 재던지기 지움 → 실패 1 |
| 실서버(임시 사용자) | 카드 2 · 숨김 끔 "+5.7%" → 켬 "보유 종목 1개" → 끔 "+5.7%"(독립 계산 1,056,640/1,000,000−1 = 5.66%) · 잘못된 토큰 401 · 정상 200 |
| 프론트 소비처 | 웹 셸 홈 하나(`entities/home`) — 옛 응답을 읽던 곳 0(`grep "/api/app/home"`) |

## 3. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 레이아웃 저장 · 온보딩 · 내보내기 · 알림 | 서버 identity 없음 | S3 `SRV-REQ-048` |
| 가계부 · 팁 카드 | 서비스 없음 | `SRV-REQ-046` · `047` |
| 모바일 1콜 소비 | RN 미착수 | `RN-REQ-035` |
| 웹 블록별 엔드포인트(`bff-architecture.md` §4) | 웹 홈이 토큰을 서버에서 못 읽어 한 번 부른다 | `FE-REQ-013` |
