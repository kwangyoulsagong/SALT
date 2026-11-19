---
id: SLICE-F006-PC-PANEL-GRID
title: "F006 PC 격자 — 코치 대화 화면을 1280 이상에서 칸 셋(대화 · 오늘의 추천 · 포지션 요약)으로 · 칸 옮기기 메뉴 · 배치 저장"
priority: medium
labels: [F006, db, server, bff, fe, ui, slice]
created: 2026-11-19
status: in-progress
---

## Summary

사용자 "새 브랜치 파고 다음꺼 진행 … 파이프라인 진행이란 뜻이야" — 마스터 인덱스 §4-1 순위 4 F006 줄 "다음: PC 격자 · F003"의 앞.
브랜치 `feat/f006-pc-panel-grid`. `@repo/ui` `MovableGrid`(이진 트리 분할)는 9월부터 있었지만 쓰는 화면 · 배치 저장 계약이 없었다.

한 줄 — **1280 이상에서 `/coach/chat` 이 같은 대화를 왼쪽 칸에 두고 오늘의 추천 · 포지션 요약을 옆 칸에 놓는다. 칸은 끌거나 메뉴로 옮기고, 배치는 사람마다 저장한다. 저장은 편의 기능이라 실패해도 기본 배치로 돈다.**

## 범위

| REQ | 이번 몫 |
|---|---|
| `DB-REQ-021` | FR-20~24 `panel_layouts`(사람당 서피스당 한 줄 · 서피스 CHECK · 크기 CHECK · 등급 주석 · 계정 삭제 목록) |
| `SRV-REQ-029` | 패널 배치 GET · PUT · FR-30 16KB 413 · Swagger |
| `BFF-REQ-027` | FR-50~52(모양 안 봄 · 16KB 413 · 읽기 실패는 `degraded` 로 기본 배치) |
| `BFF-REQ-028` | 엔드포인트 `GET/PUT /api/app/coach/panel-layout` · `PanelLayoutResult` |
| `FE-REQ-030` | FR-50~58 PC 이동식 격자 · 기본 배치 · 키보드 대체 메뉴 · 저장 · `ssr:false` · 1280 미만 그대로 · 칸 내용은 페이지가 |
| `FEATURE-006` | A절 FR-5 · FR-6 |
| 짝(파일만 걸침) | `FE-REQ-047` FR-13(막힌 카드 보조 글 대비 — PR #205 가 놓친 한 줄) · `FE-REQ-005`(`Menu` 폭 · 위로 열기 · 포커스 복귀 · `MovableGrid` 칸 넘침) |

## 판단 — 리뷰가 볼 곳

1. **격자는 새 경로가 아니라 `/coach/chat` 의 PC 배치** — 3탭 IA 를 만들지 않았고(`FE-REQ-064` · `069` 로 투자 zone 머리 메뉴가 탭 자리) 코치 탭 = 코치 대화다.
   같은 페이지 슬라이스가 두 배치를 준다(FR-5). 폭은 `useWideViewport`(첫 렌더 `null` — 수화 갈림 0)로 알고, 알기 전에는 어느 배치도 그리지 않는다:
   한 배치를 그렸다 다른 배치로 다시 마운트하면 대화 칸 스크롤 · 입력이 날아간다. 자리표시 높이는 CSS 미디어 쿼리라 PC 에서 첫 렌더부터 격자 높이
2. **저장 배치의 형식 주인은 `@repo/ui/layoutTree`** — 서버 · BFF 는 객체인지 · 크기만 본다(`DB-REQ-021` FR-24). 대신 `parseLayout` 이
   칸 목록과 정확히 맞을 때만 쓴다(모르는 칸 · 빠진 칸 · 같은 칸 둘 · 같은 가지 id 둘 · 깨진 모양 · 2n-1 마디 초과 → 기본 배치) — 칸 구성이 바뀐 뒤 옛 저장이 화면을 깨지 않게
3. **`MovableGrid` 결함 — 새 가지 id 가 모듈 카운터** — 저장 배치를 되살린 뒤(새로 고침 = 카운터 0) 칸을 옮기면 같은 id 가지가 둘 생겨 구분선 하나가 둘을 움직였다.
   새 가지 id 는 그 트리에 없는 것으로(`freshSplitId`). 저장 계약을 붙이면서 처음 드러나는 결함이라 같은 브랜치에서 고쳤다
4. **오늘의 추천 카드는 옆 칸에 한 번만** — 브리핑 카드가 대화 안에도 붙는다. 같은 판단이면 대화 안 카드를 "옆 칸 오늘의 추천과 같은 판단이에요" 한 줄로
   접는다(`isSameCard` = `firstCardHolders` 와 같은 열쇠 — `screen-desktop.md` §5 같은 숫자 두 번 금지)
5. **포지션 요약 = `/portfolio` Hero 와 같은 응답 · 같은 컴포넌트** — 흐름 · 레이더는 포트폴리오에. 칸 아래 셰브론 줄로 이어진다
6. **저장은 사용자가 바꾼 뒤 멈추면 한 번(800ms)** — 구분선을 끄는 동안 PUT 이 쏟아지지 않게(서버 분당 60). 불러온 배치 · 기본 배치를 그냥 다시 쓰지 않는다.
   화면을 떠나면 남은 저장을 바로 보낸다. 저장 실패는 알리지 않는다 — 화면은 이미 옮긴 배치를 그리고 있다(FR-55 · BFF FR-52)
7. **첫 저장 경합은 한 문장 `INSERT … ON CONFLICT DO UPDATE`** — Prisma `upsert` 는 조회 → 쓰기 두 단계(`prisma-database.md`). 실 DB 동시 2건 → 1행
8. **크기 문턱은 압축 JSON 16KB(앱) · DB CHECK 는 그 두 배** — jsonb 를 글로 바꾸면 `:` · `,` 뒤 빈칸이 붙어 같은 트리가 길게 세진다. CHECK 는 앱을 건너뛴 쓰기의 뒷문 잠금
9. **같은 원인 결함 둘 — 본문 읽기 오류가 500** — 413 계약을 붙이다 보니 서버 · BFF 모두 body-parser 의 "본문이 너무 큼"(서버는 깨진 JSON 도)이 기본 500 으로 떨어졌다. 둘 다 4xx 로
10. **`Menu`(공용) 세 가지** — 목록 폭이 여는 버튼(아이콘) 폭에 맞춰 줄어 항목이 두 줄로 꺾임 → `max-content` · 아래 자리가 모자라면 위로 · 고르기 · Esc 뒤 여는 버튼으로 포커스.
    `MovableGrid` 칸 · 틀이 `overflow: hidden` 이라 칸 머리 메뉴가 잘림 → 자르지 않고 모서리는 본문이, 메뉴가 열린 칸은 `:focus-within` 으로 위로. 소비처 둘(칸 메뉴 · 프로필 메뉴) 실화면

## 정정

- `SRV-REQ-029` 경로 `/api/panel-layout` → `/api/coach/panel-layout`(컨텍스트 이름이 리소스 경로 — `ddd-presentation.md` §7), 응답 `{ treeJson }` → `{ surface, tree, updatedAt }`
- `BFF-REQ-028` 경로 `/api/app/panel-layout` → `/api/app/coach/panel-layout`(코치 경로 묶음) · 응답에 `degraded`
- `DB-REQ-021` 모델에 `User` 관계 없음(사람 표는 identity 서비스 — 코치 대화 표와 같다) · CHECK 둘
- `FE-REQ-030` FR-51 칸 이름 "추천 카드" → "오늘의 추천"(브리핑 카드), 격자 자리는 `/coach/chat`(3탭 `/coach` 없음)

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 3탭 IA(`/coach` · `/assets` 세그먼트) | 투자 zone 은 머리 메뉴로 갔다(`FE-REQ-069`) — 다시 만들지 않는다 | F006 재정리 때 FEATURE-006 A절에서 지운다 |
| 칸 더하기 · 닫기(관심 종목 등) | FR-51 기본 셋만 정했다 · 칸 고르기 UI 는 기획 없음 | 기획이 생길 때 |
| 앱(모바일) | 격자는 PC 만(FR-57) | — |
| 등락 파랑 글자 대비(axe 1건) | `FE-REQ-047` FR-13 등락 색 118건 — 사용자 결정 대기 | 사용자 결정 |

## 검증

체크리스트 `requirements/reports/checklists/F006-pc-panel-grid.md` · 회고 `requirements/reports/retrospects/F006-pc-panel-grid.md`.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-19 | 신규 — DB(`panel_layouts` · 로컬 DB 적용) · 서버(GET · PUT · 413) · BFF(경로 · `degraded` · 413) · FE(`useWideViewport` · `pc-panel-grid` · `arrange-panels` · 포지션 요약 칸 · 대화 `fill` · `asideCard`) · `@repo/ui`(`parseLayout` · `freshSplitId` · `panelLabel` · `Menu` 셋 · 칸 넘침). 실화면 · axe · 변이 여섯 |
