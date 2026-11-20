---
id: SLICE-MONEY-WEBVIEW-MOBILE
title: "돈 관리 화면 디자인 4단계 — 앱 웹뷰 모바일 배치(가계부 · 저축 · 홈)"
priority: high
labels: [F012, F013, F000, design, fe, slice]
created: 2026-11-20
status: done
---

## Summary

사용자 "새 브랜치 파고 다음 파이프라인 진행" → `FE-REQ-060` 단계 표의 마지막 칸 4단계(앱 웹뷰 모바일 배치 FR-M). 브랜치 `feat/fe-req-060-s4-webview-mobile`.
FE 만 — 서버 · BFF 0.

한 줄 — **앱 웹뷰(UA `SALTApp/`)에서 가계부 · 저축 · 홈이 데스크톱을 줄인 화면이 아니라 모바일 배치가 됐다: 흰 한 열 · 주인공 숫자 하나 · 목록 행 · 하단 고정 버튼 → 바텀 시트(뒤로로 닫힘). 데스크톱 HTML · 배치는 그대로.**

## 범위

| REQ | 이번 몫 |
|---|---|
| `FE-REQ-060` | FR-M1~M5 done → **REQ done** |
| `FE-REQ-048` | FR-9(앱 웹뷰 홈 목록 행 · 닫는 배너) → **REQ done** |
| 파일만 걸침 | `FE-REQ-047`(`PageFrame` · 래칫 시험) · `FE-REQ-043`(웹뷰 판정 그대로) · `FE-REQ-056` · `057`(행 · 폼 웹뷰 크기) · `RN-REQ-032` FR-7(웹뷰 글자 13 이상) |

## 판단 — 리뷰가 볼 곳

1. **두 배치를 같은 HTML 에 두고 CSS 로 고른다** — 웹뷰 판정은 `<head>` 첫 스크립트의 `<html data-embed="app">` 이라 첫 페인트 전에 맞다. 서버가 UA 를 읽으면 모든 페이지가 동적 렌더가 된다(`FE-REQ-043`). 마운트 뒤 판정(`useInAppWebview`)은 시트 · 세그먼트 칸 수처럼 붙일지 말지를 가를 때만
2. **모바일 글자는 토큰 `appType`** — `@repo/tokens` 의 `typography` 단 그대로, 이름만 쓰는 자리. 웹에서는 웹뷰 선택자 안에서만(파일 단위 시험) — 데스크톱 다섯 단 래칫을 우회하지 못하게
3. **뒤로 = 시트 닫기** — 열 때 같은 주소 기록 칸 하나를 쌓고, 다른 길로 닫히면 우리가 뺀다(`useBackCloses`). Next 는 `pushState` 를 감싸 내부 상태를 이어 붙인다 — 실측 닫힘 · 주소 그대로 · 남은 칸 0
4. **정정 둘** — 착지는 정보 상자 대신 주인공 아래 줄 · 저축 도구는 링크 대신 접힘 행(별도 화면이 없다)
5. **상세 패널 면은 그대로** — 투자 상세와 같이 쓰는 면이라 이번에 바꾸면 투자 웹뷰까지 움직인다(범위 밖 표)

## 커밋

체크리스트 `requirements/reports/checklists/MONEY-webview-mobile.md` · 회고 `requirements/reports/retrospects/MONEY-webview-mobile.md`.
