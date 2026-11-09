---
id: SLICE-FE-065-NEWS-ROW-MODAL
title: "뉴스 행 한 벌 · 상세 모달 — 국내 시황/공시 · 코인 기사"
priority: medium
labels: [F016, frontend, bff, server, slice, invest]
created: 2026-11-09
status: done
---

## Summary

사용자 2026-11-09: "뉴스 프리뷰 UI … 폰트나 그런 것들 안 맞아 · 뉴스 상세도 모달 띄워서 똑같이" + "딥리서치". 참고 국내 증권 앱 웹을 실측(`salt-microFe/requirements/reports/research/2026-11-09-news-ui-measure.md`)하고
세 자리 뉴스를 한 벌 행 + 읽는 모달로. ~~본문은 싣지 않는다(사용자 결정 — 요약 + 원문 링크).~~ **정정 2026-11-09: 본문은 뒤 슬라이스 `NEWS-BODY-article-body-slice.md`**(사용자 결정 바뀜 · `ADR-009` 개정).

> **done 2026-11-09** — 커밋 `5924a94f`(조사) · `5d6f18f8`(서버) · `d9726f50`(BFF) · `e8e02b90`(ui) · `c274feaa`(FE) · `77fbd19b`(죽은 파일). 영역 REQ `FE-REQ-065` in-progress(FR-8 390 바텀 시트 남음). 검증 `requirements/reports/checklists/FE-065-news-row-modal.md`.

## 범위

| REQ | 몫 |
|---|---|
| `FE-REQ-065` | FR-1~7 · 9(정정 셋) |
| 짝 `SRV-REQ-051` · `BFF-REQ-051` | 오늘 소식 `related`(새 경로 대신) |
| `FE-REQ-044` | `@repo/ui` Modal `article` |

## 판단

1. **새 경로 대신 목록에 칸 하나** — 모달은 목록 값으로 연다(요청 0)
2. **모달은 entities `market`** — 미리보기가 entities 층(조사안 `features/read-news` 는 레이어 위반)
3. **주소 `?news=`** — 열기 push · 전환 replace · 닫기 back(연 것) / 쿼리 삭제(주소로 들어옴)
4. ~~**본문 0** — 국내는 원천에 없고 코인은 계약이 없다(`ADR-009`, 사용자 2026-11-09)~~ 같은 날 뒤집힘 — 본문은 `FE-REQ-068`
