# F000 슬라이스 — 웹 API 에러 모양 하나 — 체크리스트

슬라이스: `requirements/specs/in-progress/F000-api-error-normalize-slice.md` · 2026-10-28
브랜치: `feat/fe-req-012-error-normalize` (base `main` `714cc40`)
영역 체크리스트: `salt-microFe/requirements/reports/checklists/FE-REQ-012.md` (주) · 파일만 걸친 REQ 13곳은 각 체크리스트 2026-10-28 절

## 1. 커밋

| 커밋 | 영역 | 되돌리면 |
|---|---|---|
| `1a8bd5e` refactor(fe) | `shared/api/apiError` · 슬라이스 에러 클래스 9개 삭제 · 재시도 판정 · `ChartPeriod` · `api-convention.md` | 단독 revert 가능 — 계약 변경 없음. 4xx 가 다시 전역에서 두 번 더 불린다 |
| (docs) | 루트 3종 · 영역 REQ · 마스터 인덱스 · FEATURE-000 | 문서만 |

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
| 로그인 화면 · 거래 기록 · 리스크 예산 오류 문구 실화면 | 테스트 계정 비밀번호가 기록에 없다(의도). 코드 경로는 `error.code` 그대로(타입 통과) | QA 단계 |
| 운영 빌드(`next start`) 재시도 실측 | dev 만 쟀다 | 배포 환경 확정 시 |
| `ApiError` 단위 테스트 | 웹 앱에 러너가 없다(`FE-REQ-013`) | `FE-REQ-013` |
| 서버 모르는 코인 차트 500 | 서버 범위 · 명시 요청 필요 | 사용자 지시 시 `SRV-REQ-009` |
| BFF 422 · `AppError` 응답 `code` | BFF 범위 | `BFF-REQ-025` 후속 |

## 4. 짝 영역

BFF · 서버 · 예측 **변경 없음**. 파일 머리에 걸린 `BFF-REQ-009` · `026` · `038` · `040` · `FC-REQ-005` · `007` 은 주석 참조뿐이다(호출 계약 무변경).
