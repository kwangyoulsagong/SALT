---
id: SRV-REQ-008
spec: ../../specs/in-progress/SRV-REQ-008-F000-FUNC.md
checklist: ../checklists/SRV-REQ-008.md
title: F000 FUNC — 관심 목록 · 보유 요약 · 초대 코드 · 온보딩 회고
status: 부분 완료
written: 2026-09-22 (backfill)
---

루트 회고: `requirements/reports/retrospects/F000-watchlist-tab.md`(PR #41) · `F000-invite-onboarding.md`(PR #42).
여기는 서버 쪽 교훈만 둔다.

## 1. 무엇을 했나

| PR (merge) | 서버 커밋 | FR |
|---|---|---|
| #41 (`3987cb2`) | `4f330c6` 관심 목록에 현재가 · 변동률 | FR-30 · FR-33 |
| | `545bda4` `period` 오타 · 모르는 값 422 | FR-50~52 |
| | `e43f619` 보유 평가 갱신 살림 · `GET /api/portfolio/summary` | FR-60 · FR-63 |
| | `2c76b4c` 주식에 업비트 로고 URL 을 붙이지 않음 | — |
| #42 (`658ed39`) | `be33196` `auth` 컨텍스트 · 초대 코드로만 계정 생성 (BREAKING) | FR-1~7 · FR-10~12 |
| | `9de46f4` `onboarding` 조합 컨텍스트 | FR-13 · FR-14(소스 대체) |

PR #43 · #44 · #47 에는 이 REQ 몫의 서버 변경이 없다(`a78ec49` 는 `SRV-REQ-006`, `4b72c9e` 는 `SRV-REQ-009`).

## 2. 잘 된 것

- **"`register` 를 만들지 않는다"(FR-5)를 구조로 만들었다.** 계정을 만드는 함수가 `InviteCodeStore.redeem` 하나이고
  코드 점유와 계정 생성이 한 트랜잭션이다. 실제 DB 동시 2요청 → 201 + 403(체크리스트 §5).
- **판정 순서가 보안이다.** `inviteAcceptance` 는 코드 상태를 상한보다 먼저 본다. 뒤집으면 무인증 `check` 로 정원을
  폴링할 수 있다(`be33196` 본문).
- **조합 컨텍스트 자리를 미리 등록해 둔 것이 쓰였다.** `onboarding` 은 `server-architecture.md` §2 에 이미 있었고,
  REQ 가 지정한 소스(`ledger` · `plan`)가 없어도 판정 규칙은 컨텍스트 안에 두고 조립 두 줄만 바꿔 끼웠다.
- **살린 경로의 비용을 같이 고쳤다.** `update-prices` 를 부르게 하면서 심볼마다 돌던 조회를 `findBySymbols` 1회로 —
  테스트 3건이 "심볼 100개여도 조회 1회"를 고정한다.

## 3. 틀렸던 것

셋 다 **소비처가 없어서 아무도 안 부르던 계약**이다(루트 회고 §3-bis).

| 결함 | 고친 커밋 |
|---|---|
| `ListWatchlist` 가 Prisma `Decimal` 을 그대로 내보내 JSON 문자열(`"158000000"`)이 됐다 | `4f330c6` |
| `/api/portfolio/internal/update-prices` 를 부르는 곳이 없어 `current_value` 가 생성 이후 0 | `e43f619` |
| 자산군과 무관하게 업비트 로고 URL 을 붙여 `logos/AAPL.png` 404 | `2c76b4c` |

> **Action:** `prisma-database.md` 의 "Decimal/Date 를 응답으로 보낼 때 직렬화 형태를 **확인한다**"는 확인만 요구한다.
> "`Decimal` 은 infrastructure 어댑터에서 `number | null` 로 바꾸고 `null` 을 0 으로 떨어뜨리지 않는다"로 행동을 적는다.

## 4. 남은 기술부채

| 항목 | 근거 |
|---|---|
| `set_plan` 소스가 `goal` 행 존재이고 **`composition.ts` 가 Prisma 로 직접 센다** | 체크리스트 §6. F003 `plan` 공개 API 가 서면 조립 두 줄 |
| FR-20~25 알림 · FR-32 `AssetType` · FR-61·62 환율(`null`) · FR-70~72 동면 | 체크리스트 §2 |
| 2026-09-21 추가 FR-80~104(추적 자산 · 뉴스 필드 · 목표 수량) | REQ Changelog. 미착수 |

## 5. 다음에 보완할 규칙 · 문서

- `ddd-shared.md` §2 의 `ErrorKind` 예시는 5값이다. 코드(`shared/domain/DomainError.ts`)에는 `be33196` 이 더한
  `Unauthenticated` 가 있다 — 규칙 문서가 값 추가를 따라가지 못했다.
- `composition.ts` 가 Prisma 를 직접 부르는 자리는 조립 지점 규칙(§5 "구현을 아는 유일한 자리")의 예외인지 임시인지
  한 줄 남긴다.
