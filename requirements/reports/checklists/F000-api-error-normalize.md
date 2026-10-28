# F000 슬라이스 — 웹 API 에러 모양 하나 — 체크리스트

슬라이스: `requirements/specs/in-progress/F000-api-error-normalize-slice.md` · 2026-10-28
브랜치: `feat/fe-req-012-error-normalize` (base `main` `714cc40`)
영역 체크리스트: `salt-microFe/requirements/reports/checklists/FE-REQ-012.md` (주) · 파일만 걸친 REQ 13곳은 각 체크리스트 2026-10-28 절

## 1. 커밋

| 커밋 | 영역 | 되돌리면 |
|---|---|---|
| `1a8bd5e` refactor(fe) | `shared/api/apiError` · 슬라이스 에러 클래스 9개 삭제 · 재시도 판정 · `ChartPeriod` · `api-convention.md` | 단독 revert 가능 — 계약 변경 없음. 4xx 가 다시 전역에서 두 번 더 불린다 |
| `ae5b0ad` docs | 루트 3종 · 영역 REQ · 마스터 인덱스 · FEATURE-000 | 문서만 |
| `f74c34f` fix(server) | 캔들 두 읽기 Upbit 404 → `MARKET_SYMBOL_NOT_FOUND` | 모르는 코인 차트가 다시 500 — 단독 revert 가능 |
| `2ff2ae6` refactor(fe) | `ApiError` → `@repo/core/http` + 단위 17건 | `1a8bd5e` 보다 먼저 되돌린다(웹 재수출이 core 를 가리킨다) |
| `3f38160` feat(bff) | `AppError` 선택 `code` | 422 본문에서 `code` 가 빠진다 — 웹은 `null` 로 받는다. 단독 revert 가능 |
| (docs 후속) | 이 절 · 영역 REQ 6곳 | 문서만 |

## 2. 검증

| 확인 | 결과 |
|---|---|
| `pnpm check-types` · `pnpm lint`(`--max-warnings 0`) | 5/5 pass |
| `pnpm test` | `@repo/core` 34 · `@repo/ui` 43 pass (웹에 테스트 러너 없음 — 아래) |
| `pnpm test:layer-check` | 차단 8 · 통과 5 |
| 훅 사후 실행(Bash · python 으로 쓴 37파일) | 위반 0 |
| `web` · `web-tax` 빌드 | pass. `/investments/[symbol]` 137 kB(First Load), 공용 104 kB |
| 잔여 grep | `CoachApiError` · `MarketApiError` · `GoalApiError` · `StreamHttpError` · `SignInError` 등 9개 이름 코드 0건(주석 1 — 경위) |
| BFF 실응답 모양 | 422 `{ success:false, message }`(code 없음) · 서버 4xx 는 `code` 를 옮긴다(`errorMiddleware`) → `readApiError` 가 둘 다 받는다 |

### 실측 — 재시도 (Playwright `route`, dev `next dev -p 3100` + BFF 4001, `/investments/BTC` 상세 차트 `count=200` 만 고정 응답)

| 응답 | main(`714cc40`) | 이 브랜치 |
|---|---|---|
| 404 `MARKET_SYMBOL_NOT_FOUND` | 요청 4 — 1155 · 1159 · 2165 · 4169ms | 요청 2 — 1016 · 1018ms |
| 422 | 요청 4 — 933 · 934 · 1938 · 3943ms | 요청 2 — 991 · 995ms |
| 500 | (같음) | 요청 4 — 874 · 876 · 1881 · 3887ms(1s · 2s 백오프 유지) |
| 410 | — | 요청 2 · 콘솔 `[apiFetch] 410 — 동면 경로를 아직 부른다` 1건 |

첫 두 요청이 같은 ms 인 것은 dev StrictMode 이중 마운트다(앞 요청은 취소). main 측정은 작업 트리를 사본으로 떠 두고 `git stash` → 측정 → `pop` 뒤 `diff -rq` 로 사본과 같음을 확인했다.

## 3. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| ~~로그인 · 거래 기록 오류 문구 실화면~~ | 닫힘 §5 | 2026-10-28 |
| ~~운영 빌드 재시도~~ | 닫힘 §5 | 2026-10-28 |
| ~~`ApiError` 단위 테스트~~ | 닫힘 §5(`@repo/core`) | 2026-10-28 |
| ~~서버 모르는 코인 차트 500~~ | 닫힘 §5 | 2026-10-28 |
| ~~BFF 422 `code`~~ | 닫힘 §5 | 2026-10-28 |
| 리스크 예산 · 태그 확정 오류 문구 실화면 | 두 화면은 `status` 만 보고 문구 분기가 없다(`code` 미사용) — 타입 통과로 갈음 | 그 화면이 `code` 로 문구를 가를 때 |

## 4. 짝 영역

처음 커밋은 BFF · 서버 · 예측 **변경 없음**. 후속 `f74c34f`(서버) · `3f38160`(BFF)은 §5. 파일 머리에 걸린 `BFF-REQ-009` · `026` · `038` · `040` · `FC-REQ-005` · `007` 은 주석 참조뿐이다(호출 계약 무변경).

## 5. 후속 — 미검증 닫기 (사용자 "다 검증하고 ㄱㄱ")

| 확인 | 결과 |
|---|---|
| 운영 빌드 재시도(`next start -p 3100` + BFF 4001) | 404 · 422 요청 **1**(310ms) · 500 요청 3(316 · 1321 · 3325ms) · 410 경고 0(운영은 안 찍는다) |
| 로그인 실화면 | 실 BFF → 서버 틀린 비밀번호 → "이메일 또는 비밀번호가 맞지 않습니다." · 고정 500 → "로그인하지 못했습니다." · 연결 거부 → "연결이 닿지 않았습니다." — 요청 각 1 · 서버 문장 노출 0 |
| 거래 기록 실화면(인증 요청만 고정 응답, 공개 시세는 실 BFF) | 409 `PORTFOLIO_INSUFFICIENT_QUANTITY` → "보유 수량보다 많이 매도할 수는 없어요" · 400 `KR_STOCK_NOT_AVAILABLE` → "이 종목은 기록할 수 없어요" · 500 → "지금은 기록하지 못했어요…" — POST 각 1 · 노출 0 |
| `ApiError` 단위 | `@repo/core` 51(신규 17) pass |
| 서버 차트 404(`f74c34f`) | 상시 4000 재시작 pid 80629: 분봉 · 일봉 모르는 코인 404 `MARKET_SYMBOL_NOT_FOUND` · BTC 200 · `npm test` 835 · `test:layer-check` · build pass |
| BFF `code`(`3f38160`) | 4001: `period=week` 422 `MARKET_CHART_PERIOD_UNSUPPORTED` · 서버 404 코드 통과 · `npm test` 287 · build pass |
| 모노레포 재실행 | check-types · lint 5/5 · test(ui 43 · core 51) · `test:layer-check` · 훅 사후(신규 4파일) · web · web-tax build pass |
