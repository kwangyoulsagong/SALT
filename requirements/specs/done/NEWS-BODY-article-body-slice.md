---
id: SLICE-NEWS-BODY-ARTICLE-BODY
title: "뉴스 모달 기사 본문 — 국내 시황 · 코인"
priority: medium
labels: [F016, frontend, bff, server, slice, invest]
created: 2026-11-09
status: done
---

## Summary

사용자 2026-11-09: "우리도 상세 모달에 뉴스 기사 렌더링 해야지" · "국내도 똑같에" · "저작권 이게 의미가 없는게 어차피 우리 판매 안하잖아".
원장에는 본문이 없다(국내 제목만 · 코인 RSS 조각). 제목으로 포털 뉴스 검색 → 같은 기사 판정 → 페이지에서 문단만 → 캐시 → 모달.

> **done 2026-11-09** — 영역 REQ 넷 done. 검증 `requirements/reports/checklists/NEWS-BODY-article-body.md`. `ADR-009` 개정(본문은 사람이 읽는 화면만 · AI 입력 0).

## 범위

| REQ | 몫 |
|---|---|
| `SRV-REQ-054` | 판정 · 뽑기 · 정리 · 캐시 · 경로 둘 · SSRF |
| `DB-REQ-042` | `news_article_body` |
| `BFF-REQ-053` | 경로 둘 · 한 뷰모델 · 실패 격리 |
| `FE-REQ-068` | 모달 본문 칸 · 되돌림 · 문구 |

## 판단

1. **같은 기사가 아니면 붙이지 않는다** — 겹침 0.8 · 2일. 틀린 본문은 본문 없음보다 나쁘다
2. **주인은 `news` 컨텍스트** — 국내 경로는 `market` 이 소유자 판정 뒤 ACL 로 부른다(남의 표를 읽지 않는다)
3. **찾음은 영구 캐시 + 뽑기 판 번호** — 규칙을 고치면 저절로 다시 찾는다
4. **AI 입력 0** — 포털 API 약관(AI 답변 생성 금지) · 저작권 소송 진행. 화면 읽기만
5. **실패해도 화면은 예전 그대로** — 코인 요약 + 원문 · 국내 안내 한 줄

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-09 | 신규 · done |
