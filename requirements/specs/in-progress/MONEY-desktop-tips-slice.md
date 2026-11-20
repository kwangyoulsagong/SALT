---
id: SLICE-MONEY-DESKTOP-TIPS
title: "돈 관리 화면 디자인 3단계 — 금융 팁(목록 · 글 · 카드 모음)을 데스크톱 틀로 + 내게 맞춘 팁 사이드"
priority: high
labels: [F014, design, fe, slice]
created: 2026-11-20
status: in-progress
---

## Summary

사용자 "새 브랜치 파고 다음 파이프라인 진행" → `FE-REQ-060` 단계 표의 다음 칸 3단계 금융 팁(2단계 저축 PR #217 머지 뒤).
브랜치 `feat/fe-req-060-s3-tips`. FE 만 — 서버 · BFF 0(기존 `for-me` 경로).

한 줄 — **공개 금융 팁이 휴대폰 폭 회색 상자 목록에서 데스크톱 틀이 됐다: 본문 패널 · 목록 행(유효기한 오른쪽) · 사이드(맞힌 카드 · 내게 맞춘 팁). 공개 글 첫 로드는 틀 때문에 늘지 않게 서버 페이지 틀 입구를 따로 냈다.**

## 범위

| REQ | 이번 몫 |
|---|---|
| `FE-REQ-060` | 3단계 — FR-10 done(썸네일 칸 정정), FR-1 · 12 · 13 · G1 팁 몫. REQ 는 4단계까지 in-progress |
| `FE-REQ-058` | 팁 세 화면 배치 · 상태 한 줄 · 카드 모음 재시도 — 공개 · ISR · noindex 그대로 |
| `FE-REQ-009` | 레이어 표 features `tips-for-me` · `@repo/web-shared/ui/frame` 예외 하나 |
| 파일만 걸침 | `BFF-REQ-049`(기존 `for-me` 소비) · `FE-REQ-047`(래칫 · 틀 입구) · `FE-REQ-057`(가계부 두 화면 입구) · `FE-REQ-048` · `053` · `055`(셸 입구) · `FE-REQ-040`(셰브론 입구) |

## 판단 — 리뷰가 볼 곳

1. **썸네일 칸을 만들지 않았다** — 스펙이 기준 리스트 행 실측(72×60)을 적었지만 글에 그림이 없다(원문 · 응답 필드 0). 같은 아이콘 여섯 줄은 정보 0 → 정정 · 범위 밖
2. **공개 화면 첫 로드** — `PageFrame` 하나로 공개 글이 118 → 152 kB. 원인은 서버 페이지가 `@repo/web-shared/ui` 배럴을 값으로 읽어 배럴의 클라이언트 모듈(모션 탭 · 유리막 · 경계)이 실린 것(`performance-frontend.md` §7 의 슬라이스 배럴과 같은 원인). `optimizePackageImports` 는 효과 0 → 서버 페이지용 틀 입구 `@repo/web-shared/ui/frame` 를 내고 레이어 규칙 예외 하나(정확히 그 경로만). 121 kB. 같은 원인 가계부 두 화면도 옮김(지출 적기 −27 kB)
3. **내게 맞춘 팁 = 기존 계약** — 도메인 화면 카드가 쓰는 `for-me` 를 맥락 둘(저축 · 가계부)로 부른다. 무엇을 고를지는 서버, 사이드는 행 · 실패 판정만(`pickForMe` — 같은 글 한 행 · 행이 있으면 다른 맥락 실패를 가리지 않음 · 행이 없고 실패/degraded 면 "없어요" 대신 실패). 닫기는 사이드에 두지 않는다(카드 몫)
4. **공개 ISR HTML 은 사람마다 같다** — 사이드 개인 칸은 `ssr:false` 지연 잎, 로그인일 때만 요청(로그아웃 0)
5. **이동 경로 = 제목 두 번은 그대로** — 고쳤다가 되돌림. 다른 zone 상세가 모두 같은 꼴이라 바꾸려면 `BackNav` 규칙에서 한 번에

## 커밋

체크리스트 `requirements/reports/checklists/MONEY-desktop-tips.md` · 회고 `requirements/reports/retrospects/MONEY-desktop-tips.md`.
