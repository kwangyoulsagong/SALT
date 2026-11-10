---
id: BFF-REQ-055
feature: F018
area: bff
kind: API
title: "게스트 쿠키 → Authorization · 시장 경로 인증 완화 · 게스트 실시간 상한"
priority: high
created: 2026-11-10
source: "`FEATURE-018` · `ADR-011` · 서버 짝 `SRV-REQ-056`"
---

## Summary

BFF 는 토큰을 검사하지 않고 넘긴다(서버가 판정). 이 REQ 는 ① 게스트 쿠키를 넘기는 순서 ② BFF 자체 `authMiddleware`(헤더 있나만 보는 것)가 걸린 시장 경로를 푼 것 ③ 게스트 실시간 중계 상한이다.

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | **쿠키 순서** — `cookieSessionMiddleware`: `Authorization` 있으면 그대로 → 없으면 `salt_at` → 없으면 `salt_gt`. 같은 origin 판정 그대로. WS 연결 토큰도 같은 순서(`?token=` → `salt_at` → `salt_gt`) | Draft |
| FR-2 | **시장 경로** — BFF `authMiddleware`(헤더 존재 검사)를 시장 경로에서 뗀다: 통과 `/api/investment/crypto/:symbol/price` · `/api/app/market` · `/:symbol` · `/:symbol/why-moved` · `/api/app/market/kr/*` · `/api/app/search` 넷 · `/api/app/news/:id/body`. 토큰 없으면 서버가 401(BFF 는 그대로 전달). 사람 경로는 그대로 | Draft |
| FR-3 | **뷰모델 사람 칸** — 시장 화면 · 상세 조합이 사람 경로(관심 · 보유 · 코치)를 같이 부르는 자리는 그 결과가 401 이면 칸 `null` 로(전체 실패 아님). 게스트 판정은 하지 않는다 — 결과로만 | Draft |
| FR-4 | **게스트 실시간 상한** — 국내 중계 `MAX_RELAYS` 를 사람 · 게스트로 나눔(설정 `KR_RELAYS_USER` 20 · `KR_RELAYS_GUEST` 20). 게스트 판정 = 연결이 `salt_gt` 로만 인증. 상한 → `KR_STREAM_LIMIT`(화면은 폴링 값). 토큰 만료로 서버 SSE 401 → 지금처럼 `KR_STOCK_AUTH_REQUIRED`(화면이 새 토큰으로 다시 구독) | Draft |
| FR-5 | **주석 정정** — `kr-stock.routes.ts` "비회원 · 공개 응답에 국내 0건" · `kr-stream.manager.ts` "소유자 전용" 주석을 `ADR-011` 로 | Draft |

## Acceptance Criteria

- [ ] 쿠키 순서 표 테스트(헤더 · 사람 · 게스트 · 둘 다 · 다른 origin)
- [ ] 게스트 토큰으로 시장 화면 조합 200 · 사람 칸 `null` · 코치 칸 `null`
- [ ] 게스트 상한 테스트(사람 연결은 영향 0)
- [ ] `npm run build` · `npm test`
