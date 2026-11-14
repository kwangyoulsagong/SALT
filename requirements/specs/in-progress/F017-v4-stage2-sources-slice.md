---
id: SLICE-F017-V4-STAGE2
title: "F017 v4 순서 2 — 원천: 기사 본문 AI 경로 · 공시 수집 · 사실 추출 · 회사 사정 칸"
priority: high
labels: [F017, slice, server, forecast, bff, fe]
created: 2026-11-14
status: in-progress (2a done 2026-11-14)
---

## Summary

전 영역 계획 `F017-v4-one-panel-global-plan.md` 의 순서 2. 패널의 "회사 사정" 칸(첫 실측 150종목 전부 결함)과 원인의 1차 근거를 채우는 **원천**.
사용자 2026-11-14: 칸이 끝날 때마다 파이프라인 · 검증 · 버그 검증을 스스로 하고 2d 까지 묻지 않고 간다.

| 칸 | 내용 | REQ | 상태 |
|---|---|---|---|
| 2a | **기사 본문 AI 경로** — 매체 목록(robots · 약관 원문 판정) · 매체 RSS 5분 · 같은 기사 잇기 · 원문 받기 · `via` · 덮임 줄 | `SRV-REQ-058` FR-1~7 · `OPS-004` FR-6 | **done 2026-11-14** — 목표 개정(켜진 매체 기준) |
| 2b | 공시 수집(OpenDART) — 목록 증분 · 회사 사정 필드 · 장중 5분 | `FC-REQ-026` FR-1~13 · `SRV-REQ-058` 원천 ① | to-do — **OpenDART 키 필요**(서버 · 예측 `.env` 에 없음) |
| 2c | 사실 추출 배치 — 공시 · 본문에서 `{ who, what, amount, unit, compared_to, when, kind }` · 숫자는 원문 대조 · 문장 저장 0 | `SRV-REQ-053` FR-14 · `DB-REQ-043` FR-9 | to-do |
| 2d | 회사 사정 칸 — 네 칸 + 한 줄 · 걸리는 점 늘 · 재료 없으면 "확인된 공시가 아직 없어요" · 패널 · BFF · 웹 | `SRV-REQ-053` FR-12 · `DB-REQ-043` FR-11 · `BFF-REQ-052` · `FE-REQ-064` | to-do |

## 판단 — 리뷰가 볼 곳 (2a)

1. **약관이 원천을 정한다** — robots 만 보면 국내 9곳이 남았지만 약관 원문(2026-11-14)에 크롤링 · AI 금지를 명시한 6곳을 끄자 3곳. 사용자 결정 "약관 위반 원천은 쓰지 않는다"를 그대로 적용. 메모 · 읽은 날은 `Outlets.ts` 한 곳(PR 리뷰를 지난다)
2. **robots 는 AI 토큰 전부** — 우리 이름이 달라도 매체가 ClaudeBot · GPTBot 을 막았으면 AI 이용을 막은 것으로 읽는다
3. **덮임 90% 목표를 "켜진 매체 기준"으로** — 전체 덮임은 숫자로 보이고 막힌 몫을 따로 센다(숨기지 않는다). 국내 원인 근거는 공시(2b)가 1차
4. **사람용 본문(포털)과 표를 나눴다** — AI 가 포털 행을 읽을 길이 구조적으로 없다 · `via` CHECK · 포털 이름 grep 시험
5. **문단은 오래 두지 않는다** — 추출 뒤 또는 7일 뒤 해시 · 길이만

## 계약 변경 (2a)

- DB — 마이그레이션 `20261114090000_ai_article_body`: `news_outlet` · `news_robots` · `news_feed_state` · `news_rss_item` · `news_ai_body`(사용자 열 0 · 되돌리기 = 표 지우기). 로컬 DB 적용
- 서버 내부 — `MarketApi.krNewsTitlesForAiBody`(추가만). HTTP · BFF · 화면 무변경
- 운영 — 뉴스 워커(`com.salt.news`)에 5분 회차 · `ops/salt.sh status` '본문 덮임' 줄 · `ops/ai-body-coverage.sql`

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-14 | 신규 — 2a done(`feat/f017-v4-s2-disclosure-body`) |
