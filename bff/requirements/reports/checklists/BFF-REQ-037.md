# BFF-REQ-037 가격 변동 범위 중계 — 체크리스트 (2026-09-24)

| 확인 | 결과 |
|---|---|
| 테스트 | `npm test` **108 pass**(+8 — 뷰모델 5 · 서비스 3) |
| 빌드 | `npm run build` exit 0 · `tsc --noEmit` |
| HTTP | 토큰 없음 · 가짜 토큰 → 401 (로컬 dev) |

| 미검증 · 범위 밖 | 사유 | 언제 닫히나 |
|---|---|---|
| 소유자 토큰 200 · 비소유자 404 HTTP 실측 | 로그인 계정이 아직 없다(사용자 가입 대기) | 사용자 가입 후 |
| SSE 해설 | 슬라이스 19 이후 | — |
| ESLint | BFF 에 설정이 없다(기존) | 범위 밖 |

## 슬라이스 23 — FR-9 쏠림 신호 (2026-09-27)

| 확인 | 결과 |
|---|---|
| 구현 | `services/positioning.viewmodel.ts` · `AppForecastService.getPositioning` · `appCoachController.positioning` · 라우트 `/api/app/coach/positioning` |
| 테스트 | `npm test` 174 / 0(+7, `app-positioning.test.ts`: 옮기기 · 모르는 상태 · 범위 밖 백분위 · 빗나간 때 없음 · 면책 없음 · 404 그대로 · 5xx unavailable) · `npm run build` |
| 계약 | 서버 FR-11 응답 모양 그대로 + 막기만. `renderable: true` 를 만드는 경로 없음 |

미검증: 실 토큰으로 서버 → BFF 한 바퀴(머지 뒤 재기동 · `QA-001` 로그인 QA).

## F011 5e (2026-10-23)

- 변경 없음 — 사유 문자열 통과(`forecast.viewmodel.ts:132`). 실 BFF 4101 → 브랜치 서버 4100 경유 000650 `investment_warning` ×4 · `npm run build` · `npm test` 251/251

## F009 슬라이스 9 (2026-10-29)

- **변경 없음.** 프론트 `entities/coach/api/endpoints.ts` 의 다른 줄(리스크 예산 경로 주석 "게이지 3" → "게이지 · 측정")만 바뀌었다 — 이 REQ 를 가리키는 경로 상수 · 주석 무변경(F009 슬라이스 9)

## 2026-11-02 — 변경 없음 (F008 해설 근거)

- 중계(`app-ai-coach.service.ts` 스트림)는 이벤트 이름 허용 목록만 본다 — 새 칸이 그대로 지난다. `npm run build` · `npm test` 298 / 0

~~미검증: 실 스트림 중계~~ **닫음 2026-11-02** — launchd BFF 경유 LINK 단타 스트림, 인용 `url` · `publishedAt` 그대로.

## F008 해설 공급자 라우팅 · 스트리밍 (2026-11-02) — 검증

중계 테스트 · core 51/0

루트 `requirements/specs/done/F008-explain-llm-routing-slice.md` · 영역 `SRV-REQ-050` · `BFF-REQ-050` · `FE-REQ-059`

## F008 슬라이스 24 국내 증시 일정 (2026-11-02)

- 변경: 주요 사건 뷰모델에 국내 종류 4 · `scope` · `region`(옛 응답은 `market` · `us`)(`BFF-REQ-043` FR-1 · 2)
- 검증: `app-events.test.ts` 국내 3건 추가 통과
- 미검증 · 범위 밖: 없음(슬라이스 2단계는 `FC-REQ-021` · `FE-REQ-046` 표)

## F017 v2 단계 5 시나리오(`feat/f017-s5-short-direction`) (2026-11-11)

| 항목 | 결과 | 근거 |
|---|---|---|
| 전망 경로 회귀 | 충족 | `app-forecast.test.ts` 그대로 통과 · 새 `scenario.test.ts` 7 |
| 남은 소비처 | 기록 | `/api/app/coach/forecast` 를 부르는 화면은 0(시나리오 카드로 교체). 경로 삭제는 서버 `getForecast` 도구 소비 확인 뒤 — 범위 밖 |
