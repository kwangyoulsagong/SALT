---
id: SLICE-MONEY-F1-INVEST-ZONE-HOME-CARDS
title: "돈 관리 앱 F1 — 투자 zone 분리 · 셸 홈 도메인 요약 카드"
priority: high
labels: [F015, architecture, fe, bff, server, slice, microfrontend]
created: 2026-11-02
status: done
---

## Summary

사용자 "새 브랜치 파고 다음꺼 파이프라인 진행" — 3a 다음 칸 `FE-REQ-053` + `FE-REQ-055` + `BFF-REQ-046`(F1, 한 PR: 홈 계약 변경).
투자 화면을 `packages/domain-invest` + `apps/web-investment` 로 옮기고, 셸 홈이 투자 코드를 읽지 않게 BFF 도메인 요약 카드로 바꿨다.
이 슬라이스의 범위(아래 표)는 끝났다 — `FE-REQ-055` · `BFF-REQ-046` 의 남은 FR(편집 · 온보딩 · 내 데이터 · 알림)은 서버 identity(S3)를 기다린다.

## 범위

| REQ | FR | 내용 |
|---|---|---|
| `FE-REQ-053` | FR-1~7 | **done** — shared → `packages/web-shared` · zone 공용 레이아웃 · 슬라이스 25 R100 이동 · 투자 zone 조립 · `hostedIn` · 이동 실측 |
| `FE-REQ-055` | FR-1 · 2(일부) · 8 | 카드 계약 · 셸 홈 카드 · 문구. in-progress |
| `BFF-REQ-046` | FR-1~4 · 9 | `HomeSummaryCard[]` 조립 · 800ms · 손익률 · 401. in-progress |
| 기존 REQ 40 | — | 경로 이동 · 파일 걸침 · 기존 결함 수정 기록(루트 체크리스트 §3) |

## 판단 — 리뷰가 볼 곳

1. **공용 코드를 패키지 하나로**(`@repo/web-shared` — shared 세그먼트 + `layout`) — 사용자 결정. 패키지는 셸 `src` 를 import 못 하므로 shared 를 먼저 올려야 이동이 R100 이 된다
2. **패키지 안 `@/` alias 를 그대로 두고 zone 앱 `tsconfig` paths 로 푼다** — 369 파일을 한 글자도 안 바꿨다. 셸은 domain 을 import 하지 않아 두 `@/` 가 한 빌드에 섞이지 않는다
3. **`/settings` 내용을 `/coach/settings` 로 · 홈 보유 목록을 코치 리포트 맨 위 "내 보유"로** — 사용자 결정 둘. 셸 `/settings` 는 계정 설정(알림 · 내 데이터) 자리
4. **서비스가 없는 도메인은 카드를 내지 않는다** · **401 은 카드 degraded 가 아니라 홈 401** · **매입가 숨김은 "확인된" 사람에게만**
5. **로그인 표지 쿠키 + 셸 미들웨어** — 토큰은 그대로 `localStorage`, 쿠키는 "보낼지"만(쿠키 세션 이관은 `FE-REQ-013`)

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 카드 순서 · 숨김 편집 · 온보딩 · 내 데이터 · 알림 · 개인정보 | 서버 identity 없음 | S3 `SRV-REQ-048` |
| 가계부 · 팁 카드 | 서비스 없음 | `SRV-REQ-046` · `047` |
| 하단 탭 · 헤더 ~~`AppChrome`~~ `AppNavigation` · prerender · 문서 간 전환 | 별도 REQ | `FE-REQ-054` — **2026-11-03 구현(MONEY-F2)** |
| 저축 zone · 홈 목표 목록 제거 | 별도 REQ | `FE-REQ-056` |
| 운영 빌드 이동 시간 · 한 origin 라우팅 | 배포 환경 없음 | `OPS-001` |
