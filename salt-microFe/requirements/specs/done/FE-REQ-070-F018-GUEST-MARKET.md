---
id: FE-REQ-070
feature: F018
area: frontend
kind: UI
title: "로그인 없이 투자 화면 — 게스트 토큰 재발급 · 국내 노출 · 로그인 칸 유리막"
priority: high
created: 2026-11-10
source: "`FEATURE-018` · `ADR-011` · 짝 `BFF-REQ-055` · `SRV-REQ-056`"
---

## Summary

> **done 2026-11-10** — `e958e506`. 검증 `reports/checklists/FE-REQ-070.md`. 실화면 결함 둘(첫 방문 401 · 게스트 검색 멈춤) 같이 고침

비로그인이 투자 zone(`/investments` · 상세 · `/search`)을 연다. 시장 조회는 게스트 토큰으로 돌고, 사람 · AI 칸은 `@repo/ui` 유리막.
지금 비로그인 차단은 두 곳이다 — `PUBLIC_PATHS` 밖 401 → 로그인 화면(`refreshSession`), 그리고 조회마다 `enabled: useHasSession()`(약 86곳).

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | **게스트 발급 경로** — 셸 route handler `POST /api/session/guest` → 서버 `/api/auth/guest` → `salt_gt` httpOnly · Lax · path `/` · Max-Age = `expiresIn`. 로그인 · 로그아웃 경로가 `salt_gt` 를 지운다 | done |
| FR-2 | **세션 갱신 분기** — `refreshSession`: 로그인 표시(`salt_signed_in`) 있으면 지금처럼, 없으면 게스트 발급 후 원 요청 1회 재시도. 발급 403 → 지금처럼 로그인 화면 | done |
| FR-3 | **공개 경로** — `PUBLIC_PATHS` 에 `/investments` · `/search` · `/portfolio` · `/coach`(아래까지). 앱 내비가 같은 판정을 읽는다(`isPublicPath` 하나) | done |
| FR-4 | **시장 조회 조건** — 시장 데이터 훅(시세 · 국내 · 검색 · 곁 칸 · 업종 · 뉴스 · 본문 · 왜 움직였나 · 차트 · 요약)의 `useHasSession` 조건을 뗀다. 사람 · AI 훅(관심 · 포트폴리오 · 코치 · 해설 · 성적표 · 거래)은 그대로 — 판정 목록은 테스트 표로 고정 | done |
| FR-5 | **국내 노출** — `useKrMarketStatus` 가 게스트도 `ok` → 국내 탭 · 머리 메뉴 · 표 · 거래대금 상위. WS 국내 구독이 로그인 표시 없이도 연다(게스트 쿠키) | done |
| FR-6 | **유리막** `@repo/ui` `SignInGlass` — 흐림 + 자물쇠 + "로그인하고 {칸} 보기"(돌아올 주소 `?next=`). 아래 내용은 자리 표시 틀(실데이터 0) · 흐린 칸 `aria-hidden` · 단추만 포커스. 스토리 | done |
| FR-7 | **적용** — ★(표 행 · 상세 · 검색 줄 — 자물쇠 단추) · 상세 코치 판단 · 해설 · 거래 기록 · 보유 · `/portfolio` 본문 · `/coach/*` 본문 · 투자 머리 메뉴 사람 항목 | done |
| FR-8 | **보이는 문서** — 공개 경로 메타 제목 · 설명. `/search` 는 지금처럼 로봇 닫힘 | done |

## Acceptance Criteria

- [x] 쿠키 0 새 프로필 실화면: `/investments`(코인 · 국내) · 국내 상세 · `/search` — 로그인 화면 0, 실시간 점 · 호가 · 본문
- [x] 유리막 칸 전부 · 응답에 사람 · AI 값 0(네트워크)
- [x] 만료 이어 보기(짧은 TTL) · 발급 403 → 로그인
- [x] 로그인 비소유자 임시 사용자 — 국내 · 판단 보임 · 전망 없음
- [x] 390 앱 웹뷰 UA — 지금과 같음(늘 로그인)
- [x] `pnpm check-types` · `lint` · `test` · 투자 · 셸 zone 빌드(worktree) · `build-storybook`

## Changelog
- 2026-11-10: 초안 · 구현 · 실화면 확인 → **done**
- 2026-11-13: F017 v4 순서 1a 짝(`feat/f017-v4-s1-scenario-always` — 이 REQ 가 머리 주인인 파일): 시나리오 카드도 사람 · AI 칸 가르개(`SignInRequired`) 뒤로 — 로그인 없이 보면 유리막("로그인하고 다음 시나리오 보기"). 주인 REQ `SRV-REQ-053` FR-10 · `BFF-REQ-052` FR-4 · `FE-REQ-064` FR-8
