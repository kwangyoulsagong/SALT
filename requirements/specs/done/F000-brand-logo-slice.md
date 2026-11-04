---
id: SLICE-F000-BRAND-LOGO
title: "F000 로고 — 소금 물방울 심볼 · Salt 글자 · 머리 로고 · 파비콘"
priority: medium
labels: [F000, frontend, design, slice]
created: 2026-11-04
status: done
---

## Summary

사용자 "새브랜치 파고 다음 파이프라인 진행" → 디자인 D1(로고 + 틀) 착수 중 "기능부터 만들어야지" · "로고는 필요하니까 진행 ㄱㄱ".
틀(`FE-REQ-047`)은 빼고 **로고 하나**만 닫는다. 디자인 당김(D1~D4)은 같은 날 취소 — 마스터 인덱스 §4-1 순위 5 · `DESIGN-desktop-redesign-plan.md` 정정.

> **done 2026-11-04** — `25f182f6`. 영역 REQ `FE-REQ-051` done. 검증 `requirements/reports/checklists/F000-brand-logo.md`.

## 범위

| REQ | 이번 몫 | 남는 몫 |
|---|---|---|
| `FE-REQ-051` | FR-1~5 — `@repo/ui/logo` · 머리 첫 칸 · zone 5 파비콘 · 앱 아이콘 · 토큰 · 크기 검사, FR-6 경로 데이터 한 곳 | `ui-native` 로고 → `RN-REQ-001` |
| `FE-REQ-054` · `007` · `005` · `044` | 파일만 걸침(머리 칸 연결 · 토큰 파일) — 동작 · 값 diff 0 | — |
| `RN-REQ-001` | 머리 메모(로고 데이터 위치) | `ui-native` 생성 때 |
| BFF · 서버 · 예측 | 변경 없음 — 로고는 정적 자산 | — |

## 판단

1. **시안 전에 실제 파일을 잰다** — 손으로 그린 시안 셋이 거절된 뒤 실제 로고 SVG 19개와 기준 심볼 원본(.ai · PNG)을 쟀다. 원본 3D 는 렌더 이미지이고 입체는 어둡게 칠하지 않고 색상 · 밝기만 옮긴다. 그 규칙대로 칠한 다섯째 판에서 골랐다(`FE-REQ-051` "최종")
2. **두 벌** — 입체(기본) + 단색(16px). 은회색 면은 흰 바탕 1.56:1 이라 단색은 같은 계열을 진하게(3.64:1)
3. **글자는 경로** — OFL 글꼴(Poppins ExtraBold) 글자 모양을 굳혀 웹 글꼴 0
4. **정적 아이콘은 토큰에서 생성** — `pnpm brand:icons`(`--check`)
