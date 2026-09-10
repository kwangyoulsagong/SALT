---
id: FE-REQ-014
feature: F001
area: fe
kind: UI
title: "F001 개입 청구서 — 웹 UI 정의 (3선 그래프 · 대칭 렌더 · 잔차 노출 · CSV 업로드)"
priority: critical
labels: [fe, ui, fsd, invoice, chart, a11y]
created: 2026-09-09
---

## Summary

청구서 화면. 이 화면의 설계 제약은 **자책 도구가 되면 안 된다**는 것이다 — 손실과 이익을 **같은 시각적 비중**으로 렌더하고, 점수·등급·벌점을 만들지 않고, 2인칭 인격 평가를 하지 않는다.

## FSD 배치

| 레이어 | 슬라이스 | 컴포넌트 |
|---|---|---|
| `pages` | `assets` | 자산 탭 → 청구서 세그먼트 |
| `widgets` | `asset-workspace` | 세그먼트 3(포지션/청구서/세금) |
| `features` | `import-ledger` | CSV 업로드 · 실패 행 표시 |
| `features` | `register-exchange-key` | 조회 전용 키 등록 · 스코프 결과 |
| `entities` | `invoice` | `CounterfactualChart` · `InvoiceSummary` · `BiasBreakdown` · `TradeAttributionRow` · `MostExpensiveHabitCard` · `GainHighlightCard` · `FeeLineCard` · `ReconciliationNote` |
| `entities` | `ledger` | `LedgerHealthBanner` · `HoldingDiffTable` · `CoverageNote` · `ExchangeKeyRow` |
| `shared` | `ui` | `BlockBoundary` |

## 화면 구조

```
자산 탭 → 청구서 세그먼트
┌─ 원장 건강도 배너 (degraded 시)
│   "계산된 잔고가 실제 잔고와 1.2% 차이납니다" [원장 점검]
├─ [Suspense] 3선 그래프
│   실제 나(굵은 실선) · 아무것도 안 함(점선) · 기계적 적립(얇은 파선)
│   기간 탭: 30 · 90 · 180(기본) · 365 · 전체
├─ [Suspense] 청구서 요약 (3카드)
│   개입 손익 −1,240,000원   규율 손익 −430,000원   수수료 −86,000원
├─ [Suspense] 가장 비싼 습관 카드
│   "패닉셀 3건 −890,000원"  [거래 보기]
├─ [Suspense] 잘한 개입 카드          ← 손실 카드와 같은 크기·위치 비중
│   "잘한 익절 2건 +46,000원"  [거래 보기]
├─ [Suspense] 편향별 아코디언
│   패닉셀 3건 −890,000 / 추격매수 5건 −310,000 / 수수료 42건 −86,000 / 잘한 익절 2건 +46,000 / 분류없음 …
│   펼치면 거래 목록 (날짜·수량·단가·현재가·귀속손익)
├─ 계산 기준 (스냅샷 시각 · 현재가 반영 시각 · 기준자산)
├─ 잔차 표시 (residual · withinTolerance)
├─ 결측/미지원 안내 (interpolatedDays · unsupportedTransactions)
└─ AI 코치 해설 3문장 (narrative, null 허용)
```

## Requirements

### A. 3선 그래프

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 트랙 3개를 **선 스타일로 구분**한다: 실제=굵은 실선, Do-Nothing=점선, DCA=얇은 파선. **색만으로 구분하지 않는다** | Must |
| FR-2 | **직접 라벨**을 붙인다(범례만 두지 않는다) | Must |
| FR-3 | `lightweight-charts`를 `next/dynamic` + `ssr: false`로 마운트한다 | Must |
| FR-4 | 기간 탭 5개(30/90/180/365/전체). 기본 180 | Must |
| FR-5 | Do-Nothing 정의를 **툴팁으로 항상 노출**한다: "입금 시점에 전액 {benchmarkSymbol}로 바꾼 뒤 한 번도 매매하지 않은 가정" | Must |
| FR-6 | 언마운트 시 차트 인스턴스를 `remove()`한다 | Must |

### B. 대칭 렌더 — 자책 방지 정책

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | **`topGains`를 `topLosses`와 같은 크기·위치 비중으로** 렌더한다. 디자인 리뷰 승인이 수용 기준 | Must |
| FR-11 | `hasGains: false`면 "이 기간 이익 항목이 없습니다"에서 멈추지 않고 **기계적 적립 트랙 결과를 나란히** 표시한다 | Must |
| FR-12 | **점수·등급·벌점 표현을 만들지 않는다.** 원화 금액과 건수만 | Must |
| FR-13 | **2인칭 인격 평가 금지.** "당신은 패닉셀러입니다" ❌ / "이 3건의 매도 후 90일 내 가격이 회복되었습니다. 합계 −890,000원" ⭕ | Must |
| FR-14 | 기간 내 거래가 0건이면 "이 기간에는 아무것도 하지 않았습니다. 개입 손익 0원 — 이것도 좋은 결과입니다." | Must |
| FR-15 | 손익 부호를 **색 + `+`/`−` 문자** 동시 표기. 상승 `#FF2E55` / 하락 `#1677EE` 토큰 사용 | Must |

### C. 잔차와 신뢰도 — 숨기지 않는다

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `reconciliation.residual`을 **화면에 표시**한다. `withinTolerance: true`면 작게, `false`면 경고로 | Must |
| FR-21 | `residual`이 없으면 **청구서를 렌더하지 않는다.** 잔차 노출은 정책이다 | Must |
| FR-22 | 원장 오차(`maxDiffRate > 0.5%`)면 **상단 고정 경고 배너** + [원장 점검] CTA | Must |
| FR-23 | 일봉 결측(`interpolatedDays`)을 안내한다. 5% 초과면 경고 | Must |
| FR-24 | `unsupportedTransactions`를 안내한다. 스테이킹·에어드랍·스왑이 계산에 없다는 사실을 숨기지 않는다 | Must |
| FR-25 | 계산 기준 시각(`computedAt`)과 현재가 반영 시각(`priceAdjustedAt`)을 둘 다 표시한다. `priceStale: true`면 명시 | Must |

### D. 편향 아코디언과 거래 목록

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 편향별 집계를 `<details>` 기반 아코디언으로. 펼치면 거래 목록 | Must |
| FR-31 | 라벨을 **사실 서술 문구**로 렌더한다. 서버는 코드만 준다 | Must |
| FR-32 | `none`(분류없음)도 표시한다. 숨기면 합계가 안 맞아 보인다 | Must |
| FR-33 | 거래 행에 날짜·수량·단가·현재가·귀속손익. **커서 페이징** | Must |
| FR-34 | 거래 행을 누르면 **전후 90일 가격 차트**로 이동한다. 판단 근거를 되짚게만 하고 **규칙을 강제하지 않는다** | Must |
| FR-35 | 편향 필터(`?bias=panic_sell`)와 정렬(손익 오름/내림)을 제공한다 | Should |
| FR-36 | 청구서 표에 **스크린리더용 `<caption>`** 을 제공한다 | Must |

### E. CSV 업로드

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 드래그앤드롭 + 파일 선택. `tradesCsv` 필수, `cashflowCsv` 선택 | Must |
| FR-41 | 업로드 중 진행 표시. **취소 가능** | Must |
| FR-42 | 결과 요약: `inserted` · `duplicated` · `failed` | Must |
| FR-43 | 실패 행을 **최대 10건 표시** + 실패 행 CSV 다운로드 | Must |
| FR-44 | `unsupported` 행을 별도로 표시한다(실패와 다르다) | Must |
| FR-45 | `holdingDiff`(전/후 보유 변화)를 표시한다 | Should |
| FR-46 | 같은 CSV 재업로드 시 `inserted: 0, duplicated: N`이 정상임을 안내한다 | Must |
| FR-47 | 거래 0건 상태에서는 청구서 대신 **온보딩 1단계**를 보여준다. 다운로드 위치 안내 + **워터마크 `예시`가 붙은 샘플 청구서** | Must |

### F. 거래소 키

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 키 등록 폼. **조회 전용 키만 등록 가능함을 명시** | Must |
| FR-51 | `403 SCOPE_NOT_ALLOWED`면 **"주문·출금 권한이 있는 키는 등록할 수 없습니다"** + 조회 전용 키 발급 방법 안내 | Must |
| FR-52 | 등록 후 `accessKeyMasked`와 `scopes`를 표시한다. **secret을 화면에 다시 보여주지 않는다** | Must |
| FR-53 | 업비트 제한 안내: 계정당 키 10개, 키당 허용 IP 10개 | Should |
| FR-54 | 키 삭제 시 `useDialog().confirm`으로 확인받는다 | Must |

## UX 상태

- **Loading**: 3선 그래프 스켈레톤 + "거래 N건 / 일봉 M개 계산 중". 스냅샷이 있으면 먼저 렌더 + "현재가 반영 중" 인라인 스피너
- **Empty (거래 0건)**: FR-47
- **Empty (기간 내 거래 0건)**: FR-14
- **Error (파싱 실패)**: FR-43
- **Error (계산 실패)**: 마지막 성공 스냅샷 + "최신 계산 실패 ({시각} 기준 데이터)" + 재시도
- **Degraded (원장 불일치)**: FR-22
- **Degraded (LLM 실패)**: `narrative`가 null이면 그 영역을 렌더하지 않는다. 오류를 표시하지 않는다
- **Optimistic update**: **없음.** 금액 화면에서 금지

## 접근성

| ID | 요구사항 |
|---|---|
| FR-60 | 3선을 **선 스타일 + 직접 라벨**로 구분 (색만 아님) |
| FR-61 | 손익 부호를 색 + `+`/`−` 문자 |
| FR-62 | 청구서 표에 `<caption>` |
| FR-63 | 아코디언은 `<details>` 또는 `aria-expanded` |
| FR-64 | 큰 금액에 `aria-label`("개입 손익 마이너스 백이십사만원") |
| FR-65 | 늦게 오는 블록에 `aria-busy` |

## Acceptance Criteria

- [ ] 3선이 선 스타일로 구분되고 직접 라벨이 있다 (색만 사용 0건)
- [ ] 차트가 `ssr: false`로 마운트되고 언마운트 시 `remove()`된다
- [ ] 기간 탭 5개가 동작하고 기본이 180이다
- [ ] Do-Nothing 정의 툴팁이 `benchmarkSymbol`을 포함해 표시된다
- [ ] **`topGains`가 `topLosses`와 같은 크기·위치 비중으로 렌더된다** (디자인 리뷰 승인)
- [ ] `hasGains: false`에서 기계적 적립 트랙이 나란히 표시된다
- [ ] 점수·등급·벌점 표현이 0건이다
- [ ] 2인칭 인격 평가 문구가 0건이다
- [ ] 기간 내 거래 0건에서 자책 프레이밍이 0건이다
- [ ] 손익 부호가 색 + 문자로 표시된다
- [ ] **`residual`이 화면에 표시된다**
- [ ] **`residual`이 없으면 청구서가 렌더되지 않는다**
- [ ] `maxDiffRate > 0.5%`에서 상단 고정 경고 + CTA가 나온다
- [ ] `interpolatedDays`·`unsupportedTransactions`가 안내된다
- [ ] `computedAt`·`priceAdjustedAt`이 둘 다 표시되고 `priceStale`이 명시된다
- [ ] 편향 아코디언에 `none`이 포함된다
- [ ] 거래 행을 누르면 전후 90일 차트로 이동한다
- [ ] 청구서 표에 `<caption>`이 있다
- [ ] CSV 드래그앤드롭이 동작하고 업로드를 취소할 수 있다
- [ ] 실패 행이 10건까지 표시되고 CSV 다운로드가 된다
- [ ] `unsupported`가 실패와 구분되어 표시된다
- [ ] 재업로드 시 `duplicated`가 정상임이 안내된다
- [ ] 거래 0건에서 온보딩 + 워터마크 샘플이 나온다
- [ ] `403 SCOPE_NOT_ALLOWED`에서 조회 전용 키 안내가 나온다
- [ ] 화면에 secret 평문이 0건이다
- [ ] 키 삭제 시 confirm이 뜬다
- [ ] 낙관적 갱신이 0건이다
- [ ] 375px에서 body 가로 스크롤이 0이다

## Dependencies

- **선행:** `FE-REQ-008`(Suspense) · `FE-REQ-009`(FSD) · `BFF-REQ-012`
- **짝:** `FE-REQ-015`(FUNC) · `016`(API) · `017`(PERF)
- **규칙:** `a11y-policy.md` · `i18n-policy.md` · `canvas.md`(차트 부하 기준)

## Open Questions

- 3선 그래프를 `lightweight-charts`로 그릴지 `Sparkline`/`BarChart`로 그릴지. **3선 시계열은 `lightweight-charts`가 맞지만** 그것이 이미 실시간 캔들용으로 쓰이고 있어 인스턴스 관리가 겹친다.
- 워터마크 샘플 청구서의 데이터를 어디서 가져올지(하드코딩 vs 서버 샘플).
- 전후 90일 차트를 같은 화면 모달로 띄울지 별도 화면으로 갈지. 모달이 기본안.
