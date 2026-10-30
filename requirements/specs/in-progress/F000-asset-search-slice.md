---
id: SLICE-F000-ASSET-SEARCH
title: "F000 슬라이스 — 종목 검색(코인 + 국내) · 추적 자산 상한 10"
priority: high
labels: [F000, slice, srv, bff, fe, search, watchlist]
created: 2026-10-30
---

## Summary

마스터 인덱스 §4-1 순위 1(F004 슬라이스 17 머지)이 닫혀 순위 2 첫 줄 — `FEATURE-000` FR-40 **종목 검색**(코인 + 국내 한 검색) ·
FR-41 **추적 자산 상한 10**. 디자인 묶음의 전역 헤더 검색 상자(`FE-REQ-047` FR-1)가 이 화면을 쓴다.

스펙은 2026-09-21 감사 때 4영역에 다 적혀 있었지만 코드는 0건이었다(`SearchAssets` · `trackingLimit` · `HoldingProbe` · `/api/app/search` ·
`pages/search` 전부 없음). 그 사이 Q2(자산군)가 닫혀(F011 `kr_stock`, 2026-10-07) "크립토만 검색"이던 `SRV-REQ-008` FR-87 을
**코인 + 국내(소유자만)** 로 넓혔다. 계약은 **추가만**이다(새 경로 2 · 409 본문에 두 수 · 관심 목록 `tracked` · `isHeld`).

## 범위

| REQ | FR | 내용 |
|---|---|---|
| `SRV-REQ-008` | FR-80~87 | `SearchAssets` · `policy/trackingLimit` · `TrackedAssetLimitError`(409 + 두 수) · `HoldingProbe`(`HeldAssetsAdapter` → `portfolio` 공개 API) · 요청당 관심 · 보유 1회 · 자동 정리 없음 · 빈 검색어 = 추적 목록 · 검색어 로그 가림 · FR-87 개정(코인 + 국내) |
| `SRV-REQ-009` | FR-30 · 32 · 33 | `GET /api/investment/search` · 409 · 관심 목록 `tracked` · 행 `isHeld`. FR-30 개정 — `q` ≤ 30 · `limit` ≤ 30 · 형식 위반 400(서버 DTO 전부 Zod 400) · `changeRate` · `logoUrl` |
| `SRV-REQ-006` | Shared Kernel | `DomainError.details`(본문 최상위) — `ddd-shared.md` §2 |
| `BFF-REQ-007` | H FR-70~74 · 신규 FR-75 | `/api/app/search` · 서버 값 그대로 · 캐시 없음 · 409 두 수 전달 · 관심 목록 `tracked` · 검색어 로그 가림 |
| `BFF-REQ-008` · `009` · `010` | FR-19 · FR-4 · FR-50 · 예산 | 화면 계약 · 호출 맵(400ms · 1회) · 예산 200ms(실측 11~27ms) |
| `BFF-REQ-025` | — | error middleware 가 두 수를 옮김 · 접근 로그 `originalUrl`(라우터 아래 요청이 전부 `/` 로 찍히던 기존 결함) |
| `FE-REQ-010` | FR-33 · 37 · 70~78 · 103 | `/search` 화면 · 결과 표 · 카운터 · 상한 안내 · 보유 배지 · 자산군 칩 · 최근 검색 · 상태 표 |
| `FE-REQ-011` | FR-5 · 6 · 7 · 80~84 | 상한 인라인 · 별 → 관심 목록 · 검색 같이 무효화 · 보유 ★ 해제 막기(검색 · 관심 종목 탭) · 검색어 주소 · 디바운스 · 취소 · 최근 검색 |
| `FE-REQ-012` | D-2 FR-60~62 · 65 | 검색 조회 훅(개정: `entities/market/api`) · `isTrackedLimitError` · 무효화 둘 · 로그인 전 호출 없음 |
| 파일만 걸침 | 아래 체크리스트 §4 | 판단 무변경 |

## 판단 — 리뷰가 볼 곳

1. **상한 판정 = 보유가 아닌 관심 수 < 설정값, 중복 검사가 먼저** — 이미 담긴 종목을 다시 누르면 상한 409 가 아니라 기존 중복 409 다. 판정과 추가 사이 경쟁은 잠그지 않았다(사용자 ≤ 10명 · 별이 진행 중 비활성) — 최악이 상한 +1
2. **Shared Kernel 에 `details` 를 더했다** — 컨텍스트 예외가 미들웨어를 알 수 없어서다(코치 쿨다운 `retryAfterSeconds` 는 컨트롤러가 직접 실었다). 본문 키 충돌은 미들웨어가 `success` · `code` · `message` 를 뒤에 써서 막는다
3. **국내 검색은 소유자만, 비소유자는 마스터를 읽지도 않는다** — 국내 시세가 소유자 전용(KRX 약관 · F011)이라 결과 0건이 아니라 조회 0회
4. **결과 순서는 "같음 → 시작 → 포함", 같은 순위 안은 원천 순서(코인 거래대금 · 국내 시총)** — 자산군을 섞어 다시 정렬하지 않는다. 코인 · 국내 숫자(거래대금 vs 시총)는 단위가 달라 한 축으로 못 줄 세운다
5. **표 행 `memoKey` 에 관심 목록 id** — 검색 응답이 관심 목록보다 먼저 오면 별이 "제거"로 굳었다(고치기 전 실화면 5회 중 2회 · 고친 뒤 4회 연속 통과 — 응답 순서에 따라 갈린다). 엔티티 표는 별 상태를 모르므로 `actionKey` 로 받는다
6. **진입점은 투자 화면 머리** — 전역 헤더(`FE-REQ-047`)가 없어서. 헤더가 생기면 링크를 옮긴다(메모리: 투자 · 코치 진입점은 `/investments`, 홈 아님)

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 전역 헤더의 검색 상자 | 디자인 묶음 순위 5 | `FE-REQ-047` FR-1 — 이 화면 `/search` 를 쓴다 |
| 모바일 검색 리스트 | 웹 768 미만은 안내 화면 | `RN-REQ-004` · `005` · `006` |
| 미국 주식 검색 | 시세 원천 없음(`stock` 행은 관심 목록에만 남은 것) | 미국 주식 착수 |
| 뉴스 북마크 · 감정 칩(FR-42 · 43) · 목표 수량(FR-44) | 같은 D-2 절의 다른 기능 | 마스터 인덱스 §4-1 순위 2 다음 줄들 |

## 연결

- 체크리스트 `requirements/reports/checklists/F000-asset-search.md` · 회고 `requirements/reports/retrospects/F000-asset-search.md`
- 기획서 `pm/requirements/specs/in-progress/FEATURE-000-scope-reset.md` FR-40 · 41
