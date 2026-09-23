# F000 세션 슬라이스 — 로그인 계약 · 토큰 갱신 — 체크리스트

슬라이스: `requirements/specs/in-progress/F000-web-session-slice.md` · 2026-09-23
브랜치: `feat/fe-token-refresh` (base `main` `4baa30e`)
영역 체크리스트: `salt-microFe/requirements/reports/checklists/FE-REQ-011.md` §10

## 요약

| 확인 | 결과 |
|---|---|
| 초대 수락(계정 생성) | `POST /api/app/onboarding/invite` **201** · `{ user, accessToken, refreshToken }` |
| 로그인 | `POST /api/auth/login` **200 · 90ms** · 토큰 둘 다 · 오답 **401 `AUTH_INVALID_CREDENTIALS`** |
| 그 토큰으로 코치 | `GET /api/app/ai-coach/detail?symbol=BTC` **200 · 599ms** · 두 모드 `renderable: true` |
| 갱신 | `POST /api/auth/refresh` **200 · `{ accessToken }`** (리프레시 토큰 회전 없음) |
| 갱신 정책 단위 테스트 | **9 pass** — 200 통과 · 401 1회 재시도(헤더 교체 확인) · 재시도 401 중단 · 무인증 401 제외 · 갱신 실패 시 401 그대로 · `init`(method·body) 보존 · 단일 비행 3 |
| 로그인 화면 | 빌드 후 `next start -p 3100` 서버 HTML — `<input>` 2(`label` 이메일 · 비밀번호) · `<button>` 1 · 브랜드 · 제목 · 초대 링크 |
| 목 제거 | `app/mock/handlers/auth.ts` · `responses/auth.ts` · `types/auth.ts` 삭제, 참조 0 |
| **만료 사슬 실측** | 1시간 지난 토큰으로 `detail` **401** → `refresh` **200**(새 토큰) → 같은 요청 재시도 **200 · 9ms** · 두 모드 `renderable: true` |
| 갱신 실패 | 죽은 리프레시 토큰 → **401 `AUTH_SESSION_EXPIRED`** — 이때 세션을 비우고 로그인으로 보낸다 |
| 게이트 | `check-types` · `lint`(monorepo `--max-warnings 0`) · `pnpm test` **63**(core 20 · ui 43) · `build`(worktree) |

## 무엇이 실제 원인이었나

사용자 보고는 "코치 프리뷰가 안 뜬다 · 인증키가 없나"였다. 순서대로 확인한 결과:

1. 서버 · BFF 는 정상 — 유효 토큰으로 `detail` 200, 두 모드 `renderable: true`
2. 브라우저만 실패 → 토큰 문제
3. 액세스 토큰 15분 + **갱신 경로 없음**(리프레시 토큰은 저장만 됨)
4. 그런데 더 앞이 있었다 — **로그인 자체가 목**이었고 `mock-jwt-token` 을 저장하고 있었다

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| ~~브라우저에서 로그인 → 코치 표시~~ | — | **2026-09-23 사용자 확인 — 된다**(웹에서 실제 로그인 후 화면 동작) |
| 브라우저 화면에서의 갱신 · 리다이렉트 | 만료 사슬은 **실제 만료 토큰으로 검증했다**(요약 표). 남은 것은 `localStorage` 배선뿐이고, 로그인이 같은 파일·같은 키를 쓴다 | 확장 연결 시 화면으로 |
| 로그인 화면 시각 확인 · 참고 화면 치수 비교 | Chrome 확장 미연결 | 확장 연결 시 |
| `BFF-REQ-036` 이 남긴 "401 된 5경로의 프론트 동작" | 같은 이유 | 위와 같다 |
| FR-61 비공개 경로 가드 | 토큰이 `localStorage` | `FE-REQ-013` |
| 기존 계정(`watchlist-check@local.test`) 로그인 | 비밀번호를 모른다. 새 계정(`login-check@local.test`)으로 검증했다 | — |
