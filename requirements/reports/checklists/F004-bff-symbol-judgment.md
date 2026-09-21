# F004 슬라이스 3 — 종목 판단 뷰모델 (BFF) — 체크리스트

슬라이스: `requirements/specs/in-progress/F004-bff-symbol-judgment-slice.md` · 2026-09-22
브랜치: `feat/f004-bff-judgment` (base `main` `ebadcf9`)

## 1. 요구사항 ↔ 구현

| REQ · FR | 판정 | 위치 |
|---|---|---|
| `BFF-REQ-023` FR-90 두 모드 한 응답 | pass | `symbol-coach.viewmodel.ts` `modes` |
| FR-91 · `BFF-REQ-024` FR-32 `confidence` 0건 | pass | 필드를 골라 옮긴다 · `mapDecision` 줄 삭제 · 테스트가 직렬화 문자열 검사 |
| FR-92 · FR-1~6 게이트 전달만 | pass | `toModeViewModel` — `renderable` 은 서버 값만, 여는 경로 없음 |
| FR-93 "관망" 기본 라벨 0건 | pass | `getPreview` `badge: … ?? null` |
| FR-94 `mode` 없으면 서버에 안 보냄 | pass | `getDetail` — `scalp`·`long_term` 외 값도 버린다 |
| FR-95 `zone` 무가공 · `notPrediction` 유지 | pass | 서버 객체 그대로 |
| FR-96 `gaugeTrackRecords` 무가공 | pass | |
| FR-97 · `BFF-REQ-025` FR-42 뉴스 병렬 · 실패 격리 | pass | `Promise.allSettled` · `degradedFields: ['news']` |
| FR-98 `validity.code` 무가공 | pass | |
| FR-99 · `BFF-REQ-024` FR-35 목표가 0건 | pass | 테스트 |
| `BFF-REQ-024` FR-31 판별 union | pass | `ModeCoachViewModel` — `false` 분기에 `judgment`·`trackRecord` 없음 |
| FR-30 `packages/core` 공유 | **미충족** | 범위 밖 (아래) |
| `BFF-REQ-025` FR-22 면책 없으면 unavailable | pass | 502 `coach_unavailable` |
| FR-40 모드 게이트 누락 → 그 모드 unavailable | pass | `null` + `degradedFields: ['modes.*']` |
| FR-45 계약 스냅샷 | pass | 최상위 키 · `zone.kind` · `confidence` 부재 |
| 호출 맵 타임아웃 300ms | pass | 판단 · 뉴스 각각 |
| 호출 맵 GET 재시도 1회 | **미충족** | 범위 밖 |
| `BFF-REQ-026` FR-50 p95 200ms | pass | 아래 실측 |
| FR-51 모드 전환 무호출 | pass | 두 모드 한 응답 |
| FR-52 클라이언트 종료 → upstream 취소 | pass (코드) | `res.on('close')` → `AbortController`. 실측 안 함 |
| FR-54 모드별 미렌더율 관측 | **미충족** | 범위 밖 |

## 2. 실측 (로컬 서버 4000 · BFF 4001, 계정 `watchlist-check@local.test`)

| 확인 | 결과 |
|---|---|
| BTC (보유) | 200. 두 모드 `renderable: false` · `insufficient_sample` · `trackSample: 0` · zone `held_rule`. 뉴스 3 · `degradedFields: []` |
| BTC `mode=long_term` | `mode: long_term`, `preflightDefaults.mode` 따라감 |
| AKT (미보유) | zone `observation` 두 모드. 게이지 `sentiment 60_80` 표본 1 `lowSample: true` |
| `confidence` 문자열 | 세 응답 모두 0건 |
| 지연 (BTC, 100회, 워밍 후) | p50 7ms · **p95 32ms** · max 74ms. 서버 직접 p95 33ms |
| 지연 (tsx 재기동 직후 40회) | p95 344ms · max 546ms — 첫 호출 워밍. 기록만 |

## 3. 게이트

| 항목 | 결과 |
|---|---|
| `npm test` (bff) | 51/51 (+15 `symbol-coach.viewmodel.test.ts`) |
| `tsc --noEmit` (bff) | pass |

## 4. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 뷰모델 타입 `packages/core` 이동 | 소비처가 아직 없다 | FE 패널 슬라이스 (`FE-REQ-026` K절) |
| upstream GET 재시도 1회 | BFF 공통 재시도 유틸이 없다 | BFF 공통 정리 |
| 게이트 미렌더 카운터 · 미렌더율 | 관측 인프라 미정 | 배포 환경 확정 시 |
| upstream 취소 실측 | 코드만. 끊긴 요청의 서버 로그를 보지 않았다 | FE 패널 슬라이스에서 행 빠르게 바꾸며 확인 |
| `renderable: true` 실데이터 | 판단 성적표 표본이 0 — 전부 `insufficient_sample` | 시간 — 판단 유형당 20건 |
| `assetType` · `defaultMode` | 서버가 아직 안 준다 | F004 서버 후속 (FR-48) |
| `explain` 인증 · `/coach/report` · 429 | 이 슬라이스는 종목 판단만 | 다음 BFF 슬라이스 |
