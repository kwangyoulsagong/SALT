---
id: SRV-REQ-054
feature: F016
area: backend
kind: API
title: "기사 본문 — 포털 뉴스 검색으로 같은 기사를 찾아 문단만 캐시(국내 시황 · 코인)"
priority: medium
created: 2026-11-09
source: 사용자 2026-11-09 "상세 모달에 뉴스 기사 렌더링" · "국내도 똑같에" · ADR-009 개정
---

## Summary

원장에 본문이 없다 — 국내는 KIS 시황 **제목만**, 코인 RSS `content` 는 41~136자 조각이고 86% 가 중계 주소(2026-11-09 실측).
제목으로 포털 뉴스 검색을 해 **같은 기사**를 고르고, 그 기사 페이지에서 **본문 문단(글자만)** 을 뽑아 캐시한다. 모달을 처음 열 때 한 번.

서비스 `market`(S5 — Express `news` · `market` 컨텍스트, `msa-services.md` §2). 테이블 주인 `news`(`DB-REQ-042`). BFF 계약 새 경로 둘(`BFF-REQ-053`).

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | **같은 기사 판정** — 제목 글자 두 개 묶음 겹침(Dice) ≥ 0.8 · 게시 시각 차 ≤ 2일, **또는 줄인 제목**(짧은 쪽 12자 이상이 긴 쪽에 그대로 · 30분 안 — 확인 2회차). 매체 꼬리(` - 매체`) · `[머리말]` · 문장부호는 같게 본다. 못 넘으면 `not_found` — 비슷한 남의 기사를 붙이지 않는다. **전체 제목으로 못 찾으면 앞 낱말 다섯으로 한 번 더 검색**(포털이 긴 제목에 0건을 줄 때가 있다 — 확인 2회차) | done |
| FR-2 | **문단 뽑기** — 포털이 품은 기사는 본문 칸(`#dic_area`), 언론사 원문은 읽기 모드(Readability). 사진 · 사진 설명 · 스크립트 빼고 블록 · `<br>` 경계로 줄. EUC-KR 등 문자셋은 머리 · 메타로 | done |
| FR-3 | **정리** — 저작권 · 기자 메일 · 구독 · 면책 · 해시태그 · 사진 설명 · 화면 안내 꼬리 버림 · 문장으로 끝나지 않는 12자 미만 조각 버림 · 관련/주요 기사 목록 머리에서 멈춤 · 제목 되풀이 줄 버림 · 20,000자 · 80문단 상한 | done |
| FR-4 | **캐시** `news_article_body` — 찾음 영구 · 못 찾음 3시간 · 실패 30분 뒤 다시. 뽑기 판(`BODY_EXTRACTOR_VERSION`)이 바뀌면 찾음도 다시 · 같은 키 동시 호출은 검색 1회 | done |
| FR-5 | **경로** — 코인 `GET /api/news/:id/body`(로그인 · uuid) · 국내 `GET /api/market/kr/:code/news/:serial/body`(소유자 · 그 종목에 걸린 제목만 · 공시는 검색 없이 `not_found`). 응답 `{ status: ok | not_found | failed, paragraphs, originalUrl, fetchedAt }` | done |
| FR-6 | **안전** — 받는 페이지는 공인 주소만(DNS 를 푼 실제 주소로) · **리다이렉트마다 다시 검사**(숫자 주소는 DNS 조회를 건너뛴다 — 확인 2회차 결함) · http(s) · 8초 · 3MB · 리다이렉트 3. 원문 주소는 http(s) 만(`javascript:` 0). 문단은 글자만(태그 0) | done |
| FR-7 | **키 선택** — `NAVER_CLIENT_ID` · `NAVER_CLIENT_SECRET` 없으면 503 `NEWS_BODY_UNAVAILABLE`(캐시가 있으면 그것). 키 · 원문 응답 로그 0. **실패는 경고 로그 한 줄**(키 · 코드 · 상태 · 짧은 메시지 — 확인 2회차). 검색 4초(두 번이면 8) + 페이지 8초 = 최악 16초 | done |
| FR-8 | **AI 입력 0** — 본문은 화면 경로에만. 해설 · 코치 · 한 줄 요약(F016 단계 D)이 이 표를 읽지 않는다(`ADR-009` 개정 · 포털 API 약관) | done(읽는 곳 0 — grep) |

## Acceptance Criteria

- [x] 판정 · 정리 · 캐시 수명 허용/거절 표 테스트(`news/domain/__tests__/articleBody.test.ts`)
- [x] 유스케이스 — 캐시 · 못 찾음 · 실패 · 동시 1회 · 키 없음 503 · 옛 판 다시(`news/application/__tests__/articleBody.test.ts`)
- [x] SSRF 경계 표 · 문자셋 · 포털 본문 칸 실측 모양(`news/infrastructure/__tests__/articlePage.test.ts`)
- [x] 국내 경로 — 남의 일련번호 · 형식 오류 · 비소유자 404 · 공시 검색 0 · 원천 없음 503(`krMoveSources.test.ts`)
- [x] 실데이터 — 코인 21/25 · 국내 13/25(못 찾음 12 중 9 자동 생성 시황)

## 계약 영향

- BFF `BFF-REQ-053`(새 경로 둘) · 프론트 `FE-REQ-068` · DB `DB-REQ-042` · `ADR-009` 개정
- 규칙 `ddd-infrastructure.md` §6 외부 클라이언트 표에 행

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-09 | 신규 · done — FR-1~8. 실측 뒤 뽑기 규칙 판 3(포털 본문 칸이 글자를 직접 품음 · 언론사 관련 기사 목록 · 꼬리 줄) |
| 2026-11-09 | 확인 2회차 — 결함 다섯: 리다이렉트 숫자 사설 주소 통과(SSRF) · 원문 `javascript:` 주소 · 짧은 본문 문장 손실("구독자가" 등) · 긴 제목 검색 0건 · 줄인 제목 판정 실패 · 실패 이유 로그 0. 규칙 판 3 → 7 |
| 2026-11-10 | `news` 공개 API 에 `searchArticleTitles` · `symbolTagLists`(검색 모달 `SRV-REQ-055` `dd0bbdcc`) — 본문 경로 무변경 · 본문은 여전히 AI 입력 0 |
