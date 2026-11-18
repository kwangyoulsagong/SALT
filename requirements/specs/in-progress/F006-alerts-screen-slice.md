---
id: SLICE-F006-ALERTS-SCREEN
title: "F006 알림 화면 — 머리 벨(모든 zone) · /alerts 목록 · 읽음 · 모두 읽음 · 갈 곳 코드"
priority: medium
labels: [F006, bff, fe, ui, slice]
created: 2026-11-18
status: in-progress
---

## Summary

사용자 "새 브랜치 파고 다음 파이프라인 진행" — 마스터 인덱스 §4-1 순위 4 F006 줄 "다음: 알림 화면 · PC 격자 · F003"의 맨 앞.
브랜치 `feat/f006-alerts-screen`. 서버(Kotlin notification, 서버 S2c `MONEY-S2c-notification-slice.md`)는 목록 · 안 읽은 수 · 읽음 · 모두 읽음을
이미 가졌고 BFF 는 목록 한 경로만 열었다. 화면이 없었다(S2c 범위 밖 "웹 알림 목록 · 헤더 벨 — F006 착수 시").

한 줄 — **알림은 코드 + 인자 + 갈 곳 코드로 오고, 문장 · 경로는 프론트 한 곳이 만든다. 벨은 모든 zone 머리에, 목록은 셸 한 화면에.**

## 범위

| REQ | 이번 몫 |
|---|---|
| `BFF-REQ-027` | FR-90 목록(쪽 · `nextPage`) · FR-91 안 읽은 수 · 읽음 · 모두 읽음 1:1 · FR-92 `target` 은 코드 · FR-93 만드는 경로 0 |
| `BFF-REQ-028` | 엔드포인트 표 셋 · FR-26 · FR-45 갈 곳 코드 · FR-48 `@repo/core/alerts` 글자 대조 |
| `BFF-REQ-007` | C절 뷰모델에 `target` · 쪽 판정(`toNextPage`) |
| `FE-REQ-030` | FR-80(벨 자리) · FR-81 배지 · FR-110~113 알림 화면 · 빈 상태 |
| `FE-REQ-031` | FR-72 배지 다시 부르기(폴링 0) · FR-100 · 101 낙관적 읽음 · FR-102 갈 곳 매핑 한 곳 · FR-103 만드는 칸 0 |
| `FE-REQ-032` | FR-64 첫 쪽 서버 · 다음 쪽 `useInfiniteQuery` · FR-65 안 읽은 수 쿼리 · FR-68 `AlertViewModel` 공유 |
| `FEATURE-006` | E절 FR-51 · 52 · 53 · FR-7 벨 |
| 짝(파일만 걸침) | `FE-REQ-052`(레지스트리 셸 `/alerts`) · `FE-REQ-054`(벨 글리프) · `FE-REQ-009`(페이지 레지스트리) · 이름표 한 벌(`FE-REQ-026` · `056` · `057`) 외 |

## 판단 — 리뷰가 볼 곳

1. **갈 곳 코드 넷(`invest.symbol` · `invest.coach` · `savings.goals` · `household.board`)** — 스펙의 `coach` · `home.weekly-plan` 둘은 알림이 1종이던 때다.
   서버 S2c 로 종류가 셋(투자 · 저축 · 가계부)이 됐다. BFF 가 종류(+ 종목)로 코드를 고르고(FR-92 — 경로 0), 경로는 `@repo/web-shared/config`
   `alertTargetHref` 한 곳(`satisfies` 로 코드가 늘면 컴파일이 막는다). 목표 달성 이벤트엔 목표 id 가 없어 목록으로 간다
2. **알림 화면은 셸** — 도메인 셋을 한 목록에 그려야 해서. 셸은 도메인 화면을 품지 않지만(`ADR-005` §2) 알림은 도메인을 모르는 코드 + 인자다.
   레지스트리 셸 `pathPrefixes` 에 `/alerts`. 도메인 zone 벨은 문서 이동(`ZoneLink`)
3. **벨은 공용 레이아웃(`AppShell`)** — 모든 zone 머리 같은 자리, 프로필 앞. 안 읽은 수 쿼리 키 뿌리(`ALERTS_QUERY_ROOT`)가 그래서
   `@repo/web-shared/api` 에 있다 — 셸 엔티티 · 기능이 같은 뿌리를 무효화해 목록 · 배지가 함께 바뀐다(아래 레이어는 위를 못 보니 키는 아래)
4. **이름표 한 벌(`@repo/core/labels`)** — 문장에 목표 틀 · 가계부 분류 · 코치 모드 이름이 들어가는데 셸은 `domain-*` 를 못 부른다.
   셸에 두 번째 표를 두는 대신 core 로 올리고 도메인 문구 파일(`TEMPLATE_LABEL` · `CATEGORY_LABEL` · `COACH_MESSAGES.modes`)이 그것을 가리킨다
5. **읽음 `keepalive`** — 행을 누르면 곧바로 다른 zone 으로 문서 이동한다(갈 곳이 전부 도메인 화면). 요청이 문서 이동에 끊기지 않게.
   낙관적 반영은 금액이 아닌 표시 상태라 허용(`FE-REQ-031` 위험 메모 그대로)
6. **문장이 없는 코드는 줄을 안 그린다(FR-93)** — 그래서 빈 상태 · 안 읽음 판정도 "그릴 줄" 기준. 종목 없는 판단 변화(옛 행)는 그린다(실화면에서 빠졌던 결함 — 아래)
7. **배지 폴링 0 · 창 포커스 재요청 끔** — 다시 부르는 때는 문서 이동(zone 탭 이동은 늘 문서 이동)과 읽음 mutation 무효화. 포커스 재요청은 폴링과 같은 효과라 껐다
8. **상대 시각("3시간 전") 대신 서울 고정 날짜 · 시각** — 첫 쪽이 서버 HTML 이라 지금 시각을 렌더 중에 읽으면 수화가 갈린다(`no-render-read`)

## 정정

- `FE-REQ-030` 빈 상태 문구 "새 알림이 없습니다" → "새 알림이 없어요"(모든 문구 해요체)
- `BFF-REQ-028` `AlertViewModel.target` 값 `'coach' | 'home.weekly-plan'` → 갈 곳 코드 넷 · `params` 는 문자열만(금액 · 숫자 거름 — F000 슬라이스)
- `FE-REQ-031` FR-102 매핑 표 → 코드 넷 · 자리 `shared/config` = `@repo/web-shared/config`
- 목록 다음 쪽 표시 `nextCursor` → `nextPage`(서버가 쪽 번호 · total 을 준다 — 커서 없음)

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 앱 푸시 · 앱 알림 화면 | 앱 미착수 | `RN-REQ-024`~`026` · `RN-REQ-035` FR-4 |
| 목표 하나로 바로 가기(`savings.goals` → 그 목표) | `savings.GoalReached` 이벤트 · 알림 인자에 목표 id 가 없다 | 서버가 인자에 `goalId` 를 실을 때 |
| 판단 변화 문장에 "이전 → 지금" 행동 이름 | 행동 이름표가 모드 × 행동 복합이라 투자 문구에만 있다. 알림은 "바뀌었어요" + 종목 화면으로 | 필요가 생길 때(이름표를 core 로 올리면) |
| 종목 이름(코드 대신) | 알림 인자는 코드뿐 · BFF 가 시세 이름을 붙이지 않는다 | BFF 가 이름을 조립할 때 |

## 검증

체크리스트 `requirements/reports/checklists/F006-alerts-screen.md`.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-18 | 신규 — BFF(경로 셋 · 갈 곳 코드 · 쪽 · 계약 대조) · FE(벨 · `/alerts` · 읽음 · 이름표 한 벌) · 실화면(임시 계정 · 알림 25건 · 1280 · 390 앱 웹뷰 · 실패 · 로그아웃 · 빈 상태). 실화면 결함 셋 고침(종목 없는 판단 변화 줄 빠짐 · 큰 보라 버튼 · 빈 상태 폭) |
