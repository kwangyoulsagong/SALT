# BFF-REQ-035 (F006 MARKET SUMMARY) — 검증 체크리스트

- 브랜치 `feat/fe-market-summary-strip` · 2026-09-22 · 상태 **in-progress**(머지 후 done)

| FR | 판정 | 근거 |
|---|---|---|
| FR-1 공개 · `/:symbol` 앞 | pass | `rest/routes/market.routes.ts`. 토큰 없이 `curl localhost:4001/api/app/market/summary` 200 |
| FR-2 뷰모델 · 계산 없음 | pass | `services/market-summary.viewmodel.ts` + 테스트 4 |
| FR-3 에러 | pass | 컨트롤러 `next(error)` — error middleware |
| FR-4 WS 등락 금액 | pass | `services/upbit-ws.service.ts`. 실측 `price_update` `change24hAmount: -2125000` |

게이트: `npm run build` pass · `npm test` **77/77**(신규 6).

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 서버 5xx · 타임아웃 시 502/504 실측 | 서버를 내려 보지 않았다(코드상 기존 error middleware) | 다음 BFF 장애 스모크 |
| 계약 사본 두 곳(BFF 뷰모델 · 프론트 타입) | `bff` 가 workspace 밖(`BFF-REQ-008` FR-13 과 같은 사정) | `packages/core` 공유 시 |

## 2026-10-30 — F000 종목 검색 · 추적 자산 상한 (파일만 걸침)

- 파일만 걸침 — 웹 `endpoints.ts` 에 검색 경로 추가(시장 요약 경로 옆). 계약 무변경
- 확인: web build

미검증: 없음 — 판단 무변경

## 2026-10-30 — F004 슬라이스 19 차트 1주 탭

- 파일만 걸침 — 웹 `entities/market/model/types.ts` 에 `ChartPeriod.Week`
- 미검증 · 범위 밖: 없음

## 2026-11-09 — F016 단계 C

| 항목 | 결과 |
|---|---|
| 코인 시장 화면 컨트롤러에 why-moved 경로(F016 단계 C `BFF-REQ-051`) — 시장 요약 띠 경로 무변경 | 반영 · 영역 검증 전체 통과 |

루트 체크리스트 `requirements/reports/checklists/F016-C-move-split-facts.md`

## 2026-11-20 시세 등락 기준 걸침

- [x] 시세 등락 기준 바로잡기(`fix/crypto-change-basis`, `SRV-REQ-061` · `FE-REQ-075`)가 걸침 — 업비트 등락 · 고저는 당일(오전 9시) 전일 종가 대비라 "24시간" 이름표 · 프롬프트 줄 · 주석을 "전일 대비 · 당일"로. 값 · 계약 필드 이름 변화 0 — 확인은 `salt-microFe` 짝 REQ 체크리스트(`SRV-REQ-061` · `FE-REQ-075`)
