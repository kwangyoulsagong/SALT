---
id: SLICE-MONEY-DESKTOP-SAVINGS
title: "돈 관리 화면 디자인 2단계 — 저축(목록 · 목표 상세)을 데스크톱 틀로 + 목록 요약 띠 서버 경로"
priority: high
labels: [F012, design, fe, bff, server, slice]
created: 2026-11-19
status: in-progress
---

## Summary

사용자 "새 브랜치 파고 다음 파이프라인 진행" → `FE-REQ-060` 단계 표의 다음 칸 2단계 저축(1단계 가계부 PR #216 머지 뒤).
브랜치 `feat/fe-req-060-s2-savings`. FE + 서버 · BFF 더하기만(요약 띠 합).

한 줄 — **저축이 카드 두 장 + 세로 폼에서 데스크톱 틀이 됐다: 요약 띠(서버 합) → 목표 행 | 미리보기(`?goal=` · 넣기), 사이드에 나눠 넣기 · 저울 · 엽서. 상세는 머리 2줄 · 알약 탭 · 고정 열 넣기.**

## 범위

| REQ | 이번 몫 |
|---|---|
| `FE-REQ-060` | 2단계 — FR-8 · 9 · 11, FR-1 · 2 · 3 · 12 · 13 저축 몫. REQ 는 4단계까지 in-progress |
| `SRV-REQ-045` | FR-20 신규 · done — `GET /api/savings/overview`(합은 서버 · 쿼리 2회) |
| `BFF-REQ-047` | `GET /api/app/savings/overview` 그대로 전달 |
| 파일만 걸침 | `FE-REQ-056`(저축 화면 주인) · `FE-REQ-013`(조회 훅 머리) · `FE-REQ-047`(틀 · 웹뷰 훅) · `FE-REQ-049`(`DetailTabs` 둘째 소비처) · `FE-REQ-058`(때맞춘 팁 자리) |

## 판단 — 리뷰가 볼 곳

1. **요약 띠 합을 서버에 더했다** — 모은 돈 합 · 이번 달 넣은 돈 합 · 가장 이른 도달은 목록 응답에 없었다. 화면에서 더하면 수용 기준(금액 계산은 서버) 위반 → 새 경로. 목록 응답(배열)을 객체로 바꾸지 않았다 — 소비처(홈 · 앱)가 깨진다
2. **"가장 가까운 도달"의 정의** — 진행 중만, 구간 이른 끝 → 계획 달로 비교, 같으면 먼저 만든 목표. 구간 · 계획 달을 그대로 내려 한 점으로 접지 않는다(`ADR-003`)
3. **고르기는 주소에** — 행 = `<button>` + `?goal=`(`history.replaceState`, 가계부 `?day=` 와 같은 방식 — 서버 다시 렌더 0). 지운 · 남의 목표 id 면 첫 진행 중
4. **주 버튼은 화면당 하나** — 미리보기 · 상세 고정 열의 "기록하기"만 채움, 사이드 나눠 넣기 · 저울 확정 · 실물 단위 추가는 옅은 버튼
5. **앱 웹뷰** — `PageFrame` 사이드가 숨으므로 같은 도구를 본문 아래에(마운트 뒤 판정 훅 `useInAppWebview`). 모바일 배치(FR-M2)는 4단계
6. **같은 글자 두 번 규칙** — 이름 = 템플릿 이름이면 템플릿 표시를 뺀다(`templateTag`, 네 자리 한 규칙) · 제목 있는 패널 안 상자는 `bare`

## 커밋

체크리스트 `requirements/reports/checklists/MONEY-desktop-savings.md` · 회고 `requirements/reports/retrospects/MONEY-desktop-savings.md`.
