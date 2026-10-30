---
id: FE-REQ-051
feature: F000
area: frontend
kind: UI
title: "SALT 로고 — 심볼 + 글자 로고 SVG · 헤더 · 파비콘 · 앱 아이콘"
priority: medium
created: 2026-10-30
source: 사용자 "로고도 … 참고해서 svg로 우리만의 로고도 만들어줘 req 작성"
---

## Summary

지금 웹에는 로고가 없다(헤더 자리에 프로필 칩 · 파비콘은 기본 `favicon.ico`). 전역 헤더(`FE-REQ-047` FR-1)의 첫 칸이 로고다.
기준 증권 앱 로고에서 가져온 것은 **구성 원칙**뿐이다 — 단색 계열의 둥근 심볼 하나 + 굵은 글자 로고, 헤더에서 높이 약 20px, 심볼만으로도 알아본다.
모양 · 색 · 글자는 우리 것이다.

## 초안 (2026-10-30)

| 파일 | 내용 |
|---|---|
| `salt-microFe/docs/design-system/brand/salt-symbol.svg` | 32×32 심볼 — **소금 결정(정육면체)** 을 등각으로 본 세 면. 윗면 `#C9B8FF` · 왼면 `#7949FF`(브랜드 주색 `tokens.brand.primary`) · 오른면 `#5A2FE0`, 모서리 둥글게(선 2.4 둥근 이음), 윗면에 흰 반짝임 한 줄 |
| `salt-microFe/docs/design-system/brand/salt-logo.svg` | 110×32 — 심볼 + "SALT" 글자(선 4 · 끝 둥금 · 높이 16.4 · `#191F28` 1단 글자색). 글자는 글꼴이 아니라 경로(글꼴 없는 환경에서도 같다) |
| `salt-microFe/docs/design-system/brand/salt-logo-dark.svg` | 어두운 바탕용 — 글자만 흰색 |

뜻: 이름(SALT = 소금)에서 바로 오는 모양 · 작게 모은 결정이 쌓인다(저축 · 돈 모으기 축). 둥근 끝은 확신 · 공격적 인상을 피하는 제품 말투와 맞춘다.

## FR

| FR | 내용 |
|---|---|
| FR-1 | `@repo/ui` 에 `Logo`(변형 `full` · `symbol`, 크기 `sm 20` · `md 24` · `lg 32`, 테마 `light` · `dark`) — SVG 를 인라인 컴포넌트로. `aria-label="SALT"`, 링크로 감쌀 때는 링크 이름 "SALT 홈". Storybook 포함 |
| FR-2 | 전역 헤더 첫 칸 — 높이 20 글자 로고(1024 이상) · 심볼만(그 아래). 누르면 `/home` |
| FR-3 | 파비콘 · 앱 아이콘 — `app/icon.svg`(심볼) · `apple-icon.png`(180, 흰 바탕 여백 20%) · 16px 에서 반짝임 줄은 지운 단순형 |
| FR-4 | 색은 토큰에서 — 세 면 색을 `tokens.brand` 에 `crystalTop` · `crystalLeft(=primary)` · `crystalRight` 로 추가. SVG 에 같은 hex 를 흩지 않는다 |
| FR-5 | 크기 검사 — 16 · 20 · 24 · 32 · 128 에서 심볼이 뭉개지지 않는지(16 은 단순형), 글자 로고 최소 높이 16 |
| FR-6 | 앱(RN)도 같은 경로 — `@repo/ui-native` 는 `react-native-svg` 로 같은 경로 데이터를 쓴다(경로 데이터는 `@repo/tokens` 또는 `@repo/core` 한 곳) |

## 하지 않는 것

- 다른 서비스 로고의 모양 · 색 배합을 따라 그리지 않는다 — 구성 원칙만
- 로고에 움직임(반짝임 반복 등)을 넣지 않는다(`motion.md` — 반복 모션은 진행 중에만)

## Open Questions

- Q1 글자 로고를 영문(SALT)만 둘지, 한글 병기(솔트)할지 — 초안은 영문만
- Q2 상표 검색(같은 업종 "SALT" 표장) — 출시 전 사용자 확인

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) · SVG 초안 3종 |
