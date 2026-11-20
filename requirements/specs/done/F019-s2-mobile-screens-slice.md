---
id: F019-S2-MOBILE-SCREENS
title: "F019 순서 2 — 휴대폰 화면 옮기기(홈 · 저축 · 가계부 · 투자 상세 · 코치 리포트) · 앱 웹뷰 계약 걷기"
created: 2026-11-20
---

## Summary

`ADR-012` 순서 2 · `FE-REQ-072`. 앱 웹뷰용으로 데스크톱 HTML 에 같이 싣던 휴대폰 배치를 `/m` zone 으로 옮기고, 앱 웹뷰 계약(`SALTApp/` UA · 첫 스크립트 · `data-embed`)을 지웠다. 서버 · BFF 변경 0(같은 계약 · 같은 쿠키).

| 산출물 | 위치 |
|---|---|
| 화면 | `domain-savings` `src/mobile/goals` · `goal-detail` · `domain-household` `src/mobile/household` · `domain-invest` `src/mobile/investments` · `investment-detail` · `coach` · 홈 `@repo/web-shared/layout/mobile/home`(BFF 카드) |
| 조립 | `apps/web-mobile/app/m/(tabs)/**` re-export · `tsconfig` 폴백 배열로 도메인 셋의 `@/…` 를 한 빌드에 |
| 대응표 | 레지스트리 `mobileRedirects` — `/home` · `/goals`(아래 포함 · `except` 둘) · `/household` · `/investments`(아래 포함) · `/coach/report` |
| 같이 쓰는 조각 | `/m` 표지 `<html data-surface="mobile">` · `@repo/core/mobile` `ON_MOBILE` · `MOBILE_ROOT` · 디자인 시스템 크기 표지 넷 |
| 규칙 · 시험 | 레이어 `mobile`(pages 형제) · 위젯 `goal-tools` · `mobileAlias.test.ts` · `fontSizeBudget.test.ts`(휴대폰 표면에 `src/mobile` · 데스크톱 `pages` 휴대폰 표지 0) · 훅 시험 차단 22 |

## 판단

1. **한 빌드에 도메인 셋 — `tsconfig` 폴백 배열** — 패키지 별칭을 `#imports` 로 갈아엎지 않았다. 슬라이스 이름이 레이어마다 전역 유일(레지스트리 한 표)이라 처음 있는 곳으로 풀면 된다. 겹치면 조용히 틀리므로 시험으로 센다
2. **홈은 패키지로 옮기지 않고 BFF 카드 계약으로** — 홈은 도메인이 아니다. 셸 `entities/home` 을 패키지로 만들면 도메인 아닌 `domain-*` 가 생긴다
3. **데스크톱 화면에 휴대폰 분기 0, 같이 쓰는 조각만 `/m` 표지** — 행 · 패널처럼 두 표면이 같이 쓰는 엔티티 · 위젯은 `/m` 서버 HTML 의 표지로 휴대폰 값(13 · 44)만 고른다. 옛 웹뷰 표지와 달리 스크립트 · 수화 예외가 없다
4. **페이지 안에 있던 것은 위젯으로 내린다** — 저축 도구(`goal-tools`) · 요약 칸(엔티티 `goalSummaryItems` · `householdSummaryItems`). `mobile` 은 `pages` 를 import 하지 못한다
5. **디자인 시스템은 표면을 모른다** — 배지 · 버튼 · 글 · 고지 칸에 크기 표지만 달고 휴대폰 틀이 한 번에 키운다
