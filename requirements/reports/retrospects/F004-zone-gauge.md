# F004 슬라이스 2 zone · 게이지 적중률 — 회고

- 브랜치: `feat/f004-zone-gauge` (base `main` `6f701b4`) → PR #49, merge `ebadcf9`
- 날짜: 2026-09-21 구현 · 2026-09-22 회고 작성(backfill: 체크리스트 · 커밋 메시지 · 코드 근거)
- 슬라이스: `requirements/specs/in-progress/F004-zone-gauge-slice.md`
- 체크리스트: `requirements/reports/checklists/F004-zone-gauge.md`
- 앞 슬라이스 회고: `requirements/reports/retrospects/F004-symbol-judgment.md`

## 1. 무엇을 했나

투자 우측 AI 코치 패널의 ③(구간)과 게이지 아래 한 줄이 쓸 값을 서버가 낸다. `modes.*` 마다 `zone`
(보유 = 내 규칙 가격, 미보유 크립토 = 관찰 구간, 그 외 = `unavailable`), 응답 최상위에
`gaugeTrackRecords`(지금 심리 구간에 있던 과거 날들의 30일 뒤 수익률 분포). 둘 다 과거 값과 사용자
규칙이고, 수익률 · 목표가 · 확률 필드가 없으며 거리는 금액(`priceGap`)뿐이다(D13).

| 커밋 | 내용 | 왜 나눴나 |
|---|---|---|
| `f722e5f` fix(srv) | 피하기 근거 = `reasons ∪ risks` (FR-138) | 슬라이스 1 의 열린 판단을 닫는 것 — zone 과 무관하게 되돌릴 수 있게 |
| `2771a9d` feat(srv) | `zone` — `held_rule` · `observation` · `unavailable` | |
| `1553a67` feat(srv) | `GaugeTrackRecord` 일 1회 집계 · 응답 한 줄 | 마이그레이션이 있는 쪽을 따로 |
| `38422a1` docs(req) | 스펙 · 체크리스트 · REQ Changelog | |

## 2. 잘 된 것

**보유 규칙 가격을 익절 계획과 같은 함수로 냈다**(`heldRuleZone` → `calculateProfitPlan`). 두 화면이 다른
손절선을 말하지 않는다. 대가는 `toFixed(2)` 반올림까지 따라온다는 것 — 슬라이스 스펙에 적어 뒀다.

**계산을 DB 에 맡겼다.** 관찰 구간 백분위는 `percentile_cont`(`PrismaPriceHistoryRepository.closePercentiles`),
게이지 분포도 SQL 집계다. 게이지 집계 92줄이 46ms, 재실행해도 92줄 그대로(멱등).

**컨텍스트 경계를 원천 쪽에 맞췄다.** 게이지 원천(심리 · 종가)이 둘 다 `market` 테이블이라 집계는
`market` 공개 API 가 하고, `coach` 는 결과만 받아 `gauge_track_records` 에 쓴다.

**"예측 아님"을 테스트로 고정했다.** FR-114 는 응답 키 이름을 검사하는 테스트로 pass 했다
(수익률 · 거리 % · 확률 키 0건). 필드명도 `p25` · `median` · `p75` · `positiveRate` 로 과거 분포로만 읽힌다.

**앞 슬라이스의 결함을 실측으로 닫았다.** BTC 두 모드 피하기 게이트가 `reasons_missing` →
`insufficient_sample` 로 바뀐 것을 확인했다(체크리스트 §2).

## 3. 틀렸던 것

이 슬라이스 안에서 되돌리거나 고친 커밋은 **기록된 것 없음.** 대신 REQ 쪽 전제 하나와 게이트 쪽
구멍 하나가 드러났다.

### FR-115 `excluded_asset` 은 지금 데이터로 낼 수 없다

REQ 는 `kr_stock` 을 `unavailable(excluded_asset)` 로 가르라고 했지만 자산군 enum 이 `crypto` · `stock`
둘뿐이다. 미보유 주식은 전부 `out_of_scope` 이고 `excluded_asset` 은 나오지 않는다 — **미충족**.
`SRV-REQ-024` Dependencies 에 자산군 확장(`DB-REQ-003`)이 없다.

> **Action:** enum 값에 기대는 FR 은 그 enum 을 만드는 REQ 를 Dependencies 에 적는다.

### 테스트 파일의 타입 오류를 게이트가 못 본다

`market.test.ts` 에 fake 메서드 누락(`findLatestMany` 등)으로 타입 오류 3건이 있다. 이 브랜치 이전부터
있었고, `tsx` 테스트는 타입을 보지 않아 **239/239 통과와 공존한다.** `tsc` · `build` 도 pass 였다.

> **Action:** 테스트 파일도 타입 검사 대상에 넣는 명령을 게이트에 둔다. 포트에 메서드를 더할 때
> fake 가 조용히 어긋나는 경로가 지금 열려 있다.

## 4. 남은 기술부채

| 항목 | 상태 | 근거 · 언제 |
|---|---|---|
| 워커 실제 회차(10분 · 일 1회 `20 0 * * *`) 로그 | 남음 | 유스케이스 직접 호출로만 확인 |
| 게이지 `lowSample: false` 실데이터 | 남음 | 심리 이력 4개월 · 하루 1표본 → 줄마다 표본 1~2. 구간당 20일 이상 |
| `excluded_asset` | **미충족** | `DB-REQ-003` |
| 관찰 구간 최소 표본(기대 캔들 수 절반 — 단타 144/288 · 장기 183/365) | 남음 (소) | REQ 에 기준이 없어 슬라이스가 정했다. `SRV-REQ-024` Changelog 에만 있다 |
| 1원 미만 코인의 `held_rule` 가격이 거칠다 | 남음 (소) | `calculateProfitPlan` 의 `toFixed(2)` |
| `smart_money` 게이지(FR-124) · 구간 스냅샷(FR-117) | 범위 밖 | Should |
| `market.test.ts` 타입 오류 3건 | 남음 | 별도 정리 |
| 실패사례에 다른 사용자 추적 종목 표시 | 남음 | PM 확인 대기(2026-09-21 사용자) |
| BFF `confidence: undefined` · 새 필드 BFF 미전달 | 남음 | `BFF-REQ-023~025` |

## 5. 다음에 보완할 규칙 · 문서

- 슬라이스 1 은 `npm run lint`, 이 슬라이스는 `eslint src/coach src/market src/workers` 로 **범위를 좁혀**
  돌렸다(체크리스트 §3). 좁혔으면 이유를 체크리스트에 한 줄 적는다.
- `SRV-REQ-024` FR-112 의 "최소 표본" 기준을 REQ 본문 기본값으로 올린다 — 지금은 Changelog 와 슬라이스
  스펙에만 있다.
