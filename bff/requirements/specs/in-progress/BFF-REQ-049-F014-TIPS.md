---
id: BFF-REQ-049
feature: F014
area: bff
kind: API
title: "금융 팁 — 공개 /api/app/tips(인증 없음 · 캐시) · 때맞춘 팁 for-me"
priority: medium
created: 2026-10-30
source: salt-server/requirements/specs/to-do/SRV-REQ-047-F014-CONTENT.md
---

## FR

| FR | 내용 |
|---|---|
| FR-1 | `GET /api/app/tips` · `/api/app/tips/:slug` — 인증 없음. 개인 데이터 0. `Cache-Control` + ISR 재검증 태그 |
| FR-2 | `needs_check` 글은 `noindex` 메타 플래그를 응답에 |
| FR-3 | `GET /api/app/tips/for-me?context=` — 로그인 필요, 0~1건, 닫기 `POST .../:id/dismiss` |
| FR-4 | 개인화 실패 시 일반 예시로 폴백 |
| FR-5 | 공개 경로 레이트 리밋(검색 유입 대비) |
| FR-6 | 퀴즈 풀이 · 맞힌 카드 모음 · 글 응답의 바뀐 줄(S2b 신설 — `SRV-REQ-047` FR-7 · 8) |
| FR-7 | 내 숫자로 다시 읽기 `GET /api/app/tips/:slug/my-numbers`(S2d 신설 — `SRV-REQ-047` FR-6). 저축 목표 · 가계부 급여를 나란히 읽어 content 에 사실로 넘긴다(서비스끼리 부르지 않게 BFF 가 순서). 원천 하나 실패 = 그 원천만 못 읽음 · content 실패 = `reading: null`(글의 예시 그대로) · 401 · 404 그대로 · 끈 급여 칸은 쓰지 않음 · 금액 계산 0 |

## Acceptance Criteria

- [x] 공개 응답에 사용자 식별 정보 0 — 서비스 테스트(서버가 끼운 `userId` 를 버림) · 실스택 응답 grep
- [x] 비로그인 for-me → 401, 공개 글은 200 — 실스택(4001)

## 구현 현황 — 금융 팁 S2a(2026-11-05)

| FR | 상태 | 어디 |
|---|---|---|
| FR-1 공개 목록 · 글 | **done** — 인증 없음 · 서버 필드만(모르는 필드 버림) · `Cache-Control: public, max-age=60, stale-while-revalidate=600`. ISR 은 웹 zone(60초) | `app-tips.service.ts` · `tips.controller.ts` |
| FR-2 `noindex` | **done** — 서버 값 그대로(확인 필요 글) | 같은 파일 |
| FR-3 for-me · 닫기 | **done** — `GET /api/app/tips/for-me?context=`(세 값 밖이면 서버 앞에서 400 `INVALID_TIP_CONTEXT`) · `POST /api/app/tips/:slug/dismiss` · `no-store` | 같은 파일 · `tips.routes.ts` |
| FR-4 실패 폴백 | **done** — 1.5초 예산 · 시간 초과 · 5xx 면 `tip: null` + `degraded`(카드 없음 = 일반 화면), 401 은 그대로 | `TIP_FOR_ME_BUDGET_MS` |
| FR-5 레이트 리밋 | **done** — 공개 두 경로 IP 분당 120 | `PUBLIC_TIPS_RATE_LIMIT` |
| 라우팅 표 | `/content` → platform | `config/server-routes.json` |

## 구현 현황 — 금융 팁 S2b(2026-11-05, 루트 `requirements/specs/done/MONEY-S2b-tips-quiz-diff-slice.md`)

| FR | 상태 | 어디 |
|---|---|---|
| FR-6 퀴즈 풀이 | **done** — `POST /api/app/tips/:slug/quiz` `{ choice }`: 세션(쿠키 → 헤더)이 있으면 서버 기록 경로, 없으면 공개 채점. 세션이 있는데 서버가 401 이면 그대로 올린다(익명 채점으로 바꾸면 카드를 잃는다 — 화면이 갱신 뒤 다시 부른다). 보기 번호가 0 이상 정수가 아니면 서버 앞에서 400 `INVALID_QUIZ_CHOICE`. 공개 경로와 같은 IP 제한 · `no-store` | `app-tips.service.ts` `answerQuiz` · `tips.routes.ts` |
| FR-6 카드 모음 | **done** — `GET /api/app/tips/quiz-cards`(로그인) — `/:slug` 앞 | `quizCards` |
| FR-1 보강 | **done** — 글 응답 `quiz`(질문 · 보기만 — 서버가 정답을 실어도 버린다) · `revisions[].changes` | `detail` |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-05 | 금융 팁 S2a — to-do → in-progress. FR-1~5 done · 라우팅 표 `/content` → platform. 커밋 `36d1f7b9` |
| 2026-11-05 | 금융 팁 S2b — FR-6 신설 · done(퀴즈 풀이 · 카드 모음) · 글 응답에 `quiz` · `changes`. 커밋 `4b5a294b` |
| 2026-11-05 | 금융 팁 S2d — FR-7 신설 · done(내 숫자 — 원천 둘 → content). 글 응답 `myNumbers`. 커밋 `633057ad` |
