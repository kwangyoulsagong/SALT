# SRV-REQ-056 체크리스트 — 게스트 토큰 · 시장 경로 읽는 사람 · 국내 소유자 판정 정리

커밋 `3013b59f`(본체) · `69da540d`(실화면에서 본 504 5회차 — 주인 `DB-REQ-017`). 2026-11-10.

## FR ↔ 구현

| FR | 구현 | 확인 |
|---|---|---|
| FR-1 발급 | `auth/application/IssueGuestToken.ts` · `auth/domain/ports.ts` `GuestTokenIssuer` · `JwtTokenIssuer.issueGuest` · `shared/lib/jwt.ts` `generateGuestToken`(비밀 = `HMAC(JWT_SECRET)` · `aud: salt-guest` · 30분) · `POST /api/auth/guest` | `issueGuestToken.test.ts`(켬 · 꺼짐 403 `GUEST_DISABLED`) · 실호출 `{ guestToken, expiresIn: 1800 }` · 본문 `kind` · `aud` · `exp` · `iat` 뿐(사람 식별자 0) |
| FR-2 발급 상한 | `auth.routes.ts` `rateLimit(GUEST_ISSUE_PER_WINDOW / 10분)` | **IP 당이 아니다** — BFF 뒤라 키가 하나(서버 전체 상한, REQ 정정). 클라이언트 IP 는 미검증 표 |
| FR-3 읽는 사람 | `shared/presentation/marketReaderMiddleware.ts` | 경계 표 6 × 2(사람 · 게스트 · 만료 게스트 · 없음 · 엉뚱한 서명 · 만료 사람 × 읽는 사람 · 사람) — **게스트 × `authMiddleware` = 401** · 만료 사람 토큰은 게스트로 내리지 않고 "Token expired" |
| FR-4 시장 경로 | `krStock.routes.ts` 전체 · `investment.routes.ts` 왜 움직였나 · 검색 넷 · `news.routes.ts` 본문 | BFF 경유 게스트 토큰 16 경로 200 · 사람 경로 9곳 401(관심 · 포트폴리오 · 코치 상세 · 성적표 · 전망 · 홈 · 알림 · 저축(Kotlin) · 코치 리포트) · 토큰 없음 401 |
| FR-5 사람 칸 | `SearchAssets` `userId: null` → `isTracked` · `isHeld` · `tracked` null · 관심 · 보유 읽기 0 | `searchAssets.test.ts` 게스트 행 · 실호출 `tracked: null` |
| FR-6 국내 판정 | `isKrStockViewer` 삭제 · 시장 읽기 · 관심 · 거래 · 국내 판단 · 미러 · 복기 · 해설에서 소유자 판정 제거 · 전망 셋 그대로 | 기계 검사 `ownerGateScope.test.ts`(`isForecastOwner` 는 전망 셋 + 해설 라우팅만 · `isKrStockViewer` 0 — 위반 파일을 넣어 실패 확인 뒤 지움) · 실호출 비소유자 시험 신원: 국내 상세 · 성적표 200 · 전망 404 |
| FR-7 관리 수집 | `ownerOnlyMiddleware` · `POST /api/news/admin/crawl` | 미들웨어 테스트(소유자 · 대소문자 · 다른 이메일 403 · 없음 403) |
| FR-8 Swagger | 새 경로 · 국내 경로 401 표기 · "소유자 전용" 문구 정리 · 없어진 `COACH_KR_STOCK_NOT_AVAILABLE` 표기 삭제 | `grep` 0 |

## 검증

| Check | 결과 |
|---|---|
| Build · tsc | 0 |
| Lint | `eslint src` 0 |
| Test | 1080 통과(테스트 47개를 새 계약으로 · 새 테스트 셋 + 기계 검사 둘) |
| Layer | Bash 로 쓴 파일 59 훅 사후 실행 위반 0(음성 대조 exit 2) |
| Prisma | 이 REQ DDL 0(504 고침의 표 설정 마이그레이션은 `DB-REQ-017`) |
| 실스택 | 서버 · BFF 재기동 뒤 게스트 · 비소유자 실호출(위 표) |

## 미검증

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 게스트 발급 클라이언트 IP 상한 | 셸 → BFF → 서버에 `X-Forwarded-For` 사슬 · `trust proxy` 가 없다(초대 경로 상한도 같은 처지) | 배포 라우팅(`OPS-001`) 때 |

## F017 단계 1c 수집 따라잡기 (2026-11-11, `feat/f017-s1c-collection`)

| 항목 | 상태 | 근거 |
|---|---|---|
| 이 REQ 에 닿은 변경 | 충족 | `env.ts` — `KIS_REQUESTS_PER_SECOND` 비우면 주소로(모의 1 · 실 3) · `KIS_MAX_IN_FLIGHT`(`SRV-REQ-057` FR-3). 손님 시세 변경 0 · `npm test` 전체 · lint · build · 레이어 훅 사후(음성 대조 exit 2) |

## F017 v2 단계 3 (2026-11-11, `feat/f017-s3-explain-always`)

| 항목 | 상태 | 근거 |
|---|---|---|
| env 두 키 삭제 | 충족 | build · 실서버 재기동 · 배치 회차 |
