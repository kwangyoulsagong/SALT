---
id: DB-REQ-042
feature: F016
area: database
kind: Schema
title: "news_article_body — 기사 본문 캐시"
priority: medium
created: 2026-11-09
source: salt-server/requirements/specs/done/SRV-REQ-054-NEWS-ARTICLE-BODY.md
---

## Summary

`SRV-REQ-054` 의 캐시 표. 주인 `news` 컨텍스트(서비스 `market`). 마이그레이션 `20261109120000_news_article_body`(새 표 하나 — 되돌리기 = drop).

| 열 | 타입 | 비고 |
|---|---|---|
| `key` | text PK | `kr:<일련번호>` · `coin:<기사 id>` |
| `status` | text CHECK(`ok` · `not_found` · `failed`) | |
| `paragraphs` | jsonb `[]` | 글자 배열(태그 0) |
| `url` · `original_url` | text null | 본문을 읽은 주소 · 언론사 원문 |
| `fetched_at` | timestamp | 다시 찾을 때 판정 |
| `extractor_version` | int | 뽑기 규칙 판 — 다르면 찾음도 다시 |

- 쓰기는 한 문장 `INSERT … ON CONFLICT (key) DO UPDATE` — 동시 첫 저장도 오류 없이(`prisma-database.md`)
- 조회는 PK 하나 — 인덱스 추가 없음
- 보존: 지우지 않는다(행 수 = 연 기사 수, 하루 수십 건). 늘면 `fetched_at` 기준 정리를 그때 — 미검증 표

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-09 | 신규 · done — 로컬 운영 DB 적용 |
