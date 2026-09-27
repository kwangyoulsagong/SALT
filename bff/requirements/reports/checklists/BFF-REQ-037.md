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

미검증: 실 토큰으로 서버 → BFF 한 바퀴(머지 뒤 재기동 · 로그인 QA).
