# ADR-007 — forecast 스키마의 주인을 salt-forecast 로, 온톨로지 · 에이전트 · 개인 재무 채점을 그 위에

- 상태: **채택 (사용자 결정)**
- 날짜: 2026-10-30
- 대체: `ADR-004` §5 "forecast DDL 은 `salt-server/prisma` 에서만" — 서버 Kotlin 전환(`ADR-006`) 시점부터
- 관련: `FEATURE-008` FR-25 · FR-41 · `FEATURE-012` FR-4 · 5 · `FEATURE-013` FR-7 · 설계 `salt-forecast/docs/2026-10-30-ontology-agent.html` · `FC-REQ-022`~`025`

> 사용자 결정(2026-10-30): *"forecast도 onthology 지금 우리 기획했던거 같은데 안넣은거같고 forecast도 해야지"*

## 1. 결정

1. **온톨로지를 만든다** — `forecast.entity` · `relation` · `fact`(bitemporal: `valid_from/to` · `observed_at` · `ingested_at`),
   계약 뷰 `v_entity_asof` · `v_neighbors`(재귀 CTE ≤3홉). 그래프 DB 없음(ADR-004 그대로). 첫 적재는 이미 있는 데이터만(`FC-REQ-022`).
2. **에이전트는 문장만** — 도구 4종(`get_forecast_card` · `get_neighbors` · `get_event_reactions` · `get_documents`)만 쓰고,
   도구 결과에 없는 숫자는 검증기가 막는다. 개인 금액은 프롬프트 밖. 실패하면 템플릿(`FC-REQ-023`).
3. **예측 규율을 투자 밖으로** — 저축 도달 구간 · 월말 지출 착지도 구간 + 채점 이력. 계산은 도메인 서비스가 요청 시,
   채점은 forecast 가 `savings.ProjectionIssued` 이벤트로 받아 사용자 해시로만(`FC-REQ-024`).
4. **스키마 주인 이전** — 서버가 Flyway 로 가는 시점(서버 S5)에 forecast DDL 을 `salt-forecast` 안(plain SQL + 버전 표)으로.
   `public` 직접 읽기 4곳(`price_history` · `market_holidays` · `kr_stock_master` · `judgment_ledger`)은 export 뷰로(`FC-REQ-025`).

## 2. 왜

- FEATURE-008 은 "파이프라인 → 온톨로지 → 에이전트"를 약속했는데 가운데와 끝이 비어 있다(`ontology/__init__.py` 0줄).
  뉴스 · 일정 · 신호 · 종목 마스터가 흩어져 있어 질의가 매번 새로 짜이고 에이전트 도구를 만들 수 없다.
- 저축 · 가계부의 "언제 / 얼마"도 예측이다. 한 점 날짜는 거의 늘 틀린다(Dholakia 2011) — 같은 규율(ADR-003)이 맞다.
- MSA 에서 "자기 스키마는 자기가"가 원칙이면 forecast 만 예외일 이유가 없다.

## 3. 선택하지 않은 것

| 안 | 왜 아닌가 |
|---|---|
| Neo4j 등 그래프 DB | 2~3홉 질의뿐. 인프라가 하나 는다 |
| 사용자 재무 데이터를 forecast 배치로 보내 계산 | 개인 데이터가 배치 · 로그로 흘러간다. 계산은 도메인 서비스, 채점만 해시로 |
| 에이전트가 숫자 생성 | ADR-004 그대로 — 채점 불가 · 기억 누수 |
| 제도 파라미터의 주인을 forecast 로 | 원문 · 유효 구간 관리는 content 가 맞다. forecast 는 이벤트로 사본(Open Question 확정안) |

## 4. 되돌리기

O1~O4 는 테이블 추가뿐이라 삭제로 되돌린다. 스키마 주인 이전(O5)은 마이그레이션 위치만 바뀌고 DDL 은 같다 — 이전 PR 하나를 revert.
