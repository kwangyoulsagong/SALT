---
id: SRV-REQ-009
spec: ../../specs/in-progress/SRV-REQ-009-F000-API.md
checklist: ../checklists/SRV-REQ-009.md
title: F000 API — 보유 요약 · period 계약 · 초대 경로 · 시세 개요 기간 회고
status: 부분 완료
written: 2026-09-22 (backfill)
---

루트 회고: `requirements/reports/retrospects/F000-watchlist-tab.md`(PR #41) · `F000-invite-onboarding.md`(PR #42) ·
`F000-market-table.md`(PR #44 · #47). 여기는 서버 계약 쪽 교훈만 둔다.

## 1. 무엇을 했나

| PR (merge) | 서버 커밋 | 계약 |
|---|---|---|
| #41 (`3987cb2`) | `545bda4` | 차트 `period` 유효값 `minute` · `day`, 모르는 값 **422**, 생략은 `day` |
| | `e43f619` | `GET /api/portfolio/summary` (`fxRateUsed` · `fxBasisCode` 는 언제나 `null`) |
| #42 (`658ed39`) | `be33196` (BREAKING) | `invite/accept` · `invite/check` 신설, `register` · `password` · `account` 404 |
| | `9de46f4` | `GET /api/onboarding/status` |
| #44 (`f85f982`) | `4b72c9e` | `market/overview` 가 `period` 7개 · 순서 2개를 실제로 반영, 항목에 `periodChange` 추가, 모르는 기간 422 |

PR #43 · #47 에는 이 REQ 몫의 변경이 없다.

## 2. 잘 된 것

- **모르는 값을 422 로 가른다.** `ErrorKind.Blocked` → 422 라 필수 필드 누락(400)과 구분된다. BFF 는 교정하지 않고
  같이 막는다 — 교정하면 오타가 영구화된다(`545bda4`).
- **배포 순서를 커밋에 적었다.** 프론트 먼저, 롤백은 서버부터(`545bda4`).
- **대체값으로 채우지 않는다.** 기준 시세가 없으면 `periodChange: null` 이고 24시간 값으로 채우지 않는다(`4b72c9e`).
  환율 필드도 `null` 로 자리만 뒀다 — 미국주식이 들어와도 응답 모양이 안 바뀐다.
- **`check` 가 정원 상태를 새지 않는다**(FR-4). 판정 순서와 `publicRejectionOf` 두 겹. 정원 3/3 에서 멀쩡한 코드가
  `valid: true`.
- `period` 를 `minute` · `day` 둘만 정의했다. FR-50 의 넷 중 거래소 호출도 소비 화면도 없는 둘을 목록에 넣으면
  200 을 기대하게 하고 빈 배열을 준다.

## 3. 틀렸던 것

둘 다 **서버가 모르는 입력을 조용히 삼켜서** 결함이 보이지 않았다.

| 결함 | 고친 커밋 |
|---|---|
| 서버가 `day` 가 아닌 값을 전부 분봉으로 받아 프론트의 `period=miniute` 오타가 동작하고 있었다 | `545bda4` |
| `market/overview` 가 `period` 를 읽지 않아 기간 버튼 7개가 같은 목록(응답 해시 7개 동일)을 돌려줬다 | `4b72c9e` |

> **Action:** `api-contract.md` "DTO와 검증"에 한 줄 — **열거형 query 의 모르는 값은 422(`ErrorKind.Blocked`),
> 생략만 기본값. 조용히 기본값으로 떨어뜨리지 않는다.** 지금 규칙에는 enum 입력의 모르는 값 처리가 없고,
> 같은 결함이 두 PR 에 걸쳐 두 번 나왔다.

## 4. 남은 기술부채

| 항목 | 근거 |
|---|---|
| 동면 5경로 410 Gone + 1회 로그(FR-7 · 8) · 로그 1주 수집 | 체크리스트 §8. `SRV-REQ-007` · `BFF-REQ-007` A절 |
| 알림 `kind` 422 (FR-12 · 13) | `notification` 컨텍스트 |
| 유지 경로 응답 스냅샷(FR-23) | **부분** — overview 한 경로만 필드 계약 테스트(`F000-market-table` 체크리스트) |
| 2026-09-21 추가 FR-30~38 · `GET /api/investment/search` | REQ Changelog. 미착수 |

## 5. 다음에 보완할 규칙 · 문서

- `ddd-presentation.md` §5 는 동면 경로를 410 으로 1주 유지하라고 하지만 `be33196` 은 제거 3경로를 **404** 로 닫았다
  (체크리스트 §7 FR-5 · 6 이 404 를 요구). 두 문서가 말하는 "제거"와 "동면"의 경계를 규칙에 한 줄로 적는다.
