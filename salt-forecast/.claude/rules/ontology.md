# 온톨로지 — 사실을 잇는 방법

## 1. 목적

에이전트가 "누가 이 종목을 움직이나"를 **출처 있는 사실**로 답하게 한다. 예측 피처도 여기서 뽑는다.
그래서 온톨로지는 **예측과 해설이 같은 사실을 본다**는 보장이다.

## 2. 모델 — 세 테이블

| 테이블 | 무엇 | 키 |
|---|---|---|
| `forecast.entity` | 종목(`asset`) · 기업(`company`) · 인물(`person`) · 지갑(`wallet`) · 기관(`institution`) · 문서(`document`) | `(kind, canonical_id)` |
| `forecast.relation` | 엔티티 사이 지속 관계: `issues`(기업→종목) · `officer_of`(인물→기업) · `major_holder_of` · `owns_wallet` · `listed_on` | `(kind, from_id, to_id, valid_from)` |
| `forecast.fact` | 시점 사건: `buyback_acquire` · `buyback_dispose` · `insider_buy` · `insider_sell` · `whale_transfer` · `exchange_inflow` · `exchange_outflow` · `news_mention` · `holding_change_13f` | `(kind, subject_id, object_id, observed_at, source, version)` |

fact 필수 필드: `observed_at` · `available_at` · `source` · `source_url` · `value`(수치, `numeric`) · `unit` · `currency` · `attrs`(JSONB, 스키마는 kind 별 pydantic) · `version`.

**관계에는 유효 기간**(`valid_from` · `valid_to`)이 있다. 임원이 퇴임하면 행을 지우지 않고 `valid_to` 를 채운다 —
as-of 조회가 과거 관계를 볼 수 있어야 한다.

## 3. 식별자 해소

| 대상 | 정본 id | 별칭 |
|---|---|---|
| 국내 기업 · 종목 | DART `corp_code` · 종목코드 6자리 | 한글명 · 영문명 · 약칭 |
| 미국 기업 · 종목 | SEC `CIK` · 티커 | 회사명 변형 |
| 코인 | 업비트 마켓 코드(`KRW-BTC`) | 심볼 · 영문명 |
| 인물 | 소스 id(Form 4 `reportingOwner` CIK · DART 보고자) | 이름(동명이인 주의 — 이름만으로 합치지 않는다) |
| 지갑 | 체인 + 주소 | 공개 라벨(거래소 핫월렛 등) |

- 별칭 표 `forecast.entity_alias(alias, lang, entity_id, source)`. 뉴스 · 공시의 이름을 여기로 해소한다.
- **해소 실패는 버리지 않고** `unresolved` 로 남긴다. 해소율을 작업 지표로 기록.
- 두 엔티티 병합은 `merged_into` 로 표시(행 삭제 금지).

## 4. 금액

- `value` 는 원 통화 그대로 + `currency`. 환산은 조회 시점 환율로 서버가 한다(공통 수용 기준 3).
- 비율 피처(시가총액 대비)는 `features` 에서 계산한다. fact 에 파생값을 넣지 않는다.

## 5. 에이전트가 쓰는 읽기 모양

서버 `intelligence` 컨텍스트가 SQL 로 읽는다. 여기서 뷰를 제공한다(`db-contract.md` §3):

- `forecast.v_symbol_facts(symbol, kind, observed_at, available_at, value, currency, source_url, summary)`
- `forecast.v_symbol_actors(symbol, actor_kind, actor_name, net_value_90d, last_at)`

뷰 컬럼은 **계약**이다. 바꾸면 `SRV-REQ` 와 같은 PR.

## 6. 그래프 DB

- 기본은 Postgres 관계 테이블 + 재귀 CTE. 2~3 홉 질의(종목 → 기업 → 임원 → 다른 기업)는 이걸로 충분하다.
- 그래프 DB 도입은 **측정된 질의 지연**(p95 > 200ms)이 근거일 때만, ADR 로.

## 7. 하지 않는 것

- LLM 으로 엔티티 · 관계 추출해 바로 저장 — 추출은 규칙 · 소스 구조화 필드로. LLM 추출이 필요하면 `confidence` + 검토 전 `unverified` 상태
- 이름 문자열로 인물 병합
- 사실 행 수정 — 새 `version`
