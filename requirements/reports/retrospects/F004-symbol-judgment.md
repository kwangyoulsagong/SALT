# F004 슬라이스 1 종목 판단 스냅샷 · 사후 판정 · 게이트 — 회고

- 브랜치: `feat/f004-symbol-judgment` (base `docs/decisions-q3-q5-q6`) → PR #48, merge `6f701b4`
- 날짜: 2026-09-21 구현 · 2026-09-22 회고 작성(backfill: 체크리스트 · 커밋 메시지 · 코드 근거)
- 슬라이스: `requirements/specs/in-progress/F004-symbol-judgment-slice.md`
- 체크리스트: `requirements/reports/checklists/F004-symbol-judgment.md`
- 영역 기록: `salt-server/requirements/reports/{checklists,retrospects}/{SRV-REQ-024,SRV-REQ-025,DB-REQ-017}.md`

## 1. 무엇을 했나

종목 판단(`GET /api/ai-coach?symbol`)은 요청 때 계산하고 버려서 **성적표 표본이 영원히 0**이었다
(감사 문서 D11). 그래서 판단을 남기고, 관찰 기간(단타 24h · 장기 30일, B39)이 지나면 만기 뒤 첫 종가로
적중/실패를 매기고, 응답 `modes.{scalp,longTerm}` 에 모드별 게이트 · 성적표 · 실패사례를 실었다.
서버만 움직였다.

| 커밋 | 내용 |
|---|---|
| `1b8abd4` feat(srv)! | 스냅샷 테이블 · 사후 판정 · 3종 게이트 · `confidence` 제거(BREAKING). 되돌리려면 이 커밋 하나 |
| `61b7a78` docs(req) | 슬라이스 스펙 · 체크리스트 · `SRV-REQ-024/025` · `DB-REQ-017` 를 `in-progress` 로 |

## 2. 잘 된 것

**스냅샷을 `InvestmentInsight` 에 섞지 않았다.** REQ(`DB-REQ-017` FR-50~53 · `SRV-REQ-024` FR-107)는
`kind: symbol_judgment` 로 넣으라고 했지만, 그 테이블은 피드 · 대시보드 · 점수 계산이 타입 필터 없이
읽는다(`findActiveForScoring` 등). 별도 테이블 `symbol_judgment_snapshots` 로 가면서 **다르게 한 이유를
REQ Changelog 와 커밋 본문에 같이 남겼다.**

**판단이 사용자와 무관하다는 것을 먼저 확인했다.** `makeModeDecision` 은 `hasHolding` 을 받지만 점수에
쓰지 않는다. 그래서 사용자 열 없이 종목 · 모드당 한 벌이다.

**표본 독립성을 쓰는 시점에 강제했다**(`isJudgmentSnapshotDue`). 행 하나가 표본 하나라 성적이 SQL 집계
한 번이고, 읽을 때 다시 거를 코드가 없다. 같은 시각 재실행이 0행인 것을 실측했다(체크리스트 §2).

**사후 판정을 손계산으로 맞춰 봤다.** BTC · 단타 · `wait` 과거 스냅샷 → 만기 뒤 첫 종가 104,887,000 ·
−30.08% · `miss` 가 손계산과 일치했다. 인덱스는 `enable_seqscan=off` 로 세 쿼리 경로를 각각 확인했다.

**되돌리기 비용을 한 커밋에 가뒀다.** 마이그레이션은 테이블 추가뿐(`DROP TABLE symbol_judgment_snapshots`)이고
BREAKING(`confidence` 제거)은 `1b8abd4` 하나에 있다.

## 3. 틀렸던 것

### 피하기 판단이 게이트에서 영구 차단됐다

REQ FR-105 는 근거를 `reasons[]` 로 정했다. 그런데 `makeModeDecision` 은 **피하기의 이유를 `risks` 에만**
넣는다 — 긍정 신호가 없으면 `reasons` 가 빈다. 결과: 표본이 쌓여도 `avoid` 는 늘 `reasons_missing`.
실측 BTC 두 모드가 정확히 그랬고, 이 슬라이스는 그것을 **미검증 · 사용자 판단**으로 남긴 채 머지했다.

사용자 확정(2026-09-21) 후 `f722e5f`(PR #49)에서 `judgmentEvidence` — 피하기만 `reasons ∪ risks` — 로
닫았고 `SRV-REQ-024` FR-138 이 생겼다. BTC 두 모드의 차단 사유가 `reasons_missing` → `insufficient_sample`
로 바뀐 것을 확인했다(`F004-zone-gauge` 체크리스트 §2).

> **Action:** 게이트 입력 규칙을 정하기 전에 **판단 함수가 action 별로 어느 필드를 실제로 채우는지**를
> 본다. 실측 표에 action 별 `blockedReason` 을 한 줄씩 적으면 "한 유형이 영영 안 뜬다"가 바로 보인다.

### REQ 가 지정한 구조 둘이 실제 코드와 맞지 않았다

- FR-107 · `DB-REQ-017` FR-50~53: `InvestmentInsight` 에 행 종류를 더하라 → 그 테이블의 무필터 소비처를
  확인하지 않은 설계였다(위 §2).
- FR-104: "`renderGate.ts`(FR-10)를 그대로 쓴다" → **`renderGate.ts` 가 아직 없다.** 게이트는
  `policy/symbolJudgment.ts` 의 `judgmentGate` 다. 저장 추천과 종목 판단이 같은 함수를 지난다는 목표는
  열린 채다.

> **Action:** 기존 테이블에 행 종류를 더하는 스키마 REQ 는 **그 테이블을 필터 없이 읽는 쿼리 목록**을
> 본문에 먼저 적는다. 아직 없는 파일 · 함수를 "그대로 쓴다"고 적을 때는 선행 FR 을 Dependencies 에 둔다.

## 4. 남은 기술부채

| 항목 | 상태 | 근거 · 언제 |
|---|---|---|
| 피하기 영구 차단 | **닫힘** | `f722e5f` (PR #49) |
| 워커 실제 회차(10분) 로그 | 남음 | 유스케이스 직접 호출로만 확인. 서버 재기동 후 첫 회차 |
| 표본 20 도달 · `renderable: true` 실데이터 | 남음 | 시간 |
| 만기 뒤 종가가 끝내 없는 종목이 배치 200 자리를 계속 차지 | 남음 (소) | 지금 추적 2종목. 필요해지면 |
| BFF `mapDecision` 이 `confidence: undefined` 를 옮김 | 남음 | `BFF-REQ-025` |
| 실패사례에 다른 종목(다른 사용자 추적 종목)이 보임 | 남음 | PM 확인 대기 — 성적이 판단 유형 전체(`<mode>.<action>`)라서 |
| `SRV-REQ-025` FR-48 `defaultMode` | **미충족** | 컬럼 없음(`DB-REQ-017` FR-20) |
| `renderGate.ts` 공용 게이트 · FR-130 매핑 시드 · FR-133 경로별 카운터 | 미착수 | F004 후속 |

## 5. 다음에 보완할 규칙 · 문서

- `DB-REQ-017` FR-50~53 과 Acceptance Criteria, `SRV-REQ-024` FR-107 **본문**은 아직 `InvestmentInsight(kind:
  symbol_judgment)` 라고 적혀 있다. "다르게"는 Changelog 에만 있다 — 본문을 별도 테이블 기준으로 고친다.
- 슬라이스 1 체크리스트는 PR #49(`38422a1`)에서 FR-138 행 추가 · 피하기 미검증 행 삭제로 고쳐졌다.
  **다른 슬라이스가 앞 슬라이스 체크리스트를 고칠 때는 그 커밋을 체크리스트 머리에 적는다** — 지금은 diff 로만 보인다.
