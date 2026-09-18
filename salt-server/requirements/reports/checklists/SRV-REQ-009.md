# SRV-REQ-009 (F000 API) — 검증 체크리스트

- REQ: `requirements/specs/in-progress/SRV-REQ-009-F000-API.md`
- 브랜치: `feat/f000-watchlist-tab` · 검증일: 2026-09-18
- 상태: **부분 완료** — 포지션 요약과 `period` 정정만 닫혔다
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F000-watchlist-tab.md`

## 1. 신규 엔드포인트

| Method | Path | 상태 | 비고 |
|---|---|---|---|
| GET | `/api/portfolio/summary` | **열림** | `{ items[], totalKrw, fxRateUsed, fxBasisCode }`. 환율 둘은 **언제나 `null`** (`fx` 없음) |
| GET | `/api/news` | 이미 있었다 | 이번에 소비처(BFF `/api/app/news`)가 생겼다 |
| POST | `/api/auth/invite/accept` | 미구현 | `DB-REQ-001` 선행 |
| GET | `/api/auth/invite/check` | 미구현 | 동일 |
| GET | `/api/onboarding/status` | 미구현 | `ledger`·`plan` 공개 API 선행 |

## 2. `period` 계약 정정

| 입력 | 결과 | 비고 |
|---|---|---|
| `period=minute` | **200** | |
| `period` 생략 | **200** (`day`) | 기본값은 유지한다 |
| `period=miniute` | **422** | `MARKET_CHART_PERIOD_UNSUPPORTED`. 조용히 기본값으로 떨어뜨리지 않는다 |

`ErrorKind.Blocked` → 422 매핑을 썼다. 400 으로 두면 필수 필드 누락과 구분되지 않는다.

## 3. 제거·410

`POST /api/auth/register` · `PATCH /api/users/password` · `DELETE /api/users/account` 제거와
동면 경로 410 Gone 은 **하지 않았다.** 초대 경로가 생기기 전에 `register` 를 지우면 계정
생성 수단이 사라진다 — `SRV-REQ-008` FR-1~7 과 같은 릴리스여야 한다.

## 4. 판단이 REQ와 다른 것

**차트 주기를 `minute`·`day` 둘로 정의했다**(`FE-REQ-010` FR-50 은 넷). 거래소 호출도
소비 화면도 없어서 목록에만 넣으면 200 을 기대하게 되고 실제로는 빈 배열이 온다.

## 5. Swagger

`/api/investment/crypto/{symbol}/chart` 에 `period` enum·422 를, `/api/investment/watchlist`
에 응답 스키마(가격이 **number 또는 null**, `logoUrl` nullable)를, `/api/portfolio/summary`
에 전체 스키마를 적었다.

## 6. 명령

`npm run build` pass · `npm test` 162건 pass · `lint` pass · `test:layer-check` pass.
