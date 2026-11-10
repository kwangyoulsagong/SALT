---
id: SRV-REQ-037
feature: F008
area: server
kind: API
title: "F008 슬라이스 17a — 가격 변동 범위 API · 소유자 판정 · 원화 환산 · 전망 3종 게이트 (+ 17a-2 해설 검증기 · 템플릿)"
priority: high
created: 2026-09-24
source: pm/requirements/specs/in-progress/FEATURE-008-forecast-intelligence.md
---

> **2026-10-29 전수 조사 — 아래 본문 중 지금과 다른 것** (본문은 당시 기록으로 둔다)
> - FR-9 history 일봉은 업비트 1d **+ 국내 KIS**(`v_daily_close`, `SRV-REQ-040` FR-39)


## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | `GET /api/coach/forecast?symbol=BTC` — 기간 4개, 막힌 기간은 사유만 | 완료(17a-1) |
| FR-2 | 소유자(`FORECAST_OWNER_EMAILS`) 아니면 **404** — 존재를 알리지 않는다(ADR-003) | 완료 |
| FR-3 | 로그수익률 분위수 → 가격(기준가 × e^q), 보유 수량 → "이 주에 판다면" 평가금액 변화 범위(원 정수) | 완료 |
| FR-4 | 전망 3종 — 채점 이력 · 기준 대비(폭 · 기준 폭 · pinball) · 빗나간 사례. 하나라도 없으면 범위 없음 | 완료 |
| FR-5 | 방향은 기준을 이긴 기간(`renderable`)에만, 기저율과 한 묶음 | 완료 |
| FR-6 | `forecast.v_forecast_card` **뷰만** `$queryRaw` 로 읽는다 | 완료 |
| FR-7 | 해설 검증기(숫자 대조 · 금지어 · 명령형) · 템플릿 해설 · 기존 규칙 문장 명령형 수정 | 완료(17a-2) |
| FR-7a | **숫자 대조를 값 · 단위 · 방향으로**(개정 2026-09-24, F009 슬라이스 0 C03). 원 · 억 · 만은 원으로 환산해 맞춘다. 1~12 는 세는 말(가지 · 개 · 차 …)이 붙을 때만 허용. 방향이 둘 다 있고 다르면 다른 사실. "~해서 · 때문에 · 영향으로" 인과 문장은 사실과 맞은 숫자가 없으면 버린다(`unsupported_causal` → 템플릿). **지표 이름(metricId)은 C01 뒤** — 근거가 자유 문자열이라 구조로 알 수 없다 | 완료(2026-09-24, 지표 이름 제외) |
| FR-10 | `GET /api/coach/events?symbol=` — 주요 사건 · 과거 반응(소유자 404). 3종(표본 · 분포와 평소 분포 · 빗나간 때) 중 하나라도 없으면 분포 없이 사유만. 호재 · 악재 필드 없음 | 완료(2026-09-24) |
| FR-11 | `GET /api/coach/positioning?symbol=` — 쏠림 신호(펀딩비 1년 백분위 · 상태 코드 · 미결제약정 7일 · 김프 · 확정 부호 · 환율)와 신호 뒤 반응(종류 4 × 기간 3, `current` = 지금 쏠림 · 20일 안 교차). 소유자 404. 반응은 FR-10 과 같은 게이트(`toEventHorizon`). 배치 3일 초과면 `stale_inputs` · 미결제약정 1일 초과면 빼고 · 모르는 상태 코드면 칸을 뺀다. 과열 · 매매 판정 필드 없음 | 완료(2026-09-27) |
| FR-9 | 응답에 `history` — 전망이 쓴 것과 **같은** 일봉(업비트 1d) 최근 56개, `forecast.v_daily_close` 뷰로 읽는다 | 완료 |
| FR-12 | **인용 출처에 원문 주소 · 게시 시각**(FEATURE-008 FR-44, 2026-11-02). `message.card.citations[]` = `{ title, source, url, publishedAt }` — `url` 은 `http(s)` 만(`citableUrl`, 수집 주소는 외부 입력이라 `javascript:` 를 막는다) · 아니면 `null`. 둘 다 **프롬프트 · 사실 지문(`explanationFactsHash`)에 넣지 않는다** — 문장이 쓰는 사실이 아니라 화면 링크다 | 완료(2026-11-02) |
| FR-13 | **검증기 명령형 빈틈** — 매매 동사 뒤 부정 명령(`마세요 · 마십시오 · 말라`)과 `-(으)세요 · -십시오` 어미도 `imperative_trade`. 전엔 "진입하지 마세요" · "분할 기준을 먼저 잡으세요"(`modeDecision` 헤드라인) · "확인하세요 · 기다리세요 · 설정하세요"(`behavior` · `profitPlan` 규칙 4문장)가 통과했다(헤드라인 2 포함 6개) — 전부 사실 서술로 고침(FEATURE-008 FR-43 · 49) | 완료(2026-11-02) · **같은 날 확장** — 완곡 권유(`advice_wording`: "고려해볼 만" · "~것이 좋아(적절해) 보입니다" · "전략이 유효" · "접근이 필요") · **2026-11-02 로컬 Claude 블라인드로 더 확장** — "보는 게 중요해요" · "필요가 있어요/생겨요" · "열어 둘 필요"(`advice_wording`), 문장 안 줄 라벨 · 칸 이름(`prompt_label`), 판단 문단 문장 단위, 금액 사실 방향 없음(`SRV-REQ-050` FR-11 · 14)와 가격 수준 목표("N달러까지 상승" → `target_price`). 블라인드 평가 · 실호출 문장이 근거. 1차 평가지 Gemini 문장에서 15문장 더 걸러짐 |
| FR-14 | **한국어 조사**(FEATURE-008 FR-48) — `shared/lib/josa.ts` `withJosa`: `es-hangul` `josa` + 영문은 알파벳 읽기(L · M · N · R 만 받침) · 숫자는 끝자리 · `%` 는 퍼센트. 결정적. 템플릿 중 변수 뒤 조사 자리(`explain.ts` 행동 안내 2곳 — "SOL는" → "SOL은")에 적용. 변형 문장은 아직 없다 — 생기면 같은 이유로 해시로 고른다 | 완료(2026-11-02) |
| FR-15 | **해설 품질 측정**(FEATURE-008 FR-49) — 픽스처 50건 자동 지표(`explanationQuality.test.ts`: 검증기 탈락 0 · 금지어 0 · 인용 100% · 평균 ≤ 60자 · 최대 ≤ 160자 · 빈 칸 0) + 블라인드 A/B 평가지(`npm run explain:ab` — 템플릿 vs 검증 통과 LLM 20건, 키 분리, `--score` 집계). **사람 평가는 사용자**가 한다 | 완료(2026-11-02) — 픽스처 50 · 평가지 2회 · **평가는 독립 모델 평가자 3(opus · sonnet · haiku, 키 미열람) 다수결**(사용자 "사람이 직접 하지 말고"): 1차 템플릿 20/20(평가자별 20 · 20 · 19) · 2차(입력 사실 칸 보완 + 새 검증기 재적용) 20/20(20 · 20 · 16). `ratings.json` 두 개 |
| FR-16 | **LLM 다듬기 전체 스위치** `COACH_EXPLAIN_LLM=on|off`(기본 on — 지금 동작). `off` 면 원장도 읽지 않고 LLM 을 부르지 않는다 — 스트림은 다듬기 · 검사 `skipped` · `source: template`. 공급자 라우팅은 `SRV-REQ-050` | 완료(2026-11-02) |
| FR-17 | **템플릿 문장 다듬기**(블라인드 평가 · 실화면) — 첫 문장은 판단 문장 그대로(전엔 `"…입니다. …"입니다.` 처럼 따옴표 안 두 문장 + "입니다") · 규칙이 준 주의가 없으면 "이 판단에 규칙이 적은 주의 사항은 없습니다."(전엔 입력에 없는 일반론 "가격 변동이 커질 수 있는 구간입니다." — 평가자 셋이 근거 없는 문장으로 짚음) | 완료(2026-11-02) |
| FR-8 | SSE 스트림 해설 `POST /api/ai-coach/explain/stream` — 템플릿 먼저 흘리고(delta), 같은 시각 출발한 LLM 이 검증을 통과하면 `replace`. 단계 이벤트는 실제 작업 경계에서만. LLM 원문은 흐르지 않는다. 15초 ping · 끊기면 LLM 까지 중단 · 한도는 단건과 공유 | 완료(2026-09-24) |

## Changelog

- 2026-10-23: F011 5e — 국내 상태 사유 4개를 `KNOWN_RANGE_REASONS` 에(`FC-REQ-020` FR-9). 없으면 "표본이 쌓이는 중"으로 접힌다

| 날짜 | 변경 |
|---|---|
| 2026-09-24 | **F009 슬라이스 0 — C03.** FR-7a 신설 · 구현. 근거 `reports/checklists/SRV-REQ-037.md` C03 절 |
| 2026-09-27 | **F008 슬라이스 23 — FR-11 쏠림 신호.** `FC-REQ-007` · `DB-REQ-029` FR-16 · 17. 새 경로 `/api/coach/positioning`(BFF `BFF-REQ-037` FR-9 짝). 근거 `reports/checklists/SRV-REQ-037.md` §슬라이스 23 |
| 2026-10-23 | **F011 슬라이스 5d — 국내 범위 사유 2개.** `ForecastBlockedReason` · `KNOWN_RANGE_REASONS` 에 `not_sharper_than_baseline` · `skill_not_significant`(국내 거부권 · 풀링 패배, `FC-REQ-020` FR-1 · FR-2 · ADR-003 §8). 없으면 "표본이 쌓이는 중"(`insufficient_sample`)으로 접혀 거짓 사유가 됐다. 응답 모양 무변경(사유 문자열 값만 늘어남). 근거 `reports/checklists/SRV-REQ-037.md` §5d |
| 2026-10-29 | 전수 조사 — 현재와 다른 서술 정정(머리 블록). 본문은 당시 기록으로 둠 |
| 2026-11-02 | **F008 해설 근거 슬라이스.** FR-12 인용 주소 · 시각 · FR-13 검증기 부정 명령 · `-세요` · FR-14 조사(`es-hangul` 2.4.0 + 영문 · 숫자 래퍼) · FR-15 품질 측정(픽스처 50 · A/B 평가지). 루트 `requirements/specs/done/F008-explain-citations-slice.md` |
| 2026-11-02 | 후속(사용자 "베스트로 니가 해 사람이 직접 하지말고") — FR-15 평가 완료(독립 평가자 3 · 2회 · 템플릿 20/20) · FR-13 확장(완곡 권유 · 가격 수준 목표) · FR-16 전체 스위치 · FR-17 템플릿 문장. 평가지 스크립트 입력 사실 보완 · `--reuse` · 간격 8초. 다듬기 공급자 라우팅은 `SRV-REQ-050`(to-do) |
| 2026-11-02 | 해설 스트림 의미 변경 — 토큰 스트림 공급자(로컬 Claude)는 검사를 통과한 문장을 즉시 `delta`(템플릿 선흘림 없음), 그 밖은 예전 길. FR-13 완곡 권유 확장("보는 게 중요해요" · "필요가 있어요/생겨요" · "열어 둘 필요") · 판단 문단 문장 단위 · 금액 사실 방향 없음. 평가지 `--provider` · 관찰 기간 줄 · 이름 버그. 근거 `SRV-REQ-050` FR-11 · 13 · 14. 루트 `requirements/specs/done/F008-explain-llm-routing-slice.md` |
| 2026-11-02 | 검증기 후속 — `prompt_label`(블라인드 3회차 "뉴스1과…" 누출) · FR-13 행 그 자리에 확장 기록. 루트 `requirements/specs/done/F008-explain-llm-routing-slice.md` |
| 2026-11-02 | F008 슬라이스 24 국내 증시 일정(`feat/f008-slice24-kr-market-events`): `macroEvents.ts` 종류 표 `EVENT_KIND_META`(지역 · 범위) · 자산군별 지역 · 계약 위반 행 버림 · 종목 사건 → 시장 일정 순(`SRV-REQ-041` FR-1~3) |
- 2026-11-10: F018 로그인 없이 시세 보기(`ADR-011` · 루트 `requirements/specs/done/F018-public-market-guest-slice.md`)가 이 REQ 의 파일을 걸침 — 이 REQ 의 FR 은 그대로, 바뀐 몫:
  - `salt-server/src/coach/application/ExplainCoachDecision.ts` — 국내 소유자 판정 걷기(`ADR-011`) — 시세 · 관심 · 거래 · 국내 판단 · 미러 · 복기 · 해설은 로그인 전체(시세는 게스트 포함), 전망 셋만 소유자
  - `salt-server/src/coach/presentation/coachTools.controller.ts` — Swagger · 컨트롤러 — 국내 "소유자 전용 404" 문구 · 인자 정리
