# 온톨로지 · 에이전트 도구 — 사실을 잇고, 문장만 만든다

근거: `ADR-007` §1-1 · 1-2 · `FC-REQ-022`(O1 · O2) · `FC-REQ-023`(O3) · 기획 `FEATURE-008` FR-25 · FR-41 · FR-44 · FR-49.
설계 `salt-forecast/docs/2026-10-30-ontology-agent.html`. 시간 규칙은 `time-and-leakage.md` 가 이 문서보다 위다.

> 2026-10-30 개정 — 9월 초안(서버 `intelligence` 컨텍스트 · `v_symbol_facts` · `v_symbol_actors`)을 ADR-007 로 바꿨다.
> 코드는 아직 없다(`ontology/__init__.py` 0줄). 착수는 마스터 인덱스 §4-1 순위 3a.

## 1. 목적

에이전트가 "누가 이 종목을 움직이나 · 이 사건이 무엇에 닿나"를 **출처 있는 사실**로 답하게 한다.
예측 피처도 같은 사실에서 뽑는다 — **예측과 해설이 같은 사실을 본다**는 보장이다.

## 2. 모델 — 세 테이블 (`FC-REQ-022` FR-1~3)

| 테이블 | 열 |
|---|---|
| `forecast.entity` | `id` · `kind` · `canonical_name` · `external_ids`(jsonb — 원천 키) · `created_at` |
| `forecast.relation` | `subject` · `predicate` · `object` · `valid_from` · `valid_to` · 시간 열(§3) · `source_url` · `source_kind` · `confidence` |
| `forecast.fact` | `entity` · `attribute` · `value_num` · `value_text` · `unit` · `valid_from` · `valid_to` · 시간 열(§3) · `source_url` |

| 닫힌 목록 | 값 |
|---|---|
| `entity.kind` | `asset` · `company` · `person` · `institution` · `wallet` · `event` · `document` · `sector` · `policy` |
| `relation.predicate` | `issued` · `listed_as` · `holds` · `traded` · `mentions` · `affects` · `belongs_to` · `regulates` |

- 목록에 없는 kind · predicate 는 **REQ 개정이 먼저**다. 적재 코드에서 새 문자열을 만들지 않는다(DB CHECK 로 막는다)
- **관계 · 사실은 지우지 않는다.** 끝난 관계는 `valid_to` 를 채운다. 값이 바뀌면 새 행 — as-of 질의가 과거를 볼 수 있어야 한다
- 금액 `value_num` 은 원 통화 그대로 + `unit`. 환산 · 비율(시가총액 대비)은 조회 쪽(`features` · 서버)에서. 사실 행에 파생값 0

## 3. 시간 — 두 축 (bitemporal)

| 열 | 뜻 | 규칙 |
|---|---|---|
| `valid_from` · `valid_to` | 세상에서 사실이 참이던 구간 | 관계 · 속성의 유효 기간 |
| `observed_at` | 사건이 일어난 시각 | `time-and-leakage.md` 와 같은 뜻 |
| `available_at` | 우리가 **알 수 있게 된** 시각 | **as-of 거르기의 유일한 기준** |
| `ingested_at` | 우리 DB 에 들어온 시각 | 감사 · 재적재 추적용. as-of 기준으로 쓰지 않는다 |

- `v_entity_asof(as_of)` 는 `available_at <= as_of` 행만, 그 시점 최신 버전만. `ingested_at` 으로 거르면 백필한 과거 사실이 과거 as-of 에서 사라져 백테스트가 틀린다(`time-and-leakage.md` §1 — `FC-REQ-022` FR-4 정정 2026-10-30)
- 원천에 게시 시각이 없으면 `observed_at + 소스별 지연 상한`(`data-pipeline.md` §4)
- 수용 기준: 무작위 as-of 1,000회에서 미래 `available_at` 행 0(`FC-REQ-022` 누수 테스트)

## 4. 식별자 해소

| 대상 | 정본 id(`external_ids`) | 별칭 |
|---|---|---|
| 국내 종목 · 기업 | 종목코드 6자리 · DART `corp_code` | 한글명 · 영문명 · 약칭 |
| 코인 | 업비트 마켓 코드(`KRW-BTC`) | 심볼 · 영문명 |
| 인물 | 원천 id(DART 보고자 등) | 이름 — **이름만으로 합치지 않는다**(동명이인) |
| 지갑 | 체인 + 주소 | 공개 라벨 |

- 해소 실패는 버리지 않고 `unresolved` 로 남긴다. 해소율을 잡 지표로 기록
- 두 엔티티 병합은 `merged_into` 표시 — 행 삭제 금지
- 뉴스 → 종목 매칭은 수기 라벨 200건으로 정밀도 · 재현율을 잰다(`FC-REQ-022` FR-10). 기준(정밀도 0.9 · 재현율 0.7, 분포 보고 확정) 미달이면 **`mentions` 간선을 에이전트 도구에 쓰지 않는다**(FR-11)

## 5. 적재 — `ontology_build` 잡 (`FC-REQ-022` FR-5 · 6)

- **이미 있는 데이터만**: 종목 마스터 · 업비트 마켓 → `asset` · `company` · `listed_as` · `belongs_to` / 뉴스 · 감성 점수 → `document` · `mentions` · 감성 fact /
  일정 · 신호 사건 → `event` · `affects` / 사건 반응 → 반응 fact. 새 원천은 `security-sources.md` 표에 행부터
- 멱등 — 원천 키를 `external_ids` 에 두고 upsert. 재적재 2회 뒤 행 수 동일
- LLM 으로 엔티티 · 관계를 추출해 바로 저장하지 않는다 — 규칙 · 원천 구조화 필드로. LLM 추출이 필요해지면 `confidence` + 검토 전 `unverified`
- 파이프라인 층(`architecture.md`)은 그대로: `ingest` → `store` → `ontology` → `features`. `ontology` 는 `models` 를 모른다

## 6. 계약 뷰 — 에이전트 도구가 읽는 모양 (`FC-REQ-023` FR-1)

| 도구 | 뷰 |
|---|---|
| `get_forecast_card(asset, as_of)` | `v_forecast_card`(기존) |
| `get_neighbors(entity, depth≤3, as_of)` | `v_neighbors` — 재귀 CTE, 3홉 상한 |
| `get_event_reactions(event_kind, sector)` | 반응 분포 뷰(신규) |
| `get_documents(entity, since)` | 문서 뷰(신규) |

- 뷰 컬럼은 **계약**이다. 바꾸면 소비자(서버 coach — S6 전 TS, 뒤 Kotlin)와 같은 PR(`db-contract.md` §3)
- 모든 도구 결과 행에 `source_url` · 시각. 출처 없는 행을 도구가 돌려주지 않는다
- 성능: 3홉 질의 p95 200ms 이하(로컬). **그래프 DB 는 넣지 않는다** — 이 기준을 측정으로 못 지킬 때만 ADR 로

## 7. 에이전트 — 문장만 만든다 (`FC-REQ-023` FR-2~6)

- 도구는 §6 의 넷뿐. 도구 결과에 없는 숫자가 문장에 있으면 **검증기가 탈락**시킨다(숫자 대조 · 금지어 · 명령형 · 인용 — 기존 검증기 재사용)
- **개인 금액(보유 수량 · 평단 · 원화 손익)은 프롬프트에 0** — 프롬프트 빌더 입력 타입에 그 필드가 없어야 한다
- 실패 · 검증 탈락 · 비용 상한 → 템플릿 해설로 돌아간다. 빈칸 · 오류 화면 0
- 켜는 조건: 블라인드 A/B 20건(템플릿 vs 에이전트)에서 이긴 경우만, 소유자 전용으로(`ADR-003`)
- 서버 쪽 도구 호출 구현은 서버 REQ 로 따로(`FC-REQ-023` FR-7) — 이 저장소는 뷰와 평가까지

## 8. 하지 않는 것

- ❌ as-of 를 `ingested_at` · `observed_at` 으로 거르기
- ❌ 이름 문자열로 인물 · 기업 병합 · 사실 행 수정(새 행으로)
- ❌ 닫힌 목록 밖 kind · predicate 를 코드에서 만들기
- ❌ 에이전트가 숫자를 만들거나 개인 금액을 보기
- ❌ 그래프 DB · 벡터 DB 를 측정 없이 추가
