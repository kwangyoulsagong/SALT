# F004 슬라이스 11 — 서버 판단 성적표 · 표본 시드 — 체크리스트

슬라이스: `requirements/specs/in-progress/F004-server-scoreboard-slice.md` · 2026-09-23
브랜치: `feat/server-f004-coach-report` (base `main` `7efe2a0`)
영역 체크리스트: `salt-server/requirements/reports/checklists/SRV-REQ-025.md` §7 · `SRV-REQ-024.md`

## 요약

| 확인 | 결과 |
|---|---|
| `GET /api/coach/scoreboard` | 200 · **23ms** · 그룹 8 · `status: ok` · 무토큰 401 |
| `?groupBy=signalType` | 200 · 10ms · 같은 표(키 4개: `status` · `groups` · `disclaimer` · `generatedAt`) |
| 무인자 하위 호환 | 200 · 옛 키 그대로(`sampleCount` · `winRate` · `avgReturn` · `maxDrawdown` · `samples`) |
| `groupBy=symbol` | **400** (Zod `literal`) |
| 분포 무손실 | 그룹 8개 전부 **구간 합 = 표본 수**(30 · 30 · 30 · 30 · 30 · 30 · 30 · 32) — 누락·중복 0 |
| 경계 parity | SQL vs `returnBucketCode` **11개 값 전부 일치**(−0.5 · ±0.2 · ±0.1999 · 0 · 5 …) |
| 기간 | 단타 그룹 `horizonDays: 1` · 장기 `30` |
| 적중/실패 동등 | 두 배열의 키 집합이 같고 상한 3건 · `event` 는 그룹 키 |
| 실행계획 | 두 쿼리 다 Seq Scan(248행) · **1.45ms · 0.39ms**, 쿼리 2회 |
| 시드 멱등 | 1회차 240건 삽입 → 2회차 **0건 삽입 · 240 skip**(자정 앵커 + 유니크) |
| 시드 결과 | 그룹 8개 전부 `gateOpen: true`(표본 30↑) |
| 게이트 | `npm run build` · `npm test` **274 pass** · `eslint .` · `layer-check` 8파일 exit 0 |

## 슬라이스 10 미검증 2건이 닫혔다

시드로 표본이 생겨 `POST /api/ai-coach/explain` 의 **렌더 경로를 처음 실측**했다.

| 항목 | 결과 |
|---|---|
| LLM 렌더 경로 | `renderable: true` · **2.73s** · `keyDrivers` · `risks` · `modeReasoning` · `validity` |
| 3종 세트 | `trackRecord`(표본 32 · 승률 0.4375 · `lowSample: false`) · `failureCases` 3건 |
| `newsSummary` 상한 | 뉴스 **1건 → 1줄**(옛 "5줄 고정" 이 아니다 — 슬라이스 10 수정이 실제로 동작) |
| 예측성 필드 | `expected*` · `target*` **0건** |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| explain abort 실측 | 끊김 후 Gemini 호출 중단은 서버 로그로만 보이고, 로컬 서버 stdout 을 잡지 않았다 | 관측성 계측 |
| 표본 수만 건일 때의 집계 계획 | 248행에서는 Seq Scan 이 맞다. 인덱스가 필요한 규모를 아직 안 지났다 | 표본 누적 후 재측정 |
| BFF · FE 전달 | 이 슬라이스 밖 | `BFF-REQ-023~025` · `FE-REQ-026` M절 |
| `/api/coach/detail` · `generation-status` | 슬라이스 문서 "범위 밖" 표 | 다음 서버 슬라이스 |
