# BFF-REQ-043 — 국내 주요 사건 · 다가오는 국내 일정 중계(1단계) 검증 · 2026-11-02

| 항목 | 결과 |
|---|---|
| `npm run build` | 통과 |
| `npm test` | **309 / 0** — 새: 국내 종류 · 범위 · 지역 그대로 / 옛 서버 응답 = 미국 시장 / 국내 코드 그대로 · 404 그대로 / 일정 경로 · 모르는 종류 · 깨진 행 버림 · 503 → unavailable · 0건 / 라우터 순서(`/schedule` 이 `/:code` 에 안 먹힘) · `days` 1~35 |
| 실 BFF 4001(launchd 재기동) | 소유자: 일정 200 · 카드 200(`scope` · `region`) / 비소유자: 일정 200 · 카드 404(`COACH_FORECAST_NOT_AVAILABLE`) |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-2 `expectedWindow` | 서버가 아직 안 준다(2단계) | `SRV-REQ-041` FR-4 |
| 모바일 집계 1콜 | 모바일 화면이 아직 없다 | F007 RN |

## 국내 탭 요약 띠 (F011, 2026-11-02)

- 변경: 변경 없음 — 웹 소비처가 요약 응답으로 옮겼다(경로 유지)
- 검증: `build` · `test` 315 / 0 · 실 BFF 4001 소유자 200 · 비로그인 401
- 미검증 · 범위 밖: 없음

## 2026-11-10 — F018 걸침

  - `bff/src/rest/routes/kr-stock.routes.ts` — "국내 소유자 전용" 주석 · Swagger 문구 정정(판정은 서버 — 이제 사람 · 게스트 누구나)
  - `bff/src/services/app-kr-stock.service.ts` — "국내 소유자 전용" 주석 · Swagger 문구 정정(판정은 서버 — 이제 사람 · 게스트 누구나)

검증은 F018 체크리스트(`SRV-REQ-056` · `BFF-REQ-055` · `FE-REQ-070` · 루트 `requirements/reports/checklists/F018-public-market-guest.md`) — 이 REQ 의 기존 확인 항목은 다시 열지 않음(동작이 바뀐 것은 국내 소유자 판정 · 로그인 조건뿐)
