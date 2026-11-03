# FE-REQ-055 — 셸 홈 요약 카드 — 체크리스트

스펙: `salt-microFe/requirements/specs/in-progress/FE-REQ-055-F015-SHELL-HOME.md` · 2026-11-02
브랜치: `feat/fe-req-053-invest-zone-home-cards` (base `main` `166b6f49`) · 루트 슬라이스 `requirements/specs/done/MONEY-F1-invest-zone-home-cards-slice.md`

## 1. FR ↔ 구현

| FR | 구현 | 상태 |
|---|---|---|
| FR-1 | `packages/core/src/home/homeSummaryCard.ts`(BFF 와 글자 대조) · `apps/web/src/entities/home`(`homeApi` · `useHomeCards` · `HomeSummaryCardView` — `ZoneLink`) | ✅ |
| FR-2 | `widgets/home-briefing` — 카드 목록(BFF `order` · `hidden`) + 목표 목록(임시) + 저축 팁 | 일부 — 순서 · 숨김 편집 없음(S3) |
| FR-3 | — | 미착수(`FE-REQ-048`) |
| FR-4~7 | — | 미착수(S3) |
| FR-8 | 문구 grep 0 | ✅ |

## 2. 검증 (실행한 것만)

| 확인 | 결과 |
|---|---|
| check-types · lint · build · 훅 | 통과(FE-REQ-053 체크리스트와 같은 실행) |
| 실화면 카드 | 저축 "모은 돈 0원 · 진행 중인 목표 1개" · 투자 "보유 평가 1,056,640원 · 손익률 +5.7%"(숨김 끔) / "보유 종목 1개 · 오늘 처음 본다면…"(숨김 켬, 카드 `note` — `0f8683f8`) |
| 카드 하나 degraded(Playwright route) | 투자 "지금은 불러오지 못했어요" · 0원 표시 없음 |
| 만료 토큰 | `/home` → `/`(로그인) — main 과 같다 |
| 가로 넘침 1024~1600 | 0 |

## 3. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 카드 순서 · 숨김 편집 | 저장할 서버(identity)가 없다 | S3 `SRV-REQ-048` · `BFF-REQ-046` FR-5 |
| 온보딩 · 내 데이터 · 알림 · 개인정보 | 같은 이유 | S3 |
| 데스크톱 홈 배치(FR-3) | `FE-REQ-048` to-do | `FE-REQ-048` |
| 홈 목표 목록 제거 | 저축 목록 화면이 없다 | `FE-REQ-056` |
| 카드 서버 렌더 · 카드별 스트리밍 | 토큰이 `localStorage` | `FE-REQ-013` |

- 2026-11-02 MONEY-F1 후속 — `0f8683f8` — 카드 계약에 값 아래 한 줄 `note` 추가(BFF · `@repo/core/home` 같이). 투자 카드가 매입가 숨김을 켰다고 확인된 사람에게 "오늘 처음 본다면" 줄 — 셸 카드가 값 아래 그린다. 실화면 켬/끔 확인

## 2026-11-03 — MONEY-F2(`FE-REQ-054`) 앱 내비게이션

- 셸 홈 머리 — 프로필 메뉴가 화면이 아니라 공용 머리에서 온다(`e0bce695`). 홈 카드 계약 · 순서 무변경
- 확인: 모노레포 check-types · lint · test · zone 5 빌드 · layer-check · 훅 사후 실행 · Storybook · 실화면(5화면 × 5폭 · 앱 웹뷰 · WebKit) — `salt-microFe/requirements/reports/checklists/FE-REQ-054.md` §2
