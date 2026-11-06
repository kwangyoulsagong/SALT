# SRV-REQ-044 회고 (2026-11-03, S0)

- FR-1 의 "Modulith 발행 기록 사용"은 DB-REQ-036 FR-1(서비스별 계정)과 **같은 날 쓴 두 REQ 가 서로 막는 조합**이었다. 착수 전 네 질문(`msa-services.md` §1) ③을 답하다 발견 — 정정하고 아웃박스를 서비스 스키마마다 뒀다.
- 추적 ID 연결은 릴레이가 스케줄 스레드라 그냥은 끊긴다. 아웃박스 행에 traceparent 를 저장하고 릴레이가 그 부모 아래 발행하는 것으로 이었다 — 테스트 · Compose · BFF 세 경로에서 같은 ID.
- 멱등은 오류 코드를 잡지 않고 `ON CONFLICT DO NOTHING` 영향 행 수로(메모 규칙 그대로).
- 사용자 질문 "왜 Kafka 아님?"에 FR-9 조건으로 답했고 유지로 정해졌다. 바꿀 때 바뀌는 곳(릴레이 · 구독 어댑터)을 둘로 묶어 둔 것이 답의 근거가 됐다.

## Action

- 첫 실제 이벤트(S1 `savings.GoalCreated` 등)에서 데드레터 → 운영 점검(FR-8 남은 줄)
- BFF · Python 이 계약 파일을 읽는 첫 구독자가 될 때 같은 파일에서 검증(FR-3 남은 줄)

## 2026-11-03 — MONEY-S1a 저축 서비스 첫 판 · 저축 zone 첫 화면

- 걸린 몫은 위 체크리스트 한 줄. 근거 · 판단은 루트 회고 `requirements/reports/retrospects/MONEY-S1a-savings-calculator.md`. Action 없음

## 2026-11-04 — 가계부 S1a(`MONEY-S1-household-entry`)

- 이벤트 본문에서 가맹점 · 메모를 뺐다 — 구독자가 쓰지 않는 개인 정보를 브로커에 싣지 않는다.

## 2026-11-04 — 가계부 S1b 이벤트

- 필수 필드를 더한 계약 변경(`LandingIssued.scheduled`)은 구독자가 아직 없어 한 번에 했다 — 구독자가 생긴 뒤에는 선택 필드부터.

## 2026-11-04 — 가계부 S1e

- 이벤트 한 번을 업무 표의 유일 키(`ON CONFLICT DO NOTHING` 이 넣었을 때만 발행)로 지켰다 — 착지 발행(하루 한 번)과 같은 꼴. **Action**: 없음.

## 2026-11-05 — 가계부 S1f 이벤트

- 계약을 넓힐 때(enum → enum + 꼴) 구독자 목록부터 봤다(0). 구독자가 생긴 뒤 같은 변경이면 새 버전 계약이 필요하다.
- Action 없음.

## 2026-11-05 — 금융 팁 S2a(`MONEY-S2a-tips-content`)

- 몫: 새 계약 `content.PolicyParamChanged`(원문 동기화 때 줄마다) · **첫 서비스 간 구독** — content 가 `savings.GoalCreated` · `GoalReached` 를 받는다(큐 `content.<event>` · 데드레터 · `processed_event` 멱등). 종단 테스트가 저축 쓰기 → 릴레이 → 구독 → 신호를 실 RabbitMQ 로 확인
- **Action**: 없음 — 기존 결정 위에 한 줄

## 2026-11-05 — 금융 팁 S2b(`MONEY-S2b-tips-quiz-diff`)

- 몫: 플랫폼 공개 경로 표에 `/api/content/tips/*/quiz` — 이벤트 · 아웃박스 무변경
- **Action**: 없음 — 기존 결정 위에 한 줄

## 2026-11-05 — 금융 팁 S2d(`MONEY-S2d-tips-my-numbers`)

- 몫: 서비스 간 구독 둘째(가계부 → content). 틀 그대로 — 큐 선언 · 리스너 · 유스케이스 한 번.
- **Action**: 없음

## 2026-11-06 — 서버 S2c notification(`MONEY-S2c-notification`) · `9cee4715` · `33e949e8` · `2fa68f61` · `f1a3c64c`

- 발행이 Kotlin 밖에서 시작되는 첫 경우 — 검증 자리를 계약 파일 테스트로 옮겼다. 루트 회고 `MONEY-S2c-notification`

## 2026-11-06 — 서버 S3a identity 셸 설정(`MONEY-S3a-identity-shell`)

- 없음
