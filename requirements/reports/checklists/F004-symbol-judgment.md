# F004 슬라이스 1 — 종목 판단 스냅샷 · 사후 판정 · 게이트 — 체크리스트

슬라이스: `requirements/specs/in-progress/F004-symbol-judgment-slice.md` · 2026-09-21
브랜치: `feat/f004-symbol-judgment` (base `docs/decisions-q3-q5-q6`)

## 1. 요구사항 ↔ 구현

| REQ · FR | 판정 | 위치 |
|---|---|---|
| `SRV-REQ-024` FR-100 두 모드 늘 함께 | pass | `GetSymbolCoach` → `modes.scalp` · `modes.longTerm` |
| FR-101 중립 라벨 4종 | pass (기존 유지) | `policy/modeDecision.ts` |
| FR-102 신뢰도 제거 | pass | `ModeDecision` · `CoachExplanationInput` · explain DTO · Gemini 프롬프트 · Swagger |
| FR-103 `validity.code` | pass | `lib/judgmentTrack.ts` — `scalp_5m_24h` · `long_term_1w_1y` |
| FR-104~106 모드별 게이트 · 200 | pass | `policy/symbolJudgment.ts` `judgmentGate` |
| FR-107 스냅샷 | **다르게** | `SymbolJudgmentStore` · 별도 테이블 (`DB-REQ-017` Changelog) |
| FR-132 표본 0 ↔ `null` 구분 | pass | `winRate: null`, `sample: 0` |
| FR-134 사후 판정 · `IndicatorTrackRecord` 미사용 | pass | `EvaluateSymbolJudgments` |
| FR-135 적중 판정 B39 | pass | `judgeOutcome` — 테스트 3건 |
| FR-136 표본 독립성 | pass | `isJudgmentSnapshotDue` — 쓰는 시점 |
| FR-137 `insufficient_sample` · 실패 0건 차단 | pass | `judgmentGate` — 테스트 4건 |
| FR-138 피하기 근거 = `reasons ∪ risks` | pass | `judgmentEvidence` — 테스트 1건 (2026-09-21 사용자 확정) |
| `SRV-REQ-025` FR-40~43 · FR-45 · FR-47 | pass | 응답 필드 추가 · `confidence` 제거 |
| `SRV-REQ-025` FR-44 `zone` · FR-46 게이지 · FR-48 | **미충족** | 슬라이스 2 · 컬럼 없음 |

## 2. 실측 (로컬 DB)

| 확인 | 결과 |
|---|---|
| 1회차 스냅샷 (추적 2종목) | 4행 (2 × 2모드) |
| 같은 시각 재실행 | 0행 — 독립성 유지 |
| 과거 스냅샷(BTC · 단타 · wait · 진입 1억5천만) 판정 | 만기 뒤 첫 종가 104,887,000(2026-09-11 00:00) · −30.08% · `miss` — 손계산과 일치. 확인 후 삭제 |
| `evaluated_at` 저장 | UTC — Prisma 기록 방식과 같다 |
| 응답 `modes.*` (BTC, 실제 재료) | 두 모드 `avoid` · `reasons_missing` · 표본 0 · `winRate: null` |
| 인덱스 (`enable_seqscan=off`) | 마지막 판단 → 유니크 Index Only Scan · 성적/사례 → `(signal_type, outcome, judged_at)` · 미판정 → `(evaluated_at, judged_at)`. 4행이라 기본 계획은 Seq Scan |

## 3. 게이트

| 항목 | 결과 |
|---|---|
| `npm test` | **225/225** (+19: 도메인 13 · 유스케이스 6) |
| `tsc` · `npm run build` · `npm run lint` · `test:layer-check` | pass |
| 마이그레이션 | 테이블 추가만. 되돌리기 = `DROP TABLE symbol_judgment_snapshots` |

## 4. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 워커 실제 회차 | 유스케이스를 직접 불러 확인했다. 10분 워커 로그는 보지 않았다 | 서버 재기동 후 첫 회차 |
| 표본 20 도달 · `renderable: true` 실데이터 | 단타도 판단 유형당 20표본에 며칠~수 주가 걸린다 | 시간 |
| 만기 뒤 종가가 끝내 없는 종목 | 상장 폐지 등. 배치 200 중 자리를 계속 차지한다 | 필요해지면 — 지금 추적 2종목 |
| BFF `confidence: undefined` | 필드를 옮기기만 해 JSON 에서 빠진다. 계약 문서 정리는 `BFF-REQ-025` | BFF 슬라이스 |
| 실패사례에 다른 종목 표시 | 성적이 판단 유형 전체라서. 추적 종목이 다른 사용자 것일 수 있다(10명 비공개) | PM 확인 |
