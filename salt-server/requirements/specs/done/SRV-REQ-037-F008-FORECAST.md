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
| FR-13 | **검증기 명령형 빈틈** — 매매 동사 뒤 부정 명령(`마세요 · 마십시오 · 말라`)과 `-(으)세요 · -십시오` 어미도 `imperative_trade`. 전엔 "진입하지 마세요" · "분할 기준을 먼저 잡으세요"(`modeDecision` 헤드라인) · "확인하세요 · 기다리세요 · 설정하세요"(`behavior` · `profitPlan` 규칙 4문장)가 통과했다(헤드라인 2 포함 6개) — 전부 사실 서술로 고침(FEATURE-008 FR-43 · 49) | 완료(2026-11-02) |
| FR-14 | **한국어 조사**(FEATURE-008 FR-48) — `shared/lib/josa.ts` `withJosa`: `es-hangul` `josa` + 영문은 알파벳 읽기(L · M · N · R 만 받침) · 숫자는 끝자리 · `%` 는 퍼센트. 결정적. 템플릿 중 변수 뒤 조사 자리(`explain.ts` 행동 안내 2곳 — "SOL는" → "SOL은")에 적용. 변형 문장은 아직 없다 — 생기면 같은 이유로 해시로 고른다 | 완료(2026-11-02) |
| FR-15 | **해설 품질 측정**(FEATURE-008 FR-49) — 픽스처 50건 자동 지표(`explanationQuality.test.ts`: 검증기 탈락 0 · 금지어 0 · 인용 100% · 평균 ≤ 60자 · 최대 ≤ 160자 · 빈 칸 0) + 블라인드 A/B 평가지(`npm run explain:ab` — 템플릿 vs 검증 통과 LLM 20건, 키 분리, `--score` 집계). **사람 평가는 사용자**가 한다 | 부분 — 자동 지표 · 평가지 완료, 평가 미실시 |
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
