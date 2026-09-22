# FE-REQ-028 (F004 API) — 검증 체크리스트

- REQ: `salt-microFe/requirements/specs/in-progress/FE-REQ-028-F004-API.md`
- 브랜치: `feat/f004-fe-coach-panel` · 검증일: 2026-09-22
- 상태: **부분 완료** — 패널 조회(FR-80~89 중 패널 부분)만
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F004-fe-coach-panel.md`

| FR | 판정 | 위치 · 근거 |
|---|---|---|
| FR-3 조회 함수 `entities/coach/api` | pass | `coachApi.symbolDetail` — `apiFetch`(axios 아님) |
| FR-70 · FR-89 뷰모델 타입 `packages/core` · 재정의 0 | pass | `@repo/core/coach`. 앱은 `entities/coach/model/types.ts` 로 re-export 만 |
| FR-72 · FR-89 막힌 분기에서 `judgment` 접근 컴파일 실패 | pass | 판별 union (BFF 원본과 같은 모양) |
| FR-73 열거값 enum | **미충족** | BFF 원본이 리터럴 union — 사본이라 따랐다. 회고 참고 |
| FR-74 `any` 0 | pass | |
| FR-80 패널 조회는 클라이언트 | pass · **다르게 구현** | React Query. 인증은 `localStorage` 토큰(쿠키는 `FE-REQ-013`) |
| FR-81 키 `['coach','symbol',symbol]` · 모드 없음 · `staleTime 30s` | pass | `coachQueryKeys.symbol` |
| FR-82 이전 요청 취소 · hover 150ms | pass · **다르게 구현** | `signal` 전달, 실측 11회 중 6~8 취소. 디바운스는 기존 80ms |
| FR-83 모드 전환 요청 0 | pass | 실측 0건 (`history.replaceState`, REQ 개정) |
| FR-85 URL 에 없으면 `mode` 안 보냄 | pass | **언제나 안 보낸다** — 응답에 두 모드가 다 있다 |
| FR-64 · FR-65 서버 에러 원문 비노출 | pass | 상태 코드만 `CoachApiError` 로, 화면은 고정 문구 |
| 재시도 | — | 5xx · 네트워크 1회, 4xx 0회 |
| FR-1 · FR-2 · FR-10~62 · FR-84 · FR-86~88 | 미착수 | 리포트 · 해설 · 재생성 · 피드백 · preflight · 상세 |
