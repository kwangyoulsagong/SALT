---
id: SRV-REQ-056
feature: F018
area: backend
kind: API
title: "게스트 토큰 · 시장 경로 읽는 사람 판정 · 국내 소유자 판정을 전망만으로"
priority: high
created: 2026-11-10
source: "`FEATURE-018` · `ADR-011`(사용자 결정 2026-11-10)"
---

## Summary

> **done 2026-11-10** — `3013b59f`. 검증 `reports/checklists/SRV-REQ-056.md`. FR-2 클라이언트 IP 상한만 배포(`OPS-001`) 때 — 지금은 서버 전체 상한

시장 데이터를 로그인 없이 연다. 서버가 **게스트 토큰**을 발급하고, 시장 경로는 사람 토큰 또는 게스트 토큰("읽는 사람")으로 받는다.
국내 시세의 소유자 판정(`isKrStockViewer`)을 시장 읽기에서 걷고, 국내 코치 판단 · 미러 · 복기 · 거래 · 관심은 로그인 전체로. **전망 · 주요 사건 · 포지셔닝은 소유자 그대로**(`ADR-003`).

착수 전 네 질문(`msa-services.md` §1): ① `identity`(발급) · `market`(읽기 판정) · `coach`(국내 판정) ② S3b · S5 전 — Express ③ 표 쓰기 0 · DDL 0 ④ 새 경로 하나(`POST /api/auth/guest`) + 기존 경로 인증 완화(`BFF-REQ-055`).

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | **발급** `POST /api/auth/guest`(인증 없음) → `{ guestToken, expiresIn }`. 서명 비밀 = `HMAC(JWT_SECRET, "salt-guest")`(새 필수 env 0) · `aud: "guest"` · 수명 `GUEST_TOKEN_TTL`(기본 30분) · 사람 식별자 0. 설정 `PUBLIC_MARKET_GUEST`(기본 켬) 꺼짐 → 403 `GUEST_DISABLED` | done |
| FR-2 | **발급 상한** — `GUEST_ISSUE_PER_WINDOW`(기본 300) / 10분, 서버 메모리 창(`rateLimit`). 넘으면 429. ~~IP 당~~ 요청이 전부 BFF 를 거쳐 와 키(`req.ip`)가 하나 — **사실상 서버 전체 상한**(초대 경로 상한과 같은 처지). 클라이언트 IP 상한은 `X-Forwarded-For` 사슬 + `trust proxy` 가 먼저 — 배포(`OPS-001`) 때 | done |
| FR-3 | **`marketReaderMiddleware`** — 사람 토큰 검증 성공 → `req.reader = { kind: "user", userId, email }` + `req.user`(기존 소비처), 실패 시 게스트 비밀로 검증 → `{ kind: "guest" }`, 둘 다 실패 → 401. **불변식: 게스트 토큰은 `authMiddleware` 를 통과하지 못한다**(비밀이 달라 서명 불일치 — 테스트로 고정) | done |
| FR-4 | **시장 경로 교체** — `krStock.routes.ts` 전체(일정 · 장 상태 · 목록 · 검색 · 지수 · 요약 · 상세 · 차트 · 투자자 · 호가 · 장중 수급 · 뉴스 · 본문 · 왜 움직였나 · SSE) · `investment.routes.ts` 왜 움직였나 · 검색 넷 · `news.routes.ts` 본문 → `marketReaderMiddleware`. ★ · 관심 · 포트폴리오 · 코치 · 북마크는 `authMiddleware` 그대로 | done |
| FR-5 | **사람 칸** — 검색 `isTracked` 는 게스트에게 `null`(계산 0, 관심 표 읽기 0). 다른 시장 응답엔 사람 칸 없음(확인) | done |
| FR-6 | **국내 판정** — 시장 읽기(`ReadKrStock` · `GetKrMarketSummary` · `SearchAssets` · `SearchExtras` · `assertViewer` · `krStockListing`)에서 소유자 판정 제거 → 국내 키 꺼짐(503)만 남는다. `ManageWatchlist` · 거래 기록 국내 · `GetSymbolCoach` 국내 · `GetKrBehaviorMirror` · `ManageMonthlyReview` 국내 · `GetJudgmentScoreboard` 국내 · `ExplainCoachDecision` 국내 = 로그인 전체. `GetSymbolForecast` · `Events` · `Positioning` = `FORECAST_OWNER_EMAILS` 그대로 | done |
| FR-7 | **관리 수집 경로** `POST /api/news/admin/crawl` — 지금 로그인만(조사 2026-11-10 — 누구나 수집 실행). 소유자만 | done |
| FR-8 | **Swagger** — 새 경로 · 시장 경로 인증 표기(`bearerAuth` 사람 또는 게스트) | done |

## Acceptance Criteria

- [x] 경계 표 테스트: {사람 · 게스트 · 만료 게스트 · 없음 · 엉뚱한 서명} × {시장 경로 · 사람 경로} — 게스트 × 사람 경로 = 401 전부
- [x] 발급 상한 · 꺼짐 403 · 수명 테스트
- [x] 국내 판정: 비소유자 사람 = 국내 시세 · 판단 200, 전망 404 그대로
- [x] 실호출: 게스트 토큰으로 국내 상세 · 호가 · SSE 첫 이벤트 · 검색 국내 결과(`isTracked: null`)
- [x] `npm run lint` · `npm test` · `noParallelRowWrites` 그대로

## Changelog
- 2026-11-10: 초안 · 구현 · 실화면 확인 → **done**
- 2026-11-11(1c): `feat/f017-s1c-collection`: `env.ts` — `KIS_REQUESTS_PER_SECOND` 비우면 주소로(모의 1 · 실 3) · `KIS_MAX_IN_FLIGHT`(`SRV-REQ-057` FR-3). 손님 시세 변경 0
- 2026-11-11(F017 v2 단계 3, `feat/f017-s3-explain-always`): `env.ts` — `COACH_LLM_LOCAL_USERS` · `LLM_USER_DAILY_CALL_LIMIT` 삭제(해설이 배치 하나 — 사람마다 고르거나 세지 않는다, `.env` 에 남아도 스키마가 무시). 손님 시세 변경 0
- 2026-11-11(F017 v2 단계 5, `feat/f017-s5-short-direction`): F017 v2 단계 5 — `ownerGateScope` 허용표에 `GetSymbolScenario`(확률 = 전망과 같은 소유자 전용, `ADR-003`). 국내 판정 0 그대로
| 2026-11-12 | F016 단계 D(짝 — 이 REQ 가 머리 주인인 파일): `env.ts`(머리 주인)에 `MOVE_SUMMARY`(on/off) 하나. 한 줄 읽기 경로는 시장 경로와 같은 읽는 사람(`marketReaderMiddleware` — 게스트 포함) |
