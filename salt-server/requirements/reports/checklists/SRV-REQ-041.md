# SRV-REQ-041 — 국내 주요 사건 읽기 · 다가오는 국내 일정(1단계) 검증 · 2026-11-02

| 항목 | 결과 |
|---|---|
| `npm run build` · `lint` | 통과 |
| `npm test` | **922 / 0** — 새: 국내 종류 · 지역 · 범위 / 코인엔 국내 일정 없음 / 모르는 종류 · 계약 위반 행 버림 / 사건 종목별 묶음 · 일정 줄(지난 것 · 미국 · 종목 사건 · 기간 밖 제외, KST 자정 경계) · 유스케이스(뷰 1회 · 503 그대로) |
| `test:layer-check` | 차단 10 · 통과 6 · 바꾼 · 새 `.ts` 16개 훅 사후 실행 exit 0(위반 대조 exit 2) |
| 실서버 4000 | 소유자: `/api/coach/events?symbol=005930` 7건(국내 4 · 미국 3, `region` · `scope`) · `?symbol=BTC` 미국 3건 / 비소유자: 일정 200 · 카드 404 / `days=36` 400 / 기본 14일 |
| 성능 | 일정 경로 10회 최대 11ms(예산 100ms, FR-6) |
| Swagger | `/api/coach/events` 응답 스키마 · `/api/market/kr/schedule` 신규(JSDoc — `build` 통과) |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-4 예상 창 | 2단계 | `FC-REQ-021` 2단계 |
| Kotlin 이전 | 투자(`coach` · `market`) 동결 · S5 · S6 단계 | `SRV-REQ-049` |

## 국내 탭 요약 띠 (F011, 2026-11-02)

- 변경: 변경 없음 — 일정 읽기 재사용(요약 응답 `schedule`)
- 검증: `build` · `lint` · `test` 936 / 0 · `test:layer-check` · Swagger 생성 · 실서버 4000 소유자 200
- 미검증 · 범위 밖: 없음

## 2026-11-10 — F018 걸침

  - `salt-server/src/market/application/GetKrMarketSchedule.ts` — 국내 소유자 판정 걷기(`ADR-011`) — 시세 · 관심 · 거래 · 국내 판단 · 미러 · 복기 · 해설은 로그인 전체(시세는 게스트 포함), 전망 셋만 소유자
  - `salt-server/src/market/presentation/krStock.controller.ts` — 국내 소유자 판정 걷기(`ADR-011`) — 시세 · 관심 · 거래 · 국내 판단 · 미러 · 복기 · 해설은 로그인 전체(시세는 게스트 포함), 전망 셋만 소유자

검증은 F018 체크리스트(`SRV-REQ-056` · `BFF-REQ-055` · `FE-REQ-070` · 루트 `requirements/reports/checklists/F018-public-market-guest.md`) — 이 REQ 의 기존 확인 항목은 다시 열지 않음(동작이 바뀐 것은 국내 소유자 판정 · 로그인 조건뿐)
