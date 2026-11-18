# 온톨로지 · 에이전트 도구 — 사실을 잇고, 문장만 만든다

근거: `ADR-007` §1-1 · 1-2 · `FC-REQ-022`(O1 · O2) · `FC-REQ-023`(O3) · 기획 `FEATURE-008` FR-25 · FR-41 · FR-44 · FR-49.
설계 `salt-forecast/docs/2026-10-30-ontology-agent.html`. 시간 규칙은 `time-and-leakage.md` 가 이 문서보다 위다.

> 2026-10-30 개정 — 9월 초안(서버 `intelligence` 컨텍스트 · `v_symbol_facts` · `v_symbol_actors`)을 ADR-007 로 바꿨다.
> 첫 코드 2026-11-16(F017 v4 순서 5): 표 셋 + v4 네 층(`cause_candidate` · `evidence` · `outcome`) · `ontology/build.py` · 매일 `ontology_build`.
> 원천 열넷(`domain/ontology_sources.py` 머리 목록) — 마스터 · 코인 이름 · 원인 스냅샷 · 공시 · 소식 제목 · 기사 · 추출 사실 · 일정 · 반응 통계 · 신호 · 거시 시계열 · β · 경보 · 상태.
> 문서 id = 서버 사실 id(`document:kr-news:<번호>` …) — 원인 후보 · 소식 · 추출 사실이 한 점. 종목 고빈도 시계열은 복제 0.

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

- as-of 는 **함수**(뷰는 인자를 못 받는다 — FR-4 정정 2026-11-16): `f_fact_asof(as_of, entity?)` · `f_relation_asof(as_of)` · `f_neighbors(id, depth ≤ 3, as_of)`. `available_at <= as_of` 행만, 그 시점 최신 버전만. `ingested_at` 으로 거르면 백필한 과거 사실이 과거 as-of 에서 사라져 백테스트가 틀린다(`time-and-leakage.md` §1 — `FC-REQ-022` FR-4 정정 2026-10-30)
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
- 뉴스 → 종목 매칭은 라벨 표본으로 정밀도 · 재현율을 잰다(`FC-REQ-022` FR-10 — `jobs/ontology_quality` 주 1회, 라벨 `reports/o2-labels-*.tsv`). 기준(정밀도 0.9 · 재현율 0.7) 미달이면 **`mentions` 간선을 에이전트 도구에 쓰지 않는다**(FR-11). 원천 연결을 그대로 믿지 않는다 — `resolve_mentions`(제목이 받칠 때만 확신 1.0 · 미해소 버림 · 충돌 이름은 더하지 않음), 쓰는 쪽은 확신 ≥ 0.5 만
- **해소 규칙을 바꾸면 온톨로지를 다시 적재한다**(관계는 처음 안 값을 지켜 확신이 안 바뀐다) — 파생 데이터라 원천에서 다시 만든다. 단 마스터 상태 이력(바뀔 때만 쌓은 사실)은 원천에 이력이 없어 잃는다

## 5. 적재 — `ontology_build` 잡 (`FC-REQ-022` FR-5 · 6)

- **이미 있는 데이터만**: 종목 마스터 · 업비트 마켓 → `asset` · `company` · `listed_as` · `belongs_to` / 뉴스 · 감성 점수 → `document` · `mentions` · 감성 fact /
  일정 · 신호 사건 → `event` · `affects` / 사건 반응 → 반응 fact. 새 원천은 `security-sources.md` 표에 행부터
- 멱등 — 원천 키를 `external_ids` 에 두고 upsert. 재적재 2회 뒤 행 수 동일. **처음 안 값을 지킨다**(`bulk_upsert(keep_existing=True)` — 나중 기록이 available_at 을 늦추면 과거 as-of 에서 사라진다). 지금 값만 주는 원천(마스터 소속)은 바뀔 때만 옛 관계 `valid_to` + 새 행
- LLM 으로 엔티티 · 관계를 추출해 바로 저장하지 않는다 — 규칙 · 원천 구조화 필드로. LLM 추출이 필요해지면 `confidence` + 검토 전 `unverified`
- 파이프라인 층(`architecture.md`)은 그대로: `ingest` → `store` → `ontology` → `features`. `ontology` 는 `models` 를 모른다
- **파일 지도 — 이름이 여럿인 이유는 층**(기능 이름을 층마다 반복하는 관례 — `cause_explain` · `move_news` 와 같다. 중복이 아니다):

  | 파일 | 층 | 하는 일 |
  |---|---|---|
  | `domain/ontology.py` | domain(I/O 0) | 네 층 뼈대 — id 규칙 · 닫힌 kind/predicate · 시각 둘 · 결과(④) · `Graph` |
  | `domain/ontology_sources.py` | domain(I/O 0) | 원천 하나 = 함수 하나 → `Graph` 에 더할 행. 원천을 셋 → 열넷으로 늘릴 때 뗐다(2026-11-16 `1f2a10e0`). **새 원천은 여기** |
  | `store/ontology.py` | store | 원천 읽기 · 네 층 쓰기(as-of 필터는 여기서) |
  | `ontology/build.py` | ontology(조립) | 위 셋을 이어 한 번 적재 — 규칙 0, 순서만 |
  | `jobs/ontology_build.py` · `ontology_quality.py` | jobs | 매일 `daily.sh` 입구 · 품질 리포트 |

## 6. 계약 — 에이전트 도구가 읽는 모양 (`FC-REQ-023` FR-1 · `DB-REQ-045`, 2026-11-18)

| 도구 | 계약 |
|---|---|
| `get_forecast_card(asset, as_of)` | `v_forecast_card`(기존, `renderable` 행만 · 3종이 다 있을 때만 줄) |
| `get_neighbors(entity, depth, as_of)` | `f_agent_neighbors` — `f_neighbors` 걸음 + mentions 는 관문 통과 · 확신 ≥ 0.5 · 30일 문서만. 문서 · 사건은 지나가는 점 · 같이 언급 수. 서버는 2홉만 |
| `get_event_reactions(event_kind, …)` | `v_agent_event_reactions`(사건 창 · 소식 반응 · 신호 · 실적, 채점 통과 행만) — 메뉴는 `f_agent_recent_events`(그 종목에 **최근 실제로 일어난** 사건)만. 업종 범위 통계는 없다(지어내지 않는다) |
| `get_documents(entity, since)` | `f_agent_documents` — "최근"은 `observed_at`, 누수 거르기는 `available_at`(백필한 옛 공시가 이번 주로 나왔다) · 공시 먼저 |

- 함수 · 뷰 컬럼은 **계약**이다. 바꾸면 소비자(서버 coach `PrismaAgentToolReader` — S6 전 TS)와 같은 PR(`db-contract.md` §3)
- **출처** — 행마다 `source_kind` + 시각, 원문 주소가 있는 원천은 `source_url`(DART 는 접수번호로 만든다). 원문 주소가 없는 원천(시황 제목 · 마스터 · 내부 통계)은 출처 이름 + 시각(`FC-REQ-023` FR-2 정정 2026-11-18). 출처 종류 · 시각 없는 행 0
- O2 관문은 `ontology_quality_gate`(잡이 쓴다) — 마지막 관문이 미달이거나 기록이 없으면 mentions 간선을 도구가 안 쓴다(`f_agent_mentions_ok`)
- 성능: 2홉 p95 4ms · 3홉 38ms · 허브 종목(삼성전자) 2홉 28ms(실데이터 200종목). **허브(`asset:market:*`)는 이웃으로 돌려주되 지나가지 않는다**. 간선 거르기를 CTE 로 모으면 인덱스를 못 타 3홉 3.6초 · "어디서 왔나"를 뒤 홉 점(언급 3만 건 종목)에서 펼치면 0.9초(2026-11-18) — 관계 표를 읽는 자리마다 조건 · 앞 홉 점에서 펼친다 · **허브에서 시작하면 1홉(소속)만**(코스피 3홉 69초). `f_neighbors` 도 같은 고침(3홉 p95 2.4초 → 33ms, 허브 아닌 시작점 결과 같음). **그래프 DB 는 넣지 않는다**

## 7. 에이전트 — 고르기만, 문장은 기존 작성기 (`FC-REQ-023` FR-2~6 · `SRV-REQ-059`)

- 모델은 **도구를 고르기만**(JSON) — 도구는 서버가 부른다. 로컬 CLI 는 도구 0 격리 그대로. 왕복 ≤ 2 · 호출 ≤ 4 · 대상은 이 종목 + 앞 결과 이웃
- 결과 줄은 해설 입력 `tools` → 기존 검증기(숫자 대조 · 금지어 · 명령형 · 인용). 도구 결과에 없는 숫자는 탈락 · 제목 줄 숫자는 뉴스 칸만
- **개인 금액(보유 수량 · 평단 · 원화 손익)은 프롬프트에 0** — 입력 타입에 그 필드가 없다(컴파일 시험)
- 실패 · 검증 탈락 · 비용 상한 → 기존 재료 해설 · 템플릿. 빈칸 · 오류 화면 0
- 켜는 조건: 블라인드 A/B 20건에서 이긴 경우만, 소유자 전용으로(`ADR-003`). **템플릿만 이기면 약한 문턱** — 운영 해설과도, 그리고 **변수를 하나만 바꾼 대조군**(같은 프롬프트 · 도구 사실 0)과도 잰다. 2026-11-18: 템플릿 20:0 · 운영 해설 14:5 였지만 대조군 10 : 에이전트 6 → **켜지 않음**(측정 경로만 — `npm run explain:agent-ab`)

## 8. 하지 않는 것

- ❌ as-of 를 `ingested_at` · `observed_at` 으로 거르기
- ❌ 이름 문자열로 인물 · 기업 병합 · 사실 행 수정(새 행으로)
- ❌ 닫힌 목록 밖 kind · predicate 를 코드에서 만들기
- ❌ 에이전트가 숫자를 만들거나 개인 금액을 보기
- ❌ 그래프 DB · 벡터 DB 를 측정 없이 추가
