---
id: SLICE-MONEY-DESKTOP-HOUSEHOLD
title: "돈 관리 화면 디자인 1단계 — 가계부(한 달 · 지출 적기 · 예산)를 데스크톱 틀로"
priority: high
labels: [F013, design, fe, slice]
created: 2026-11-19
status: in-progress
---

## Summary

사용자 "새브랜치 파고 다음 파이프라인" → 마스터 인덱스 §4-1 순위 5 디자인의 다음 칸 `FE-REQ-060`. 사용자 "단계별 PR" — 1단계 가계부 → 2 저축 → 3 금융 팁 → 4 앱 웹뷰 모바일.
브랜치 `feat/fe-req-060-money-screens`. FE 만 — 서버 · BFF 계약 변경 0(날마다 합은 이미 응답의 달력 칸에 있었다).

한 줄 — **가계부가 휴대폰을 늘린 한 장에서 데스크톱 틀이 됐다: 요약 띠 → 날짜로 묶은 쓴 내역 | 달력(그날 돈 · 고른 날), 오른쪽 사이드에 바로 적기 · 봉투 · 분류 · 착지 · 도구.**

## 범위

| REQ | 이번 몫 |
|---|---|
| `FE-REQ-060` | 1단계 — FR-1~7 · 12 · 13 가계부 몫(스펙 "단계" 표). REQ 는 4단계까지 in-progress |
| 파일만 걸침 | `FE-REQ-057`(가계부 화면 주인) · `FE-REQ-047`(틀 · 공용 부품) · `FE-REQ-058`(때맞춘 팁 자리) |

## 판단 — 리뷰가 볼 곳

1. **화면에서 금액을 만들지 않는다** — 그날 합은 서버 달력 칸, 분류 막대는 서버 행 그대로(묶음 합 0), 예산 아래 합은 저장한 합(서버 `total`). 막대 길이 비율만 화면
2. **고르기는 주소에** — 달력 칸 누름 = `?day=`(목록 + 미리보기 패턴). 안 쓴 날 표시는 칸 누름에서 고른 날 칸 버튼으로 옮겼다(기능 그대로)
3. **회색 상자 언어를 한 번에** — 같은 꼴(모서리 12 · weakFill) 12곳을 정보 상자로. 화면 둘만 고치면 다른 가계부 화면에서 또 나온다
4. **공용 부품 넷** — `SummaryBand` · `ListRow density="desk"` · `Button size="desk"` · `useDesktopViewport`(저축 단계도 쓴다)
5. 사이드는 앱 웹뷰에서 숨는다(`PageFrame`) — 그래서 도구 링크는 1024 미만 · 웹뷰에서 본문 위 한 줄

## 커밋

체크리스트 `requirements/reports/checklists/MONEY-desktop-household.md` · 회고 `requirements/reports/retrospects/MONEY-desktop-household.md`.
